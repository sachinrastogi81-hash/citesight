import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import { saveOnboardingConfig, getOnboardingConfig } from '../services/onboarding.service.js';
import { autofillOnboardingFromDomain } from '../services/onboarding-autofill.service.js';
import {
  listPromptTemplates,
  getPromptTemplate,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  generateQueriesFromTemplates,
  runPromptTemplate,
  generateAndSaveWorkspacePrompts
} from '../services/prompts.service.js';
import {
  collectRun,
  batchCollect,
  scheduleBatchCollect,
  listRuns,
  getRunDetail,
  getSchedule,
  upsertSchedule
} from '../services/tracking.service.js';
import {
  computeVisibility,
  detectOpportunities,
  generateContent,
  createWorkflow,
  runWorkflow,
  listJobs,
  retryJob
} from '../services/modules.service.js';
import { prisma } from '../lib/prisma.js';
import { runPromptDiscovery } from '../services/prompt-discovery.service.js';

const router = Router();
const engineSchema = z.enum(['CHATGPT', 'PERPLEXITY', 'GEMINI', 'GOOGLE_AIO']);
router.use(requireAuth);

// ── Module 2: Onboarding ──

router.post('/onboarding/config', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      brandName: z.string(),
      brandDomain: z.string().optional(),
      brandDescription: z.string().optional(),
      category: z.string().optional(),
      topics: z.array(z.string()).default([]),
      competitors: z.array(z.object({ domain: z.string(), name: z.string().optional() })).default([]),
      engines: z.array(engineSchema).default(['CHATGPT'])
    }).parse(req.body);

    const result = await saveOnboardingConfig(body);
    res.status(200).json(result);
    // Fire-and-forget: generate 200+ research prompts in the background
    setImmediate(() => {
      runPromptDiscovery(body.workspaceId).catch((err) =>
        console.error('[prompt-discovery] failed:', err instanceof Error ? err.message : err)
      );
    });
  } catch (err) {
    next(err);
  }
});

router.get('/onboarding/config', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await getOnboardingConfig(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/onboarding/autofill', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      domain: z.string().min(3)
    }).parse(req.body);

    res.status(200).json(await autofillOnboardingFromDomain({ domain: body.domain }));
  } catch (err) {
    next(err);
  }
});

// ── Module 3: Prompt Library & Query Generation ──

router.get('/prompts', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await listPromptTemplates(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/prompts/generate', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { workspaceId } = z.object({ workspaceId: z.string().uuid() }).parse(req.body);
    await generateAndSaveWorkspacePrompts(workspaceId);
    res.status(200).json(await listPromptTemplates(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.get('/prompts/:id', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.status(200).json(await getPromptTemplate(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/prompts', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      name: z.string().min(2),
      template: z.string().min(3),
      category: z.string().optional()
    }).parse(req.body);
    res.status(201).json(await createPromptTemplate(body));
  } catch (err) {
    next(err);
  }
});

router.patch('/prompts/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.body.workspaceId);
    const body = z.object({
      name: z.string().min(2).optional(),
      template: z.string().min(3).optional(),
      category: z.string().optional()
    }).parse(req.body);
    res.status(200).json(await updatePromptTemplate(req.params.id, workspaceId, body));
  } catch (err) {
    next(err);
  }
});

router.delete('/prompts/:id', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await deletePromptTemplate(req.params.id, workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/prompts/:id/run', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      topicId: z.string().uuid().optional(),
      variables: z.record(z.string()).optional(),
      engines: z.array(engineSchema).min(1)
    }).parse(req.body);
    res.status(200).json(
      await runPromptTemplate({ templateId: req.params.id, ...body })
    );
  } catch (err) {
    next(err);
  }
});

router.post('/queries/generate', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      topicIds: z.array(z.string().uuid()),
      templateIds: z.array(z.string().uuid()).optional()
    }).parse(req.body);
    res.status(200).json(await generateQueriesFromTemplates(body));
  } catch (err) {
    next(err);
  }
});

router.get('/queries', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const topicId = req.query.topicId ? z.string().uuid().parse(req.query.topicId) : undefined;
    res.status(200).json(
      await prisma.aeoQuery.findMany({
        where: { workspaceId, ...(topicId ? { topicId } : {}) },
        include: { topic: { select: { id: true, topicName: true } } },
        orderBy: { createdAt: 'desc' }
      })
    );
  } catch (err) {
    next(err);
  }
});

router.delete('/queries/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await prisma.aeoQuery.delete({ where: { id: req.params.id } });
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/queries/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(), query: z.string().optional() }).parse(req.body);
    res.status(200).json(await prisma.aeoQuery.update({ where: { id: req.params.id }, data: body }));
  } catch (err) {
    next(err);
  }
});

// ── Module 4: AI Query Tracking Engine ──

router.post('/tracking/collect', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid(), queryId: z.string().uuid(), engine: engineSchema }).parse(req.body);
    res.status(201).json(await collectRun(body));
  } catch (err) {
    next(err);
  }
});

router.post('/tracking/batch', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      queryIds: z.array(z.string().uuid()),
      engines: z.array(engineSchema)
    }).parse(req.body);
    res.status(201).json(await batchCollect(body));
  } catch (err) {
    next(err);
  }
});

router.post('/tracking/batch-async', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      queryIds: z.array(z.string().uuid()),
      engines: z.array(engineSchema)
    }).parse(req.body);
    res.status(202).json(await scheduleBatchCollect(body));
  } catch (err) {
    next(err);
  }
});

router.get('/tracking/runs', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const queryId = req.query.queryId ? z.string().uuid().parse(req.query.queryId) : undefined;
    const engine = req.query.engine ? engineSchema.parse(req.query.engine) : undefined;
    const limit = req.query.limit ? z.coerce.number().int().min(1).max(200).parse(req.query.limit) : undefined;
    res.status(200).json(await listRuns(workspaceId, { queryId, engine, limit }));
  } catch (err) {
    next(err);
  }
});

router.get('/tracking/runs/:id', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.status(200).json(await getRunDetail(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/tracking/schedule', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await getSchedule(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.put('/tracking/schedule', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      cronExpr: z.string().optional(),
      enabled: z.boolean().optional()
    }).parse(req.body);
    res.status(200).json(await upsertSchedule(body));
  } catch (err) {
    next(err);
  }
});

// ── Modules 5+ (stubs for Phase 2+) ──

router.get('/citations', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await prisma.citationEntry.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }));
  } catch (err) {
    next(err);
  }
});

router.get('/visibility/overview', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await computeVisibility(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/opportunities/detect', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid() }).parse(req.body);
    res.status(200).json(await detectOpportunities(body.workspaceId));
  } catch (err) {
    next(err);
  }
});

router.get('/opportunities', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await prisma.opportunity.findMany({ where: { workspaceId }, orderBy: { priorityScore: 'desc' } }));
  } catch (err) {
    next(err);
  }
});

router.post('/content/generate', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid(), queryId: z.string().uuid() }).parse(req.body);
    res.status(201).json(await generateContent(body));
  } catch (err) {
    next(err);
  }
});

router.post('/workflows', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid(), name: z.string().min(3) }).parse(req.body);
    res.status(201).json(await createWorkflow(body));
  } catch (err) {
    next(err);
  }
});

router.post('/workflows/:id/run', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid() }).parse(req.body);
    res.status(201).json(await runWorkflow({ workspaceId: body.workspaceId, workflowId: req.params.id }));
  } catch (err) {
    next(err);
  }
});

router.get('/admin/jobs', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await listJobs(workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/:id/retry', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({ workspaceId: z.string().uuid() }).parse(req.body);
    res.status(200).json(await retryJob(body.workspaceId, req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/overview', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const [latestVisibility, opportunities, citations] = await Promise.all([
      prisma.visibilityScore.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      prisma.opportunity.count({ where: { workspaceId } }),
      prisma.citationEntry.count({ where: { workspaceId } })
    ]);

    res.status(200).json({ latestVisibility, opportunities, citations });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/citations', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const rows = await prisma.citationEntry.groupBy({
      by: ['citedDomain'],
      where: { workspaceId },
      _count: { citedDomain: true },
      orderBy: { _count: { citedDomain: 'desc' } }
    });
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/integrations', async (_req, res) => {
  res.status(200).json([
    { provider: 'wordpress', enabled: false },
    { provider: 'notion', enabled: false },
    { provider: 'google-docs', enabled: false },
    { provider: 'webflow', enabled: false }
  ]);
});

// ── Prompt Research Module ─────────────────────────────────────────────────

import {
  listResearchPrompts,
  createResearchPrompt,
  updateResearchPrompt,
  deleteResearchPrompt,
  getResearchPromptMetrics,
  runResearchPromptLive,
  listResearchTopics,
  createResearchTopic,
  updateResearchTopic,
  deleteResearchTopic,
  type ResearchPromptType,
} from '../services/prompt-research.service.js';

const researchPromptTypeSchema = z.enum([
  'CATEGORY_RELATED', 'COMPARISON', 'HOW_TO', 'PROBLEM_SOLVING', 'INFORMATIONAL', 'TRANSACTIONAL'
]);

router.get('/research/prompts', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    const search = req.query.search ? String(req.query.search) : undefined;
    const topicId = req.query.topicId ? z.string().uuid().parse(req.query.topicId) : undefined;
    const promptType = req.query.promptType
      ? researchPromptTypeSchema.parse(req.query.promptType) as ResearchPromptType
      : undefined;
    const region = req.query.region ? String(req.query.region) : undefined;
    const page = req.query.page ? z.coerce.number().int().min(1).parse(req.query.page) : 1;
    const limit = req.query.limit ? z.coerce.number().int().min(1).max(100).parse(req.query.limit) : 25;
    res.status(200).json(await listResearchPrompts({ workspaceId, search, topicId, promptType, region, page, limit }));
  } catch (err) { next(err); }
});

router.post('/research/prompts', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      promptText: z.string().min(3),
      topicId: z.string().uuid().optional(),
      promptType: researchPromptTypeSchema,
      region: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);
    const userId = (req as { user?: { id: string } }).user?.id ?? '';
    res.status(201).json(await createResearchPrompt(body.workspaceId, userId, body));
  } catch (err) { next(err); }
});

router.put('/research/prompts/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.body.workspaceId);
    const body = z.object({
      promptText: z.string().min(3).optional(),
      topicId: z.string().uuid().nullable().optional(),
      promptType: researchPromptTypeSchema.optional(),
      region: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);
    res.status(200).json(await updateResearchPrompt(req.params.id, workspaceId, body));
  } catch (err) { next(err); }
});

router.delete('/research/prompts/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await deleteResearchPrompt(req.params.id, workspaceId));
  } catch (err) { next(err); }
});

router.get('/research/prompts/:id/metrics', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.status(200).json(await getResearchPromptMetrics(req.params.id));
  } catch (err) { next(err); }
});

router.post('/research/prompts/:id/run', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(
      req.body.workspaceId ?? req.query.workspaceId,
    );
    res.status(200).json(await runResearchPromptLive(req.params.id, workspaceId));
  } catch (err) { next(err); }
});

router.get('/research/topics', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await listResearchTopics(workspaceId));
  } catch (err) { next(err); }
});

router.post('/research/topics', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      workspaceId: z.string().uuid(),
      name: z.string().min(1),
      color: z.string().optional(),
    }).parse(req.body);
    res.status(201).json(await createResearchTopic(body.workspaceId, { name: body.name, color: body.color }));
  } catch (err) { next(err); }
});

router.put('/research/topics/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.body.workspaceId);
    const body = z.object({ name: z.string().min(1).optional(), color: z.string().optional() }).parse(req.body);
    res.status(200).json(await updateResearchTopic(req.params.id, workspaceId, body));
  } catch (err) { next(err); }
});

router.delete('/research/topics/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = z.string().uuid().parse(req.query.workspaceId);
    res.status(200).json(await deleteResearchTopic(req.params.id, workspaceId));
  } catch (err) { next(err); }
});

// ── Prompt Discovery ──

router.post('/research/discover', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { workspaceId, force } = z.object({
      workspaceId: z.string().uuid(),
      force: z.boolean().default(false),
    }).parse(req.body);
    const result = await runPromptDiscovery(workspaceId, force);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

export default router;
