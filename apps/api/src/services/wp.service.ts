import { prisma } from '../lib/prisma.js';
import { decrypt } from './integrations.service.js';

// ── WP API types ──────────────────────────────────────────────────

interface WpApiPost {
  id: number;
  title: { rendered: string };
  slug: string;
  link: string;
  status: string;
  date: string;
  modified: string;
}

// ── Credential helpers ────────────────────────────────────────────

interface WpCreds {
  siteUrl: string;
  username: string;
  appPassword: string;
}

async function getWpCreds(integrationId: string): Promise<WpCreds> {
  const account = await prisma.integrationAccount.findUniqueOrThrow({
    where: { integrationId },
  });
  const meta = account.metadata as { siteUrl: string; username: string; appPassword: string };
  return {
    siteUrl: meta.siteUrl.replace(/\/$/, ''),
    username: meta.username,
    appPassword: decrypt(meta.appPassword),
  };
}

function wpAuth(username: string, appPassword: string): string {
  return 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64');
}

// ── Test connection ───────────────────────────────────────────────

export async function testWpCreds(siteUrl: string, username: string, appPassword: string) {
  const url = siteUrl.replace(/\/$/, '');
  const res = await fetch(`${url}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: wpAuth(username, appPassword) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WordPress authentication failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id: number; name: string; slug: string };
  return { success: true, user: { id: data.id, name: data.name, slug: data.slug } };
}

export async function testWpConnection(integrationId: string, workspaceId: string) {
  const creds = await getWpCreds(integrationId);
  return testWpCreds(creds.siteUrl, creds.username, creds.appPassword);
}

// ── Sync posts from WordPress ─────────────────────────────────────

export async function syncWpPosts(integrationId: string, workspaceId: string): Promise<number> {
  const creds = await getWpCreds(integrationId);
  const auth = wpAuth(creds.username, creds.appPassword);

  const allPosts: WpApiPost[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${creds.siteUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=any` +
        `&_fields=id,title,slug,link,status,date,modified`,
      { headers: { Authorization: auth } },
    );
    if (!res.ok) break;
    const posts = (await res.json()) as WpApiPost[];
    if (posts.length === 0) break;
    allPosts.push(...posts);
    const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? 1);
    if (page >= totalPages) break;
    page++;
  }

  for (const post of allPosts) {
    await prisma.wpPost.upsert({
      where: { integrationId_wpPostId: { integrationId, wpPostId: post.id } },
      update: {
        title: post.title.rendered,
        slug: post.slug,
        url: post.link,
        status: post.status,
        publishedAt: post.date ? new Date(post.date) : null,
        modifiedAt: post.modified ? new Date(post.modified) : null,
        syncedAt: new Date(),
      },
      create: {
        integrationId,
        workspaceId,
        wpPostId: post.id,
        title: post.title.rendered,
        slug: post.slug,
        url: post.link,
        status: post.status,
        publishedAt: post.date ? new Date(post.date) : null,
        modifiedAt: post.modified ? new Date(post.modified) : null,
      },
    });
  }

  // Update lastSyncAt on the integration
  await prisma.integration.update({
    where: { id: integrationId },
    data: { lastSyncAt: new Date() },
  });

  return allPosts.length;
}

// ── List synced posts ─────────────────────────────────────────────

export async function listWpPosts(
  integrationId: string,
  workspaceId: string,
  opts: { status?: string; page?: number; pageSize?: number },
) {
  const { status, page = 1, pageSize = 50 } = opts;
  const where = {
    integrationId,
    workspaceId,
    ...(status ? { status } : {}),
  };
  const [posts, total] = await Promise.all([
    prisma.wpPost.findMany({
      where,
      orderBy: { modifiedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.wpPost.count({ where }),
  ]);
  return { posts, total, page, pageSize };
}

// ── Publish new post ──────────────────────────────────────────────

export async function publishWpPost(
  integrationId: string,
  workspaceId: string,
  data: { title: string; content: string; status?: string; slug?: string },
) {
  const creds = await getWpCreds(integrationId);
  const res = await fetch(`${creds.siteUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: wpAuth(creds.username, creds.appPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      status: data.status ?? 'publish',
      ...(data.slug ? { slug: data.slug } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WordPress publish failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const post = (await res.json()) as WpApiPost;
  await prisma.wpPost.upsert({
    where: { integrationId_wpPostId: { integrationId, wpPostId: post.id } },
    update: {
      title: post.title.rendered,
      slug: post.slug,
      url: post.link,
      status: post.status,
      publishedAt: post.date ? new Date(post.date) : null,
      modifiedAt: post.modified ? new Date(post.modified) : null,
      syncedAt: new Date(),
    },
    create: {
      integrationId,
      workspaceId,
      wpPostId: post.id,
      title: post.title.rendered,
      slug: post.slug,
      url: post.link,
      status: post.status,
      publishedAt: post.date ? new Date(post.date) : null,
      modifiedAt: post.modified ? new Date(post.modified) : null,
    },
  });
  return { wpPostId: post.id, title: post.title.rendered, url: post.link, status: post.status };
}

// ── Update existing post ──────────────────────────────────────────

export async function updateWpPost(
  integrationId: string,
  workspaceId: string,
  wpPostId: number,
  data: { title?: string; content?: string; status?: string },
) {
  const creds = await getWpCreds(integrationId);
  // WP REST API: update via POST to /posts/:id
  const res = await fetch(`${creds.siteUrl}/wp-json/wp/v2/posts/${wpPostId}`, {
    method: 'POST',
    headers: {
      Authorization: wpAuth(creds.username, creds.appPassword),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WordPress update failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const post = (await res.json()) as WpApiPost;
  await prisma.wpPost.updateMany({
    where: { integrationId, wpPostId },
    data: {
      title: post.title.rendered,
      slug: post.slug,
      url: post.link,
      status: post.status,
      modifiedAt: post.modified ? new Date(post.modified) : null,
      syncedAt: new Date(),
    },
  });
  return { wpPostId: post.id, title: post.title.rendered, url: post.link, status: post.status };
}
