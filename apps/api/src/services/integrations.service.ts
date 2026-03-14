import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { IntegrationType, IntegrationStatus } from '@prisma/client';
import { buildPages } from './pages.service.js';

// ── Encryption helpers ─────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const key = config.ENCRYPTION_KEY;
  if (!key) return text;
  const keyBuf = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const key = config.ENCRYPTION_KEY;
  if (!key) return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;
  const [ivHex, tagHex, dataHex] = parts;
  const keyBuf = Buffer.from(key, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Static config ─────────────────────────────────────────────────

const ALL_TYPES: IntegrationType[] = [
  IntegrationType.GOOGLE_SEARCH_CONSOLE,
  IntegrationType.GOOGLE_ANALYTICS,
  IntegrationType.WORDPRESS,
  IntegrationType.SLACK,
];

const OAUTH_SCOPES: Partial<Record<IntegrationType, string[]>> = {
  [IntegrationType.GOOGLE_SEARCH_CONSOLE]: ['https://www.googleapis.com/auth/webmasters.readonly'],
  [IntegrationType.GOOGLE_ANALYTICS]: ['https://www.googleapis.com/auth/analytics.readonly'],
};

// ── List integrations ─────────────────────────────────────────────

export async function listIntegrations(workspaceId: string) {
  const rows = await prisma.integration.findMany({
    where: { workspaceId },
    include: { account: true },
  });

  return ALL_TYPES.map((type) => {
    const row = rows.find((r) => r.type === type);
    if (!row) {
      return { type, status: IntegrationStatus.DISCONNECTED, id: null, lastSyncAt: null, accountEmail: null };
    }
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      lastSyncAt: row.lastSyncAt,
      accountEmail: row.account?.accountEmail ?? null,
    };
  });
}

// ── Get single integration ────────────────────────────────────────

export async function getIntegration(integrationId: string, workspaceId: string) {
  const row = await prisma.integration.findFirstOrThrow({
    where: { id: integrationId, workspaceId },
    include: {
      account: true,
      properties: true,
      syncLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    lastSyncAt: row.lastSyncAt,
    accountEmail: row.account?.accountEmail ?? null,
    tokenExpiry: row.account?.tokenExpiry ?? null,
    properties: row.properties,
    syncLogs: row.syncLogs,
  };
}

// ── Connect WordPress ─────────────────────────────────────────────

export async function connectWordPress(
  workspaceId: string,
  siteUrl: string,
  username: string,
  appPassword: string,
) {
  const existing = await prisma.integration.findUnique({
    where: { workspaceId_type: { workspaceId, type: IntegrationType.WORDPRESS } },
  });

  let integration;
  if (existing) {
    integration = await prisma.integration.update({
      where: { id: existing.id },
      data: { status: IntegrationStatus.CONNECTED, updatedAt: new Date() },
    });
    const accountEmail = `${username}@${new URL(siteUrl).hostname}`;
    await prisma.integrationAccount.upsert({
      where: { integrationId: existing.id },
      update: { accountEmail, metadata: { siteUrl, username, appPassword: encrypt(appPassword) } },
      create: {
        integrationId: existing.id,
        accountEmail,
        metadata: { siteUrl, username, appPassword: encrypt(appPassword) },
      },
    });
  } else {
    const accountEmail = `${username}@${new URL(siteUrl).hostname}`;
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        type: IntegrationType.WORDPRESS,
        status: IntegrationStatus.CONNECTED,
        account: {
          create: {
            accountEmail,
            metadata: { siteUrl, username, appPassword: encrypt(appPassword) },
          },
        },
      },
    });
  }

  return { id: integration.id, type: integration.type, status: integration.status };
}

// ── Connect Slack ─────────────────────────────────────────────────

export async function connectSlack(workspaceId: string, webhookUrl: string) {
  const existing = await prisma.integration.findUnique({
    where: { workspaceId_type: { workspaceId, type: IntegrationType.SLACK } },
  });

  let integration;
  if (existing) {
    integration = await prisma.integration.update({
      where: { id: existing.id },
      data: { status: IntegrationStatus.CONNECTED, updatedAt: new Date() },
    });
    await prisma.integrationAccount.upsert({
      where: { integrationId: existing.id },
      update: { metadata: { webhookUrl: encrypt(webhookUrl) } },
      create: {
        integrationId: existing.id,
        metadata: { webhookUrl: encrypt(webhookUrl) },
      },
    });
  } else {
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        type: IntegrationType.SLACK,
        status: IntegrationStatus.CONNECTED,
        account: {
          create: {
            metadata: { webhookUrl: encrypt(webhookUrl) },
          },
        },
      },
    });
  }

  return { id: integration.id, type: integration.type, status: integration.status };
}

// ── OAuth: start ──────────────────────────────────────────────────

export function startOAuth(workspaceId: string, type: IntegrationType): { authUrl: string } {
  const scopes = OAUTH_SCOPES[type];
  if (!scopes) throw new Error(`OAuth not supported for ${type}`);

  const statePayload = JSON.stringify({ workspaceId, type, ts: Date.now() });
  const hmacKey = config.JWT_ACCESS_SECRET;
  const sig = crypto.createHmac('sha256', hmacKey).update(statePayload).digest('hex');
  const state = Buffer.from(JSON.stringify({ payload: statePayload, sig })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: config.GOOGLE_REDIRECT_URI ?? `${config.FRONTEND_URL}/api/integrations/oauth/callback`,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

// ── OAuth: callback ───────────────────────────────────────────────

export async function handleOAuthCallback(
  code: string,
  rawState: string,
): Promise<{ workspaceId: string; type: IntegrationType }> {
  // Verify HMAC-signed state
  let stateData: { payload: string; sig: string };
  try {
    stateData = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid state parameter');
  }

  const expectedSig = crypto
    .createHmac('sha256', config.JWT_ACCESS_SECRET)
    .update(stateData.payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(stateData.sig))) {
    throw new Error('State signature mismatch');
  }

  const { workspaceId, type } = JSON.parse(stateData.payload) as {
    workspaceId: string;
    type: IntegrationType;
    ts: number;
  };

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID ?? '',
      client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri:
        config.GOOGLE_REDIRECT_URI ??
        `${config.FRONTEND_URL}/api/integrations/oauth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  };

  // Fetch account email
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = userInfoRes.ok
    ? ((await userInfoRes.json()) as { email?: string })
    : ({ email: undefined } as { email?: string });

  const tokenExpiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  // Upsert integration + account
  const existing = await prisma.integration.findUnique({
    where: { workspaceId_type: { workspaceId, type } },
  });

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data: { status: IntegrationStatus.CONNECTED, updatedAt: new Date() },
    });
    await prisma.integrationAccount.upsert({
      where: { integrationId: existing.id },
      update: {
        accountEmail: userInfo.email ?? null,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiry,
      },
      create: {
        integrationId: existing.id,
        accountEmail: userInfo.email ?? null,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiry,
      },
    });
  } else {
    await prisma.integration.create({
      data: {
        workspaceId,
        type,
        status: IntegrationStatus.CONNECTED,
        account: {
          create: {
            accountEmail: userInfo.email ?? null,
            accessToken: encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
            tokenExpiry,
          },
        },
      },
    });
  }

  return { workspaceId, type };
}

// ── Sync ──────────────────────────────────────────────────────────

// ── Token refresh helper ──────────────────────────────────────────

async function refreshAccessToken(account: {
  integrationId: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}): Promise<string | null> {
  // If token is still valid (with 60s buffer), skip refresh
  if (account.tokenExpiry && account.tokenExpiry.getTime() > Date.now() + 60_000) {
    const current = await prisma.integrationAccount.findUnique({
      where: { integrationId: account.integrationId },
      select: { accessToken: true },
    });
    return current?.accessToken ? decrypt(current.accessToken) : null;
  }

  if (!account.refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID ?? '',
      client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: decrypt(account.refreshToken),
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const tokenExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;

  await prisma.integrationAccount.update({
    where: { integrationId: account.integrationId },
    data: { accessToken: encrypt(data.access_token), tokenExpiry },
  });

  return data.access_token;
}

// ── GSC sync helpers ────────────────────────────────────────────

type GscApiRow = {
  keys: string[];
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

interface GscSyncResult {
  queries_synced: number;
  pages_synced: number;
  query_dates_synced: number;
  query_devices_synced: number;
  query_countries_synced: number;
  date_range: string;
}

// ProgressEmitter is called by sync functions to stream progress over SSE
export type ProgressEmitter = (event: string, data: Record<string, unknown>) => void;
const noop: ProgressEmitter = () => {};

const GSC_ROW_LIMIT = 25_000;
const GSC_MAX_RETRIES = 5;
const GSC_BATCH_SIZE = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generic fetch wrapper with 401 token-refresh + 429/5xx exponential backoff
async function gscFetch(
  url: string,
  options: RequestInit,
  tokenHolder: { token: string },
  integrationId: string,
  refreshToken: string | null,
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        Authorization: `Bearer ${tokenHolder.token}`,
      },
    });

    if (res.status === 401 && attempt === 0) {
      const newToken = await refreshAccessToken({ integrationId, refreshToken, tokenExpiry: null });
      if (!newToken) throw new Error('GSC authentication failed — please reconnect');
      tokenHolder.token = newToken;
      attempt++;
      continue;
    }

    if ((res.status === 429 || res.status >= 500) && attempt < GSC_MAX_RETRIES) {
      await sleep(Math.min(1_000 * 2 ** attempt, 32_000));
      attempt++;
      continue;
    }

    return res;
  }
}

// Paginate a single dimension-group call until all rows are fetched
async function fetchAllGscRows(
  siteUrl: string,
  dimensions: string[],
  startDate: string,
  endDate: string,
  tokenHolder: { token: string },
  integrationId: string,
  refreshToken: string | null,
): Promise<GscApiRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const allRows: GscApiRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await gscFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: GSC_ROW_LIMIT, startRow }),
      },
      tokenHolder,
      integrationId,
      refreshToken,
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GSC API error ${res.status} [${dimensions.join(',')}]: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as { rows?: GscApiRow[] };
    const rows = data.rows ?? [];
    allRows.push(...rows);
    if (rows.length < GSC_ROW_LIMIT) break;
    startRow += GSC_ROW_LIMIT;
  }

  return allRows;
}

async function batchInsert<T extends object>(
  items: T[],
  inserter: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i += GSC_BATCH_SIZE) {
    await inserter(items.slice(i, i + GSC_BATCH_SIZE));
  }
}

// ── GSC full sync ───────────────────────────────────────────────────

async function syncGSC(integrationId: string, emit: ProgressEmitter): Promise<GscSyncResult> {
  const integration = await prisma.integration.findUniqueOrThrow({
    where: { id: integrationId },
    include: { account: true },
  });
  const { workspaceId } = integration;
  const account = integration.account;
  if (!account) throw new Error('No account linked — please reconnect GSC');

  const token = await refreshAccessToken({
    integrationId,
    refreshToken: account.refreshToken,
    tokenExpiry: account.tokenExpiry,
  });
  if (!token) throw new Error('No valid access token — please reconnect GSC');
  const tokenHolder = { token };

  // ── Step 0: Refresh property list ───────────────────────────────
  emit('step_start', { index: 0, message: 'Refreshing property list…' });

  const prevSelected = await prisma.integrationProperty.findFirst({
    where: { integrationId, selected: true },
    select: { propertyUrl: true },
  });

  const sitesRes = await gscFetch(
    'https://www.googleapis.com/webmasters/v3/sites',
    { method: 'GET' },
    tokenHolder, integrationId, account.refreshToken,
  );
  if (!sitesRes.ok) {
    const body = await sitesRes.text();
    throw new Error(`GSC sites fetch failed (${sitesRes.status}): ${body}`);
  }
  const sitesData = (await sitesRes.json()) as { siteEntry?: Array<{ siteUrl: string }> };
  const sites = sitesData.siteEntry ?? [];

  await prisma.integrationProperty.deleteMany({ where: { integrationId } });
  if (sites.length > 0) {
    await prisma.integrationProperty.createMany({
      data: sites.map((s) => ({
        integrationId,
        propertyName: s.siteUrl.replace(/^sc-domain:/, '').replace(/\/$/, ''),
        propertyUrl: s.siteUrl,
        selected: false,
      })),
    });
  }

  // Re-select previously active property
  let selectedProperty: { id: string; propertyUrl: string } | null = null;
  if (prevSelected) {
    selectedProperty = await prisma.integrationProperty.findFirst({
      where: { integrationId, propertyUrl: prevSelected.propertyUrl },
      select: { id: true, propertyUrl: true },
    }) ?? null;
    if (selectedProperty) {
      await prisma.integrationProperty.update({
        where: { id: selectedProperty.id },
        data: { selected: true },
      });
    }
  }

  emit('step_done', { index: 0, message: 'Property list refreshed', count: sites.length });

  if (!selectedProperty) {
    return {
      queries_synced: 0, pages_synced: 0,
      query_dates_synced: 0, query_devices_synced: 0, query_countries_synced: 0,
      date_range: 'n/a — select a property first',
    };
  }

  const siteUrl = selectedProperty.propertyUrl;

  // Date range: 28 days back
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const startStr = fmt(startDate);
  const endStr = fmt(endDate);

  // ── Step 1: query + page ──────────────────────────────────────
  emit('step_start', { index: 1, message: 'Fetching query + page data…' });
  const queryPageRows = await fetchAllGscRows(
    siteUrl, ['query', 'page'], startStr, endStr, tokenHolder, integrationId, account.refreshToken,
  );
  emit('step_done', { index: 1, message: 'Query + page data fetched', rows: queryPageRows.length });

  // ── Step 2: page-level ────────────────────────────────────────
  emit('step_start', { index: 2, message: 'Fetching page-level data…' });
  const pageRows = await fetchAllGscRows(
    siteUrl, ['page'], startStr, endStr, tokenHolder, integrationId, account.refreshToken,
  );
  emit('step_done', { index: 2, message: 'Page-level data fetched', rows: pageRows.length });

  // ── Step 3: query trends ──────────────────────────────────────
  emit('step_start', { index: 3, message: 'Fetching query trend data…' });
  const queryDateRows = await fetchAllGscRows(
    siteUrl, ['query', 'date'], startStr, endStr, tokenHolder, integrationId, account.refreshToken,
  );
  emit('step_done', { index: 3, message: 'Query trend data fetched', rows: queryDateRows.length });

  // ── Step 4: device ───────────────────────────────────────────
  emit('step_start', { index: 4, message: 'Fetching device breakdown…' });
  const queryDeviceRows = await fetchAllGscRows(
    siteUrl, ['query', 'device'], startStr, endStr, tokenHolder, integrationId, account.refreshToken,
  );
  emit('step_done', { index: 4, message: 'Device breakdown fetched', rows: queryDeviceRows.length });

  // ── Step 5: country ──────────────────────────────────────────
  emit('step_start', { index: 5, message: 'Fetching country breakdown…' });
  const queryCountryRows = await fetchAllGscRows(
    siteUrl, ['query', 'country'], startStr, endStr, tokenHolder, integrationId, account.refreshToken,
  );
  emit('step_done', { index: 5, message: 'Country breakdown fetched', rows: queryCountryRows.length });

  // ── Step 6: Clear stale + batch insert ───────────────────────────
  const totalRows = queryPageRows.length + pageRows.length + queryDateRows.length +
    queryDeviceRows.length + queryCountryRows.length;
  emit('step_start', { index: 6, message: `Saving ${totalRows.toLocaleString()} rows to database…` });

  await Promise.all([
    prisma.gscQuery.deleteMany({ where: { integrationId } }),
    prisma.gscPage.deleteMany({ where: { integrationId } }),
    prisma.gscQueryDate.deleteMany({ where: { integrationId } }),
    prisma.gscQueryDevice.deleteMany({ where: { integrationId } }),
    prisma.gscQueryCountry.deleteMany({ where: { integrationId } }),
  ]);

  await batchInsert(queryPageRows, (chunk) =>
    prisma.gscQuery.createMany({
      data: chunk.map((r) => ({
        integrationId, workspaceId,
        query: r.keys[0], page: r.keys[1],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions),
        ctr: r.ctr, position: r.position,
      })),
      skipDuplicates: true,
    }),
  );

  await batchInsert(pageRows, (chunk) =>
    prisma.gscPage.createMany({
      data: chunk.map((r) => ({
        integrationId, workspaceId,
        page: r.keys[0],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions),
        ctr: r.ctr, position: r.position,
      })),
      skipDuplicates: true,
    }),
  );

  await batchInsert(queryDateRows, (chunk) =>
    prisma.gscQueryDate.createMany({
      data: chunk.map((r) => ({
        integrationId, workspaceId,
        query: r.keys[0], date: new Date(r.keys[1]),
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions),
        ctr: r.ctr, position: r.position,
      })),
      skipDuplicates: true,
    }),
  );

  await batchInsert(queryDeviceRows, (chunk) =>
    prisma.gscQueryDevice.createMany({
      data: chunk.map((r) => ({
        integrationId, workspaceId,
        query: r.keys[0], device: r.keys[1],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions),
        ctr: r.ctr, position: r.position,
      })),
      skipDuplicates: true,
    }),
  );

  await batchInsert(queryCountryRows, (chunk) =>
    prisma.gscQueryCountry.createMany({
      data: chunk.map((r) => ({
        integrationId, workspaceId,
        query: r.keys[0], country: r.keys[1],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions),
        ctr: r.ctr, position: r.position,
      })),
      skipDuplicates: true,
    }),
  );

  emit('step_done', { index: 6, message: 'All data saved', rows: totalRows });

  return {
    queries_synced: queryPageRows.length,
    pages_synced: pageRows.length,
    query_dates_synced: queryDateRows.length,
    query_devices_synced: queryDeviceRows.length,
    query_countries_synced: queryCountryRows.length,
    date_range: `${startStr} to ${endStr}`,
  };
}

// ── Select active property ────────────────────────────────────────

export async function selectProperty(
  integrationId: string,
  propertyId: string,
  workspaceId: string,
) {
  const integration = await prisma.integration.findFirstOrThrow({
    where: { id: integrationId, workspaceId },
  });

  await prisma.integrationProperty.findFirstOrThrow({
    where: { id: propertyId, integrationId: integration.id },
  });

  // Deselect all, then activate the chosen one
  await prisma.integrationProperty.updateMany({
    where: { integrationId: integration.id },
    data: { selected: false },
  });
  await prisma.integrationProperty.update({
    where: { id: propertyId },
    data: { selected: true },
  });

  return { id: propertyId, selected: true };
}

// ── Sync dispatcher ───────────────────────────────────────────────

export async function syncIntegration(
  integrationId: string,
  workspaceId: string,
  emit: ProgressEmitter = noop,
) {
  const integration = await prisma.integration.findFirstOrThrow({
    where: { id: integrationId, workspaceId },
    include: { account: true },
  });

  let gscResult: GscSyncResult | undefined;
  let status = 'success';
  let error: string | undefined;

  try {
    if (integration.type === IntegrationType.GOOGLE_SEARCH_CONSOLE) {
      gscResult = await syncGSC(integration.id, emit);
    }
    // GA4 and others: add handlers here when ready
  } catch (err: unknown) {
    status = 'error';
    error = (err as Error).message;
  }

  const totalRecords = gscResult
    ? gscResult.queries_synced + gscResult.pages_synced +
      gscResult.query_dates_synced + gscResult.query_devices_synced + gscResult.query_countries_synced
    : 0;

  const log = await prisma.syncLog.create({
    data: {
      integrationId: integration.id,
      syncType: 'manual',
      status,
      recordsSynced: totalRecords,
      error: error ?? null,
    },
  });

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      status: status === 'error' ? IntegrationStatus.ERROR : IntegrationStatus.CONNECTED,
    },
  });

  if (status === 'error') throw new Error(error);

  // Build/refresh pages table from synced gsc_pages data (fire-and-forget)
  setImmediate(() => {
    buildPages(workspaceId).catch((err) =>
      console.error('[pages] buildPages failed:', (err as Error).message),
    );
  });

  return {
    status: log.status,
    recordsSynced: log.recordsSynced,
    ...(gscResult && {
      queries_synced: gscResult.queries_synced,
      pages_synced: gscResult.pages_synced,
      query_dates_synced: gscResult.query_dates_synced,
      query_devices_synced: gscResult.query_devices_synced,
      query_countries_synced: gscResult.query_countries_synced,
      date_range: gscResult.date_range,
    }),
  };
}

// ── Disconnect ────────────────────────────────────────────────────

export async function disconnectIntegration(integrationId: string, workspaceId: string) {
  const integration = await prisma.integration.findFirstOrThrow({
    where: { id: integrationId, workspaceId },
  });

  await prisma.integrationAccount.deleteMany({ where: { integrationId: integration.id } });
  await prisma.integrationProperty.deleteMany({ where: { integrationId: integration.id } });

  await prisma.integration.update({
    where: { id: integration.id },
    data: { status: IntegrationStatus.DISCONNECTED, lastSyncAt: null, updatedAt: new Date() },
  });
}
