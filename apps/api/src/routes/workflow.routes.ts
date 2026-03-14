import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import * as svc from '../services/workflow.service.js';

const router = Router();
router.use(requireAuth);

// ── Step schema ───────────────────────────────────────────────────

const stepSchema = z.object({
  stepOrder: z.number().int().min(1).optional(),
  stepType: z.enum(['AI', 'FETCH', 'TRANSFORM']),
  label: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  configJson: z.record(z.unknown()).optional(),
}).transform(s => ({
  ...s,
  configJson: s.configJson ?? s.config ?? {},
}));

// ── List workflows (auto-seeds built-ins on first call) ───────────

router.get('/', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getOrSeedBuiltinWorkflows(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

// ── Get single workflow ───────────────────────────────────────────

router.get('/:id', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getWorkflow(req.params.id, req.user!.workspaceId!));
  } catch (err) { next(err); }
});

// ── Create workflow ───────────────────────────────────────────────

router.post('/', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      inputType: z.enum(['text', 'url', 'topic', 'query']).default('text'),
      steps: z.array(stepSchema).min(1),
    }).parse(req.body);

    const stepsWithOrder = body.steps.map((s, i) => ({
      ...s,
      stepOrder: s.stepOrder ?? i + 1,
    }));

    res.status(201).json(
      await svc.createWorkflow(req.user!.workspaceId!, { ...body, steps: stepsWithOrder } as Parameters<typeof svc.createWorkflow>[1]),
    );
  } catch (err) { next(err); }
});

// ── Delete workflow ───────────────────────────────────────────────

router.delete('/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteWorkflow(req.params.id, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Run workflow ──────────────────────────────────────────────────

router.post('/:id/run', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { input, ...rest } = z.object({
      input: z.string().min(1, 'input is required'),
    }).passthrough().parse(req.body);

    const run = await svc.runWorkflow(
      req.params.id,
      req.user!.workspaceId!,
      { input, ...rest as Record<string, string> },
    );
    res.json(run);
  } catch (err) { next(err); }
});

// ── List runs for a workflow ──────────────────────────────────────

router.get('/:id/runs', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.listWorkflowRuns(req.params.id, req.user!.workspaceId!));
  } catch (err) { next(err); }
});

export default router;
