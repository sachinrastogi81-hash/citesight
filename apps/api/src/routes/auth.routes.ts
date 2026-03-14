import { Router } from 'express';
import { z } from 'zod';
import { login, refresh, register } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2) }).parse(req.body);
    res.status(201).json(await register(body));
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      rememberMe: z.boolean().optional(),
    }).parse(req.body);
    res.status(200).json(await login(body));
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
    res.status(200).json(await refresh(body.refreshToken));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId }, select: { id: true, email: true, name: true } });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
