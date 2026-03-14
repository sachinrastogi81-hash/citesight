import { prisma } from '../lib/prisma.js';

type Engine = 'CHATGPT' | 'PERPLEXITY' | 'GEMINI' | 'GOOGLE_AIO';

export async function saveOnboardingConfig(input: {
  workspaceId: string;
  brandName: string;
  brandDomain?: string;
  brandDescription?: string;
  category?: string;
  topics: string[];
  competitors: Array<{ domain: string; name?: string }>;
  engines: Engine[];
}) {
  await prisma.brand.upsert({
    where: { workspaceId: input.workspaceId },
    update: {
      name: input.brandName,
      domain: input.brandDomain,
      description: input.brandDescription,
      category: input.category
    },
    create: {
      workspaceId: input.workspaceId,
      name: input.brandName,
      domain: input.brandDomain,
      description: input.brandDescription,
      category: input.category
    }
  });

  await prisma.topic.deleteMany({ where: { workspaceId: input.workspaceId } });
  if (input.topics.length) {
    await prisma.topic.createMany({
      data: input.topics.map((topicName) => ({ workspaceId: input.workspaceId, topicName }))
    });
  }

  await prisma.competitor.deleteMany({ where: { workspaceId: input.workspaceId } });
  if (input.competitors.length) {
    await prisma.competitor.createMany({
      data: input.competitors.map((c) => ({ workspaceId: input.workspaceId, domain: c.domain, brandName: c.name }))
    });
  }

  await prisma.engineConfig.deleteMany({ where: { workspaceId: input.workspaceId } });
  if (input.engines.length) {
    await prisma.engineConfig.createMany({
      data: input.engines.map((engine) => ({ workspaceId: input.workspaceId, engine, enabled: true }))
    });
  }

  // ── Sync Brand Kit tables so Brand Kit page reflects onboarding data ──
  await prisma.brandProfile.upsert({
    where: { workspaceId: input.workspaceId },
    update: {
      brandName: input.brandName,
      website: input.brandDomain ?? null,
      industry: input.category ?? null,
      description: input.brandDescription ?? null,
    },
    create: {
      workspaceId: input.workspaceId,
      brandName: input.brandName,
      website: input.brandDomain ?? null,
      industry: input.category ?? null,
      description: input.brandDescription ?? null,
    },
  });

  // Replace brand competitors with onboarding competitors (by name/domain)
  await prisma.brandCompetitor.deleteMany({ where: { workspaceId: input.workspaceId } });
  if (input.competitors.length) {
    await prisma.brandCompetitor.createMany({
      data: input.competitors.map((c) => ({
        workspaceId: input.workspaceId,
        competitorName: c.name ?? c.domain,
        website: c.domain ? (c.domain.startsWith('http') ? c.domain : `https://${c.domain}`) : null,
      })),
    });
  }

  const hasBrand = !!input.brandName;
  const hasTopics = input.topics.length > 0;
  const hasEngines = input.engines.length > 0;
  const complete = hasBrand && hasTopics && hasEngines;

  await prisma.workspace.update({
    where: { id: input.workspaceId },
    data: { onboardingComplete: complete }
  });

  return { ok: true, onboardingComplete: complete };
}

export async function getOnboardingConfig(workspaceId: string) {
  const [brand, topics, competitors, engines, workspace] = await Promise.all([
    prisma.brand.findUnique({ where: { workspaceId } }),
    prisma.topic.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
    prisma.competitor.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
    prisma.engineConfig.findMany({ where: { workspaceId, enabled: true } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { onboardingComplete: true } })
  ]);

  return {
    onboardingComplete: workspace.onboardingComplete,
    brand: brand ? { name: brand.name, domain: brand.domain, description: brand.description, category: brand.category } : null,
    topics: topics.map((t) => ({ id: t.id, name: t.topicName })),
    competitors: competitors.map((c) => ({ id: c.id, domain: c.domain, name: c.brandName })),
    engines: engines.map((e) => e.engine)
  };
}
