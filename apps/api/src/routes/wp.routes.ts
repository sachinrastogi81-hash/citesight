import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import {
  testWpConnection,
  syncWpPosts,
  listWpPosts,
  publishWpPost,
  updateWpPost,
} from '../services/wp.service.js';

const router = Router();
router.use(requireAuth);

// POST /api/wp/:integrationId/test?workspaceId=
router.post('/:integrationId/test', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const result = await testWpConnection(req.params.integrationId, req.user!.workspaceId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wp/:integrationId/sync?workspaceId=
router.post('/:integrationId/sync', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const count = await syncWpPosts(req.params.integrationId, req.user!.workspaceId!);
    res.json({ posts_synced: count });
  } catch (err) {
    next(err);
  }
});

// GET /api/wp/:integrationId/posts?workspaceId=&status=&page=&pageSize=
router.get('/:integrationId/posts', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const { status, page, pageSize } = req.query as Record<string, string>;
    const result = await listWpPosts(req.params.integrationId, req.user!.workspaceId!, {
      status: status || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wp/:integrationId/posts?workspaceId=
router.post('/:integrationId/posts', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      status: z.enum(['publish', 'draft', 'pending']).optional(),
      slug: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const result = await publishWpPost(req.params.integrationId, req.user!.workspaceId!, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/wp/:integrationId/posts/:wpPostId?workspaceId=
router.patch('/:integrationId/posts/:wpPostId', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      status: z.enum(['publish', 'draft', 'pending']).optional(),
    });
    const data = schema.parse(req.body);
    const wpPostId = Number(req.params.wpPostId);
    if (!Number.isInteger(wpPostId) || wpPostId <= 0) {
      res.status(400).json({ message: 'Invalid post ID' });
      return;
    }
    const result = await updateWpPost(req.params.integrationId, req.user!.workspaceId!, wpPostId, data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
