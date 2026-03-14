import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import * as svc from '../services/brand.service.js';

const router = Router();
router.use(requireAuth);

// ── Brand Profile ─────────────────────────────────────────────────

router.get('/profile', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getBrandProfile(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

router.post('/profile', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const data = z.object({
      brandName: z.string().min(1),
      website: z.string().optional(),
      industry: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body);
    res.json(await svc.upsertBrandProfile(req.user!.workspaceId!, data));
  } catch (err) { next(err); }
});

router.put('/profile', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const data = z.object({
      brandName: z.string().min(1),
      website: z.string().optional(),
      industry: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body);
    res.json(await svc.upsertBrandProfile(req.user!.workspaceId!, data));
  } catch (err) { next(err); }
});

// ── Brand Voice ───────────────────────────────────────────────────

router.get('/voice', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getBrandVoice(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

const voiceSchema = z.object({
  tone: z.string().optional(),
  writingStyle: z.string().optional(),
  readingLevel: z.string().optional(),
  preferredPhrases: z.array(z.string()).optional(),
  avoidPhrases: z.array(z.string()).optional(),
});

router.post('/voice', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    res.json(await svc.upsertBrandVoice(req.user!.workspaceId!, voiceSchema.parse(req.body)));
  } catch (err) { next(err); }
});

router.put('/voice', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    res.json(await svc.upsertBrandVoice(req.user!.workspaceId!, voiceSchema.parse(req.body)));
  } catch (err) { next(err); }
});

// ── Brand Products ────────────────────────────────────────────────

router.get('/products', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.listBrandProducts(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

router.post('/products', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const data = z.object({
      productName: z.string().min(1),
      description: z.string().optional(),
      productUrl: z.string().optional(),
    }).parse(req.body);
    res.status(201).json(await svc.createBrandProduct(req.user!.workspaceId!, data));
  } catch (err) { next(err); }
});

router.delete('/products/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteBrandProduct(req.params.id, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Brand Audience ────────────────────────────────────────────────

router.get('/audience', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getBrandAudience(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

const audienceSchema = z.object({
  primaryAudience: z.string().optional(),
  secondaryAudience: z.string().optional(),
  geography: z.string().optional(),
});

router.post('/audience', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    res.json(await svc.upsertBrandAudience(req.user!.workspaceId!, audienceSchema.parse(req.body)));
  } catch (err) { next(err); }
});

router.put('/audience', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    res.json(await svc.upsertBrandAudience(req.user!.workspaceId!, audienceSchema.parse(req.body)));
  } catch (err) { next(err); }
});

// ── Brand Competitors ─────────────────────────────────────────────

router.get('/competitors', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.listBrandCompetitors(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

router.post('/competitors', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    const data = z.object({
      competitorName: z.string().min(1),
      website: z.string().optional(),
    }).parse(req.body);
    res.status(201).json(await svc.createBrandCompetitor(req.user!.workspaceId!, data));
  } catch (err) { next(err); }
});

router.delete('/competitors/:id', requireWorkspaceMember('ADMIN', 'EDITOR'), async (req, res, next) => {
  try {
    await svc.deleteBrandCompetitor(req.params.id, req.user!.workspaceId!);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Brand Context (aggregate) ─────────────────────────────────────

router.get('/context', requireWorkspaceMember(), async (req, res, next) => {
  try {
    res.json(await svc.getBrandContext(req.user!.workspaceId!));
  } catch (err) { next(err); }
});

export default router;
