import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    brand: { upsert: vi.fn(), findUnique: vi.fn() },
    topic: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    competitor: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    engineConfig: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    workspace: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    workspaceMembership: { findUnique: vi.fn() },
    promptTemplate: { count: vi.fn().mockResolvedValue(0), createMany: vi.fn() }
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../lib/prisma.js';

const app = createApp();
const mockPrisma = vi.mocked(prisma);
const userId = 'user-1';
const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const token = jwt.sign({ userId }, 'dev-access-secret', { expiresIn: '15m' });

function mockMembership(role = 'ADMIN') {
  mockPrisma.workspaceMembership.findUnique.mockResolvedValue({
    userId, workspaceId, role, createdAt: new Date()
  } as never);
}

describe('Onboarding Module (Module 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/onboarding/config', () => {
    it('saves onboarding configuration', async () => {
      mockMembership();
      mockPrisma.brand.upsert.mockResolvedValue({} as never);
      mockPrisma.topic.deleteMany.mockResolvedValue({} as never);
      mockPrisma.topic.createMany.mockResolvedValue({} as never);
      mockPrisma.competitor.deleteMany.mockResolvedValue({} as never);
      mockPrisma.competitor.createMany.mockResolvedValue({} as never);
      mockPrisma.engineConfig.deleteMany.mockResolvedValue({} as never);
      mockPrisma.engineConfig.createMany.mockResolvedValue({} as never);
      mockPrisma.workspace.update.mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/onboarding/config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          workspaceId,
          brandName: 'TestBrand',
          brandDescription: 'A test brand',
          category: 'SaaS',
          topics: ['AI search', 'SEO'],
          competitors: [{ domain: 'competitor.com', name: 'Competitor' }],
          engines: ['CHATGPT', 'PERPLEXITY']
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.onboardingComplete).toBe(true);
    });

    it('marks onboarding incomplete without topics', async () => {
      mockMembership();
      mockPrisma.brand.upsert.mockResolvedValue({} as never);
      mockPrisma.topic.deleteMany.mockResolvedValue({} as never);
      mockPrisma.competitor.deleteMany.mockResolvedValue({} as never);
      mockPrisma.engineConfig.deleteMany.mockResolvedValue({} as never);
      mockPrisma.engineConfig.createMany.mockResolvedValue({} as never);
      mockPrisma.workspace.update.mockResolvedValue({} as never);

      const res = await request(app)
        .post('/api/onboarding/config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          workspaceId,
          brandName: 'TestBrand',
          topics: [],
          competitors: [],
          engines: ['CHATGPT']
        });

      expect(res.status).toBe(200);
      expect(res.body.onboardingComplete).toBe(false);
    });
  });

  describe('GET /api/onboarding/config', () => {
    it('returns onboarding config', async () => {
      mockMembership();
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'b1', workspaceId, name: 'TestBrand', description: 'Test', category: 'SaaS'
      } as never);
      mockPrisma.topic.findMany.mockResolvedValue([
        { id: 't1', topicName: 'AI search', workspaceId, createdAt: new Date() }
      ] as never);
      mockPrisma.competitor.findMany.mockResolvedValue([
        { id: 'c1', domain: 'competitor.com', brandName: 'Comp', workspaceId, createdAt: new Date() }
      ] as never);
      mockPrisma.engineConfig.findMany.mockResolvedValue([
        { id: 'e1', engine: 'CHATGPT', enabled: true, workspaceId, createdAt: new Date() }
      ] as never);
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        onboardingComplete: true
      } as never);

      const res = await request(app)
        .get(`/api/onboarding/config?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.onboardingComplete).toBe(true);
      expect(res.body.brand.name).toBe('TestBrand');
      expect(res.body.topics).toHaveLength(1);
      expect(res.body.competitors).toHaveLength(1);
      expect(res.body.engines).toEqual(['CHATGPT']);
    });
  });
});
