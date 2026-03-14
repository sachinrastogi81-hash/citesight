import { createApp, bootstrap } from './app.js';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

async function waitForDb(maxAttempts = 20) {
  for (let i = 1; i <= maxAttempts; i += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch {
      const sleep = Math.min(30000, 500 * 2 ** i);
      await new Promise((resolve) => setTimeout(resolve, sleep));
    }
  }
  throw new Error('Database connection failed during startup');
}

waitForDb()
  .then(() => bootstrap())
  .then(() => {
    const server = app.listen(config.PORT, () => {
      console.log(`CiteSight API listening on :${config.PORT}`);
    });

    async function shutdown() {
      server.close();
      await prisma.$disconnect();
      process.exit(0);
    }
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
