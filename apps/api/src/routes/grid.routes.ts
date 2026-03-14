import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import * as svc from '../services/grid.service.js';

const router = Router();
router.use(requireAuth);

// ── Grids ─────────────────────────────────────────────────────────

router.get('/', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.listGrids(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

router.get('/:id', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getGrid(req.params.id, req.user!.workspaceId!));
  } catch (err) { next(err); }
});

router.post('/', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }).parse(req.body);
    res.status(201).json(await svc.createGrid(req.user!.workspaceId!, req.user!.userId, body));
  } catch (err) { next(err); }
});

router.patch('/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
    }).parse(req.body);
    res.json(await svc.updateGrid(req.params.id, req.user!.workspaceId!, body));
  } catch (err) { next(err); }
});

router.delete('/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteGrid(req.params.id, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Columns ───────────────────────────────────────────────────────

const COLUMN_TYPES = ['text', 'number', 'url', 'ai_prompt', 'workflow', 'json'] as const;

router.post('/:id/columns', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      columnName: z.string().min(1),
      columnType: z.enum(COLUMN_TYPES).default('text'),
      workflowId: z.string().optional(),
    }).parse(req.body);
    res.status(201).json(await svc.addColumn(req.params.id, req.user!.workspaceId!, body));
  } catch (err) { next(err); }
});

router.patch('/columns/:columnId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      columnName: z.string().min(1).optional(),
      columnType: z.enum(COLUMN_TYPES).optional(),
      workflowId: z.string().nullable().optional(),
      position: z.number().int().optional(),
    }).parse(req.body);
    res.json(await svc.updateColumn(req.params.columnId, req.user!.workspaceId!, body));
  } catch (err) { next(err); }
});

router.delete('/columns/:columnId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteColumn(req.params.columnId, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Rows ──────────────────────────────────────────────────────────

router.post('/:id/rows', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const body = z.object({
      values: z.record(z.string()).default({}),
    }).parse(req.body);
    res.status(201).json(await svc.addRow(req.params.id, req.user!.workspaceId!, body.values));
  } catch (err) { next(err); }
});

router.delete('/rows/:rowId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteRow(req.params.rowId, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Cells ─────────────────────────────────────────────────────────

router.put('/cells/:cellId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { value } = z.object({ value: z.string() }).parse(req.body);
    res.json(await svc.updateCell(req.params.cellId, req.user!.workspaceId!, value));
  } catch (err) { next(err); }
});

// Upsert cell by rowId+columnId (used by inline editing)
router.put('/rows/:rowId/cells/:columnId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { value } = z.object({ value: z.string() }).parse(req.body);
    res.json(await svc.upsertCell(req.params.rowId, req.params.columnId, req.user!.workspaceId!, value));
  } catch (err) { next(err); }
});

// ── Run workflow column ───────────────────────────────────────────

router.post('/:id/run', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const { columnId, rowIds } = z.object({
      columnId: z.string(),
      rowIds: z.array(z.string()).optional(),
    }).parse(req.body);
    res.json(await svc.runWorkflowColumn(req.params.id, req.user!.workspaceId!, columnId, rowIds));
  } catch (err) { next(err); }
});

export default router;
