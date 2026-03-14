import { prisma } from '../lib/prisma.js';

// ── Brand Profile ─────────────────────────────────────────────────

export async function getBrandProfile(workspaceId: string) {
  return prisma.brandProfile.findUnique({ where: { workspaceId } });
}

export async function upsertBrandProfile(
  workspaceId: string,
  data: { brandName: string; website?: string; industry?: string; description?: string },
) {
  return prisma.brandProfile.upsert({
    where: { workspaceId },
    update: { ...data, updatedAt: new Date() },
    create: { workspaceId, ...data },
  });
}

// ── Brand Voice ───────────────────────────────────────────────────

export async function getBrandVoice(workspaceId: string) {
  return prisma.brandVoice.findUnique({ where: { workspaceId } });
}

export async function upsertBrandVoice(
  workspaceId: string,
  data: {
    tone?: string;
    writingStyle?: string;
    readingLevel?: string;
    preferredPhrases?: string[];
    avoidPhrases?: string[];
  },
) {
  return prisma.brandVoice.upsert({
    where: { workspaceId },
    update: { ...data, updatedAt: new Date() },
    create: { workspaceId, ...data },
  });
}

// ── Brand Products ────────────────────────────────────────────────

export async function listBrandProducts(workspaceId: string) {
  return prisma.brandProduct.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createBrandProduct(
  workspaceId: string,
  data: { productName: string; description?: string; productUrl?: string },
) {
  return prisma.brandProduct.create({ data: { workspaceId, ...data } });
}

export async function deleteBrandProduct(id: string, workspaceId: string) {
  await prisma.brandProduct.deleteMany({ where: { id, workspaceId } });
  return { ok: true };
}

// ── Brand Audience ────────────────────────────────────────────────

export async function getBrandAudience(workspaceId: string) {
  return prisma.brandAudience.findUnique({ where: { workspaceId } });
}

export async function upsertBrandAudience(
  workspaceId: string,
  data: { primaryAudience?: string; secondaryAudience?: string; geography?: string },
) {
  return prisma.brandAudience.upsert({
    where: { workspaceId },
    update: { ...data, updatedAt: new Date() },
    create: { workspaceId, ...data },
  });
}

// ── Brand Competitors ─────────────────────────────────────────────

export async function listBrandCompetitors(workspaceId: string) {
  return prisma.brandCompetitor.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createBrandCompetitor(
  workspaceId: string,
  data: { competitorName: string; website?: string },
) {
  return prisma.brandCompetitor.create({ data: { workspaceId, ...data } });
}

export async function deleteBrandCompetitor(id: string, workspaceId: string) {
  await prisma.brandCompetitor.deleteMany({ where: { id, workspaceId } });
  return { ok: true };
}

// ── Brand Context (aggregate) ─────────────────────────────────────

export async function getBrandContext(workspaceId: string) {
  const [profile, voice, products, audience, competitors] = await Promise.all([
    prisma.brandProfile.findUnique({ where: { workspaceId } }),
    prisma.brandVoice.findUnique({ where: { workspaceId } }),
    prisma.brandProduct.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
    prisma.brandAudience.findUnique({ where: { workspaceId } }),
    prisma.brandCompetitor.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
  ]);

  return {
    brand_name: profile?.brandName ?? null,
    website: profile?.website ?? null,
    industry: profile?.industry ?? null,
    description: profile?.description ?? null,
    tone: voice?.tone ?? null,
    writing_style: voice?.writingStyle ?? null,
    reading_level: voice?.readingLevel ?? null,
    preferred_phrases: voice?.preferredPhrases ?? [],
    avoid_phrases: voice?.avoidPhrases ?? [],
    products: products.map((p) => ({
      id: p.id,
      product_name: p.productName,
      description: p.description ?? null,
      url: p.productUrl ?? null,
    })),
    audience: {
      primary: audience?.primaryAudience ?? null,
      secondary: audience?.secondaryAudience ?? null,
      geography: audience?.geography ?? null,
    },
    competitors: competitors.map((c) => ({
      id: c.id,
      name: c.competitorName,
      website: c.website ?? null,
    })),
  };
}
