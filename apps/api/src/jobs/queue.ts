import { Queue, Worker } from 'bullmq';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { getProvider, type AiEngine } from '../lib/ai-providers.js';

const redisUrl = new URL(config.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined
};

export const queue = new Queue('citesight-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

export function createWorker() {
  return new Worker(
    'citesight-jobs',
    async (job) => {
      if (job.name === 'run-workflow') {
        const workflowRunId = String(job.data.workflowRunId);
        await prisma.workflowRun.update({ where: { id: workflowRunId }, data: { status: 'RUNNING' } });
        await new Promise((resolve) => setTimeout(resolve, 500));
        await prisma.workflowRun.update({ where: { id: workflowRunId }, data: { status: 'COMPLETED' } });
      }

      if (job.name === 'batch-collect') {
        const { workspaceId, queryIds, engines } = job.data as {
          workspaceId: string;
          queryIds: string[];
          engines: AiEngine[];
        };

        let completed = 0;
        const total = queryIds.length * engines.length;

        for (const queryId of queryIds) {
          const query = await prisma.aeoQuery.findUnique({ where: { id: queryId } });
          if (!query) continue;

          for (const engine of engines) {
            const provider = getProvider(engine);
            const result = await provider.query(query.query);

            const run = await prisma.queryRun.create({
              data: {
                workspaceId,
                queryId,
                engine,
                responseText: result.responseText,
                status: 'COMPLETED'
              }
            });

            await prisma.aiResponse.create({
              data: { workspaceId, queryRunId: run.id, engine, responseText: result.responseText }
            });

            if (result.citations.length > 0) {
              await prisma.citationEntry.createMany({
                data: result.citations.map((url) => {
                  let hostname: string;
                  try { hostname = new URL(url).hostname; } catch { hostname = url; }
                  return {
                    workspaceId,
                    queryRunId: run.id,
                    citedUrl: url,
                    citedDomain: hostname,
                    citedBrand: null,
                    confidence: 0.7
                  };
                })
              });
            }

            completed++;
            await job.updateProgress(Math.round((completed / total) * 100));
          }
        }
      }

      return { ok: true };
    },
    { connection }
  );
}
