import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; workspaceId?: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as { userId: string; workspaceId?: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireWorkspaceMember(...allowedRoles: Array<'ADMIN' | 'EDITOR' | 'VIEWER'>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const workspaceId = req.params.workspaceId || req.body?.workspaceId || (req.query.workspaceId as string);
    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this workspace' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role as 'ADMIN' | 'EDITOR' | 'VIEWER')) {
      return res.status(403).json({ message: 'Insufficient role' });
    }

    req.user!.workspaceId = workspaceId;
    next();
  };
}
