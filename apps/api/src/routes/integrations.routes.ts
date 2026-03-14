import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/auth.js';
import { config } from '../config.js';
import * as svc from '../services/integrations.service.js';
import { IntegrationType } from '@prisma/client';

const router = Router();

// ── /oauth/callback must come BEFORE requireAuth ──────────────────
// Google redirects here unauthenticated
router.get('/oauth/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      return res.redirect(`${config.FRONTEND_URL}/dashboard/integrations?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${config.FRONTEND_URL}/dashboard/integrations?error=missing_params`);
    }

    const { workspaceId, type } = await svc.handleOAuthCallback(code, state);

    return res.redirect(
      `${config.FRONTEND_URL}/dashboard/integrations?connected=${encodeURIComponent(type)}&workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  } catch (err) {
    next(err);
  }
});

// ── All routes below require authentication ───────────────────────
router.use(requireAuth);

// GET /api/integrations?workspaceId=...
router.get('/', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const integrations = await svc.listIntegrations(workspaceId);
    res.json(integrations);
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/:id?workspaceId=...
router.get('/:id', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const integration = await svc.getIntegration(req.params.id, workspaceId);
    res.json(integration);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/oauth/start
router.post('/oauth/start', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({
      type: z.enum(['GOOGLE_SEARCH_CONSOLE', 'GOOGLE_ANALYTICS']),
    });
    const { type } = schema.parse(req.body);
    const workspaceId = req.user!.workspaceId!;
    const result = svc.startOAuth(workspaceId, type as IntegrationType);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/connect/wordpress
router.post('/connect/wordpress', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({
      siteUrl: z.string().url(),
      username: z.string().min(1),
      appPassword: z.string().min(1),
    });
    const { siteUrl, username, appPassword } = schema.parse(req.body);
    const workspaceId = req.user!.workspaceId!;
    const result = await svc.connectWordPress(workspaceId, siteUrl, username, appPassword);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/connect/slack
router.post('/connect/slack', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const schema = z.object({
      webhookUrl: z.string().url(),
    });
    const { webhookUrl } = schema.parse(req.body);
    const workspaceId = req.user!.workspaceId!;
    const result = await svc.connectSlack(workspaceId, webhookUrl);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/integrations/:id/properties/:propertyId/select?workspaceId=...
router.patch('/:id/properties/:propertyId/select', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const result = await svc.selectProperty(req.params.id, req.params.propertyId, workspaceId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/:id/sync?workspaceId=...
// Returns a Server-Sent Events stream so the client can track progress in real time.
router.post('/:id/sync', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const write = (event: string, data: Record<string, unknown>) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Clean up if client disconnects early
  req.on('close', () => res.end());

  try {
    const workspaceId = req.user!.workspaceId!;
    const result = await svc.syncIntegration(req.params.id, workspaceId, write);
    write('done', result as Record<string, unknown>);
  } catch (err: unknown) {
    write('error', { message: (err as Error).message });
  } finally {
    res.end();
  }
});

// DELETE /api/integrations/:id?workspaceId=...
router.delete('/:id', requireWorkspaceMember('ADMIN'), async (req, res, next) => {
  try {
    const workspaceId = req.user!.workspaceId!;
    await svc.disconnectIntegration(req.params.id, workspaceId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
