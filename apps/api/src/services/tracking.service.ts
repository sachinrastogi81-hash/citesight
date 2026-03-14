import { prisma } from '../lib/prisma.js';
import { getProvider, type AiEngine } from '../lib/ai-providers.js';
import { queue } from '../jobs/queue.js';

export async function collectRun(input: { workspaceId: string; queryId: string; engine: AiEngine }) {
  const query = await prisma.aeoQuery.findUniqueOrThrow({ where: { id: input.queryId } });

  const provider = getProvider(input.engine);
  const result = await provider.query(query.query);

  const run = await prisma.queryRun.create({
    data: {
      workspaceId: input.workspaceId,
      queryId: input.queryId,
      engine: input.engine,
      responseText: result.responseText,
      status: 'COMPLETED'
    }
  });

  await prisma.aiResponse.create({
    data: {
      workspaceId: input.workspaceId,
      queryRunId: run.id,
      engine: input.engine,
      responseText: result.responseText
    }
  });

  // Extract citations from the response
  const brand = await prisma.brand.findUnique({ where: { workspaceId: input.workspaceId } });
  const competitors = await prisma.competitor.findMany({ where: { workspaceId: input.workspaceId } });
  const competitorDomains = new Set(competitors.map((c) => c.domain.toLowerCase()));

  const citations = result.citations.map((url) => {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url;
    }
    const isBrand = brand ? hostname.includes(brand.name.toLowerCase().replace(/\s+/g, '')) : false;
    const isCompetitor = competitorDomains.has(hostname);

    return {
      workspaceId: input.workspaceId,
      queryRunId: run.id,
      citedUrl: url,
      citedDomain: hostname,
      citedBrand: isBrand ? brand!.name : isCompetitor ? hostname : null,
      confidence: isBrand || isCompetitor ? 0.9 : 0.7
    };
  });

  if (citations.length > 0) {
    await prisma.citationEntry.createMany({ data: citations });
  }

  const savedCitations = await prisma.citationEntry.findMany({ where: { queryRunId: run.id } });

  return { run, citations: savedCitations };
}

export async function batchCollect(input: { workspaceId: string; queryIds: string[]; engines: AiEngine[] }) {
  const results: Array<{ queryId: string; engine: AiEngine; runId: string }> = [];

  for (const queryId of input.queryIds) {
    for (const engine of input.engines) {
      try {
        const { run } = await collectRun({ workspaceId: input.workspaceId, queryId, engine });
        results.push({ queryId, engine, runId: run.id });
      } catch (err) {
        // Log failure but continue with other queries
        results.push({ queryId, engine, runId: `FAILED: ${err instanceof Error ? err.message : 'unknown'}` });
      }
    }
  }

  return results;
}

export async function scheduleBatchCollect(input: { workspaceId: string; queryIds: string[]; engines: AiEngine[] }) {
  const job = await queue.add('batch-collect', {
    workspaceId: input.workspaceId,
    queryIds: input.queryIds,
    engines: input.engines
  }, {
    jobId: `batch-${input.workspaceId}-${Date.now()}`
  });

  return { jobId: job.id, status: 'queued', queryCount: input.queryIds.length, engineCount: input.engines.length };
}

export async function listRuns(workspaceId: string, opts?: { queryId?: string; engine?: AiEngine; limit?: number }) {
  return prisma.queryRun.findMany({
    where: {
      workspaceId,
      ...(opts?.queryId ? { queryId: opts.queryId } : {}),
      ...(opts?.engine ? { engine: opts.engine } : {})
    },
    include: { query: { select: { id: true, query: true } } },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit || 50
  });
}

export async function getRunDetail(runId: string) {
  const run = await prisma.queryRun.findUniqueOrThrow({
    where: { id: runId },
    include: { query: true }
  });

  const [responses, citations] = await Promise.all([
    prisma.aiResponse.findMany({ where: { queryRunId: runId } }),
    prisma.citationEntry.findMany({ where: { queryRunId: runId } })
  ]);

  return { run, responses, citations };
}

export async function getSchedule(workspaceId: string) {
  return prisma.querySchedule.findUnique({ where: { workspaceId } });
}

export async function upsertSchedule(input: { workspaceId: string; cronExpr?: string; enabled?: boolean }) {
  const nextRunAt = input.enabled !== false ? new Date(Date.now() + 24 * 3600 * 1000) : null;

  return prisma.querySchedule.upsert({
    where: { workspaceId: input.workspaceId },
    update: {
      ...(input.cronExpr !== undefined ? { cronExpr: input.cronExpr } : {}),
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      nextRunAt
    },
    create: {
      workspaceId: input.workspaceId,
      cronExpr: input.cronExpr || '0 6 * * *',
      enabled: input.enabled ?? true,
      nextRunAt
    }
  });
}
