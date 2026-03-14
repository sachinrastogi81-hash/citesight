import { Router } from 'express';
import { z } from 'zod';
import { OpportunityScore } from '@prisma/client';
import { requireAuth, requireWorkspaceMember } from '../middleware/auth.js';
import { listPages } from '../services/pages.service.js';

const router = Router();
router.use(requireAuth);

// GET /api/pages?workspaceId=&sortBy=&sortDir=&opportunityScore=&minImpressions=&maxImpressions=&page=&pageSize=
router.get('/', requireWorkspaceMember(), async (req, res, next) => {
  try {
    const query = z.object({
      workspaceId: z.string().uuid(),
      sortBy: z.enum(['clicks', 'impressions', 'position']).optional(),
      sortDir: z.enum(['asc', 'desc']).optional(),
      opportunityScore: z.nativeEnum(OpportunityScore).optional(),
      minImpressions: z.coerce.number().int().min(0).optional(),
      maxImpressions: z.coerce.number().int().min(0).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
    }).parse(req.query);

    const result = await listPages(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
