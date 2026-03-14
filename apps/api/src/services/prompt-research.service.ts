import { prisma } from '../lib/prisma.js';
import { getProvider, type AiEngine } from '../lib/ai-providers.js';

export type ResearchPromptType =
  | 'CATEGORY_RELATED'
  | 'COMPARISON'
  | 'HOW_TO'
  | 'PROBLEM_SOLVING'
  | 'INFORMATIONAL'
  | 'TRANSACTIONAL';

export interface ListResearchPromptsParams {
  workspaceId: string;
  search?: string;
  topicId?: string;
  promptType?: ResearchPromptType;
  region?: string;
  page?: number;
  limit?: number;
}

// ── Prompts ──────────────────────────────────────────────────────────────────

export async function listResearchPrompts({
  workspaceId,
  search,
  topicId,
  promptType,
  region,
  page = 1,
  limit = 25,
}: ListResearchPromptsParams) {
  const where: Record<string, unknown> = { workspaceId };
  if (search) where.promptText = { contains: search, mode: 'insensitive' };
  if (topicId) where.topicId = topicId;
  if (promptType) where.promptType = promptType;
  if (region && region !== 'Global') where.region = region;

  const [rows, total] = await Promise.all([
    prisma.researchPrompt.findMany({
      where,
      include: {
        topic: { select: { id: true, name: true, color: true } },
        tags: { select: { tag: true } },
        metrics: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.researchPrompt.count({ where }),
  ]);

  return {
    data: rows.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      promptText: p.promptText,
      topicId: p.topicId,
      topic: p.topic,
      promptType: p.promptType,
      region: p.region,
      createdAt: p.createdAt,
      tags: p.tags.map((t) => t.tag),
      promptVolume: p.metrics[0]?.promptVolume ?? 0,
      mentionRate: p.metrics[0]?.mentionRate ?? 0,
      citationRate: p.metrics[0]?.citationRate ?? 0,
      metricsComputed: p.metricsComputed,
      metricsComputedAt: p.metricsComputedAt ?? null,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getResearchPrompt(id: string) {
  return prisma.researchPrompt.findUniqueOrThrow({
    where: { id },
    include: {
      topic: { select: { id: true, name: true, color: true } },
      tags: { select: { tag: true } },
      metrics: { orderBy: { date: 'desc' }, take: 1 },
    },
  });
}

export async function createResearchPrompt(
  workspaceId: string,
  userId: string,
  input: {
    promptText: string;
    topicId?: string;
    promptType: ResearchPromptType;
    region?: string;
    tags?: string[];
  },
) {
  return prisma.researchPrompt.create({
    data: {
      workspaceId,
      promptText: input.promptText,
      topicId: input.topicId ?? null,
      promptType: input.promptType,
      region: input.region ?? 'Global',
      createdBy: userId,
      tags:
        input.tags && input.tags.length > 0
          ? { createMany: { data: input.tags.map((tag) => ({ tag })) } }
          : undefined,
    },
    include: {
      topic: { select: { id: true, name: true, color: true } },
      tags: { select: { tag: true } },
    },
  });
}

export async function updateResearchPrompt(
  id: string,
  workspaceId: string,
  input: {
    promptText?: string;
    topicId?: string | null;
    promptType?: ResearchPromptType;
    region?: string;
    tags?: string[];
  },
) {
  const existing = await prisma.researchPrompt.findUniqueOrThrow({ where: { id } });
  if (existing.workspaceId !== workspaceId) {
    const err = new Error('Not authorized');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  if (input.tags !== undefined) {
    await prisma.researchPromptTag.deleteMany({ where: { promptId: id } });
    if (input.tags.length > 0) {
      await prisma.researchPromptTag.createMany({
        data: input.tags.map((tag) => ({ promptId: id, tag })),
      });
    }
  }

  const { tags: _tags, ...rest } = input;
  return prisma.researchPrompt.update({
    where: { id },
    data: rest,
    include: {
      topic: { select: { id: true, name: true, color: true } },
      tags: { select: { tag: true } },
    },
  });
}

export async function deleteResearchPrompt(id: string, workspaceId: string) {
  const existing = await prisma.researchPrompt.findUniqueOrThrow({ where: { id } });
  if (existing.workspaceId !== workspaceId) {
    const err = new Error('Not authorized');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  await prisma.researchPrompt.delete({ where: { id } });
  return { ok: true };
}

export async function getResearchPromptMetrics(promptId: string) {
  const latest = await prisma.researchPromptMetric.findFirst({
    where: { promptId },
    orderBy: { date: 'desc' },
  });
  return {
    promptId,
    promptVolume: latest?.promptVolume ?? 0,
    mentionRate: latest?.mentionRate ?? 0,
    citationRate: latest?.citationRate ?? 0,
    aiSampleSize: latest?.aiSampleSize ?? 20,
  };
}

// ── Live AI Run ───────────────────────────────────────────────────────────────

export interface PromptRunEngineResult {
  engine: AiEngine;
  responseText: string;
  citations: string[];
  mentions: Array<{ context: string }>;
  latencyMs: number;
}

export interface PromptRunResult {
  promptId: string;
  promptText: string;
  brandName: string;
  results: PromptRunEngineResult[];
}

const RUN_ENGINES: AiEngine[] = ['CHATGPT', 'PERPLEXITY', 'GEMINI', 'GOOGLE_AIO'];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function runResearchPromptLive(
  promptId: string,
  workspaceId: string,
): Promise<PromptRunResult> {
  const [researchPrompt, brand] = await Promise.all([
    prisma.researchPrompt.findFirst({ where: { id: promptId, workspaceId } }),
    prisma.brand.findUnique({ where: { workspaceId } }),
  ]);
  if (!researchPrompt) {
    const err = new Error('Prompt not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const brandName = brand?.name ?? '';

  const settled = await Promise.allSettled(
    RUN_ENGINES.map((engine) =>
      getProvider(engine)
        .query(researchPrompt.promptText)
        .then((result) => {
          const mentions: Array<{ context: string }> = [];
          if (brandName) {
            const re = new RegExp(escapeRegex(brandName), 'gi');
            let m: RegExpExecArray | null;
            while ((m = re.exec(result.responseText)) !== null) {
              const start = Math.max(0, m.index - 80);
              const end = Math.min(result.responseText.length, m.index + brandName.length + 80);
              mentions.push({ context: result.responseText.slice(start, end) });
            }
          }
          return {
            engine,
            responseText: result.responseText,
            citations: result.citations,
            mentions,
            latencyMs: result.latencyMs,
          };
        }),
    ),
  );

  const results = settled
    .filter(
      (r): r is PromiseFulfilledResult<PromptRunEngineResult> => r.status === 'fulfilled',
    )
    .map((r) => r.value);

  // Persist computed mention rate + citation rate on every run so rates stay current.
  if (results.length > 0) {
    const totalEngines = results.length;
    const mentionRate = results.filter((r) => r.mentions.length > 0).length / totalEngines;
    // citationRate: fraction of engines where at least one cited URL belongs to the brand's domain.
    // Prefer stored brand.domain; fall back to brand name (e.g. "Zety" → "zety" matches "zety.com").
    const storedDomain = (brand?.domain ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    const brandDomain = storedDomain || (brand?.name ?? '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
    const citationRate = brandDomain
      ? results.filter((r) => r.citations.some((url) => url.toLowerCase().includes(brandDomain))).length / totalEngines
      : 0;
    console.debug(`[prompt-research] brandDomain="${brandDomain}" mentionRate=${mentionRate} citationRate=${citationRate} citations=${JSON.stringify(results.map((r) => r.citations))}`);

    const existing = await prisma.researchPromptMetric.findFirst({
      where: { promptId },
      orderBy: { date: 'desc' },
    });

    if (existing) {
      await prisma.researchPromptMetric.update({
        where: { id: existing.id },
        data: { mentionRate, citationRate, aiSampleSize: totalEngines },
      });
    } else {
      await prisma.researchPromptMetric.create({
        data: { promptId, mentionRate, citationRate, aiSampleSize: totalEngines },
      });
    }

    await prisma.researchPrompt.update({
      where: { id: promptId },
      data: { metricsComputed: true, metricsComputedAt: new Date() },
    });
  }

  return { promptId, promptText: researchPrompt.promptText, brandName, results };
}

// ── Topics ───────────────────────────────────────────────────────────────────

export async function listResearchTopics(workspaceId: string) {
  return prisma.researchTopic.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { prompts: true } } },
  });
}

export async function createResearchTopic(
  workspaceId: string,
  input: { name: string; color?: string },
) {
  return prisma.researchTopic.create({
    data: { workspaceId, name: input.name, color: input.color ?? '#6366f1' },
  });
}

export async function updateResearchTopic(
  id: string,
  workspaceId: string,
  input: { name?: string; color?: string },
) {
  const existing = await prisma.researchTopic.findUniqueOrThrow({ where: { id } });
  if (existing.workspaceId !== workspaceId) {
    const err = new Error('Not authorized');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return prisma.researchTopic.update({ where: { id }, data: input });
}

export async function deleteResearchTopic(id: string, workspaceId: string) {
  const existing = await prisma.researchTopic.findUniqueOrThrow({ where: { id } });
  if (existing.workspaceId !== workspaceId) {
    const err = new Error('Not authorized');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  await prisma.researchTopic.delete({ where: { id } });
  return { ok: true };
}
