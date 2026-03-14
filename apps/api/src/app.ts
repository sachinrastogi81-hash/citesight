import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import workspacesRoutes from './routes/workspaces.routes.js';
import integrationsRoutes from './routes/integrations.routes.js';
import pagesRoutes from './routes/pages.routes.js';
import modulesRoutes from './routes/modules.routes.js';
import wpRoutes from './routes/wp.routes.js';
import brandRoutes from './routes/brand.routes.js';
import workflowRoutes from './routes/workflow.routes.js';
import gridRoutes from './routes/grid.routes.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', service: 'api' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', authRoutes);
  app.use('/api/workspaces', workspacesRoutes);
  app.use('/api/integrations', integrationsRoutes);
  app.use('/api/pages', pagesRoutes);
  app.use('/api/wp', wpRoutes);
  app.use('/api/brand', brandRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/grids', gridRoutes);
  app.use('/api', modulesRoutes);

  app.use(errorHandler);

  return app;
}

export async function bootstrap() {
  // no-op: prompts are now generated on-demand via AI
}
