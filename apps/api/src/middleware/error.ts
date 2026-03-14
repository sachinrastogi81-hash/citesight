import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(status).json({ message });
}
