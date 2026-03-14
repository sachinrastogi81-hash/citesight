import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import {
  createApiKey,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  inviteWorkspaceMember,
  listApiKeys,
  listUserWorkspaces,
  listWorkspaceMembers,
  removeMember,
  revokeApiKey,
  updateMemberRole,
  updateWorkspace
} from '../services/workspace.service.js';

const roleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.status(200).json(await listUserWorkspaces(req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9-]+$/) }).parse(req.body);
    const workspace = await createWorkspace({ userId: req.user!.userId, ...body });
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

router.get('/:workspaceId', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.status(200).json(await getWorkspace(req.params.workspaceId));
  } catch (err) {
    next(err);
  }
});

router.patch('/:workspaceId', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(2).optional(), slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional() }).parse(req.body);
    res.status(200).json(await updateWorkspace(req.params.workspaceId, body));
  } catch (err) {
    next(err);
  }
});

router.delete('/:workspaceId', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    res.status(200).json(await deleteWorkspace(req.params.workspaceId));
  } catch (err) {
    next(err);
  }
});

router.get('/:workspaceId/members', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.status(200).json(await listWorkspaceMembers(req.params.workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/:workspaceId/invite', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), role: roleSchema }).parse(req.body);
    res.status(201).json(await inviteWorkspaceMember({ workspaceId: req.params.workspaceId, email: body.email, role: body.role }));
  } catch (err) {
    next(err);
  }
});

router.patch('/:workspaceId/members/:userId', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({ role: roleSchema }).parse(req.body);
    res.status(200).json(await updateMemberRole({ workspaceId: req.params.workspaceId, userId: req.params.userId, role: body.role }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:workspaceId/members/:userId', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    res.status(200).json(await removeMember({ workspaceId: req.params.workspaceId, userId: req.params.userId }));
  } catch (err) {
    next(err);
  }
});

router.get('/:workspaceId/api-keys', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    res.status(200).json(await listApiKeys(req.params.workspaceId));
  } catch (err) {
    next(err);
  }
});

router.post('/:workspaceId/api-keys', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const body = z.object({ label: z.string().min(2) }).parse(req.body);
    res.status(201).json(await createApiKey({ workspaceId: req.params.workspaceId, label: body.label }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:workspaceId/api-keys/:keyId', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    res.status(200).json(await revokeApiKey(req.params.workspaceId, req.params.keyId));
  } catch (err) {
    next(err);
  }
});

export default router;
