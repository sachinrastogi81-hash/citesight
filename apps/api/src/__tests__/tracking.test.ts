import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    aeoQuery: { findUniqueOrThrow: vi.fn(), findMany: vi.fn() },
    queryRun: { create: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    aiResponse: { create: vi.fn(), findMany: vi.fn() },
    citationEntry: { createMany: vi.fn(), findMany: vi.fn() },
    brand: { findUnique: vi.fn() },
    competitor: { findMany: vi.fn() },
    querySchedule: { findUnique: vi.fn(), upsert: vi.fn() },
    workspaceMembership: { findUnique: vi.fn() },
    promptTemplate: { count: vi.fn().mockResolvedValue(10), createMany: vi.fn() }
  };
  return { prisma: mockPrisma };
});

vi.mock('../lib/ai-providers.js', () => ({
  getProvider: vi.fn().mockReturnValue({
    engine: 'CHATGPT',
    query: vi.fn().mockResolvedValue({
      engine: 'CHATGPT',
      responseText: 'AI response about AI search tools. Sources: https://example.com, https://docs.example.com',
      citations: ['https://example.com', 'https://docs.example.com'],
      latencyMs: 150
    })
  })
}));

vi.mock('../jobs/queue.js', () => ({
  queue: {
    add: vi.fn().mockResolvedValue({ id: 'job-1' })
  }
}));

import { prisma } from '../lib/prisma.js';

const app = createApp();
const mockPrisma = vi.mocked(prisma);
const userId = 'user-1';
const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const queryId1 = '770e8400-e29b-41d4-a716-446655440001';
const queryId2 = '770e8400-e29b-41d4-a716-446655440002';
const token = jwt.sign({ userId }, 'dev-access-secret', { expiresIn: '15m' });

function mockMembership(role = 'ADMIN') {
  mockPrisma.workspaceMembership.findUnique.mockResolvedValue({
    userId, workspaceId, role, createdAt: new Date()
  } as never);
}

describe('AI Query Tracking Engine (Module 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/tracking/collect', () => {
    it('collects a single query run with citations', async () => {
      mockMembership();
      mockPrisma.aeoQuery.findUniqueOrThrow.mockResolvedValue({
        id: queryId1, query: 'best AI search tools', workspaceId
      } as never);
      mockPrisma.queryRun.create.mockResolvedValue({
        id: 'run-1', workspaceId, queryId: queryId1, engine: 'CHATGPT',
        responseText: 'AI response', status: 'COMPLETED', createdAt: new Date()
      } as never);
      mockPrisma.aiResponse.create.mockResolvedValue({} as never);
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'b1', name: 'TestBrand', workspaceId
      } as never);
      mockPrisma.competitor.findMany.mockResolvedValue([
        { id: 'c1', domain: 'example.com', brandName: 'Example' }
      ] as never);
      mockPrisma.citationEntry.createMany.mockResolvedValue({ count: 2 } as never);
      mockPrisma.citationEntry.findMany.mockResolvedValue([
        { id: 'cit-1', citedUrl: 'https://example.com', citedDomain: 'example.com', confidence: 0.9 },
        { id: 'cit-2', citedUrl: 'https://docs.example.com', citedDomain: 'docs.example.com', confidence: 0.7 }
      ] as never);

      const res = await request(app)
        .post('/api/tracking/collect')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, queryId: queryId1, engine: 'CHATGPT' });

      expect(res.status).toBe(201);
      expect(res.body.run.status).toBe('COMPLETED');
      expect(res.body.citations).toHaveLength(2);
    });
  });

  describe('POST /api/tracking/batch-async', () => {
    it('queues a batch collection job', async () => {
      mockMembership();

      const res = await request(app)
        .post('/api/tracking/batch-async')
        .set('Authorization', `Bearer ${token}`)
        .send({
          workspaceId,
          queryIds: [queryId1, queryId2],
          engines: ['CHATGPT', 'PERPLEXITY']
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('queued');
      expect(res.body.queryCount).toBe(2);
      expect(res.body.engineCount).toBe(2);
    });
  });

  describe('GET /api/tracking/runs', () => {
    it('lists runs for workspace', async () => {
      mockMembership();
      mockPrisma.queryRun.findMany.mockResolvedValue([
        {
          id: 'run-1', workspaceId, queryId: 'q1', engine: 'CHATGPT',
          status: 'COMPLETED', createdAt: new Date(),
          query: { id: 'q1', query: 'best AI tools' }
        }
      ] as never);

      const res = await request(app)
        .get(`/api/tracking/runs?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].query.query).toBe('best AI tools');
    });

    it('filters by engine', async () => {
      mockMembership();
      mockPrisma.queryRun.findMany.mockResolvedValue([] as never);

      const res = await request(app)
        .get(`/api/tracking/runs?workspaceId=${workspaceId}&engine=PERPLEXITY`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/tracking/runs/:id', () => {
    it('returns run detail with responses and citations', async () => {
      mockMembership();
      mockPrisma.queryRun.findUniqueOrThrow.mockResolvedValue({
        id: 'run-1', workspaceId, queryId: 'q1', engine: 'CHATGPT',
        responseText: 'response', status: 'COMPLETED',
        query: { id: 'q1', query: 'best AI tools' }
      } as never);
      mockPrisma.aiResponse.findMany.mockResolvedValue([
        { id: 'ar-1', engine: 'CHATGPT', responseText: 'response' }
      ] as never);
      mockPrisma.citationEntry.findMany.mockResolvedValue([
        { id: 'cit-1', citedUrl: 'https://example.com' }
      ] as never);

      const res = await request(app)
        .get('/api/tracking/runs/run-1?workspaceId=' + workspaceId)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.run.status).toBe('COMPLETED');
      expect(res.body.responses).toHaveLength(1);
      expect(res.body.citations).toHaveLength(1);
    });
  });

  describe('PUT /api/tracking/schedule', () => {
    it('creates/updates tracking schedule', async () => {
      mockMembership();
      mockPrisma.querySchedule.upsert.mockResolvedValue({
        id: 'qs-1', workspaceId, cronExpr: '0 8 * * *', enabled: true,
        lastRunAt: null, nextRunAt: new Date()
      } as never);

      const res = await request(app)
        .put('/api/tracking/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, cronExpr: '0 8 * * *', enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.cronExpr).toBe('0 8 * * *');
      expect(res.body.enabled).toBe(true);
    });
  });

  describe('GET /api/tracking/schedule', () => {
    it('returns current schedule', async () => {
      mockMembership();
      mockPrisma.querySchedule.findUnique.mockResolvedValue({
        id: 'qs-1', workspaceId, cronExpr: '0 6 * * *', enabled: true
      } as never);

      const res = await request(app)
        .get(`/api/tracking/schedule?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.cronExpr).toBe('0 6 * * *');
    });
  });
});
