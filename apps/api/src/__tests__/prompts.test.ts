import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    promptTemplate: {
      count: vi.fn().mockResolvedValue(10),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    topic: { findMany: vi.fn() },
    brand: { findUnique: vi.fn() },
    competitor: { findMany: vi.fn() },
    aeoQuery: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    workspaceMembership: { findUnique: vi.fn() }
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../lib/prisma.js';

const app = createApp();
const mockPrisma = vi.mocked(prisma);
const userId = 'user-1';
const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
const topicId1 = '660e8400-e29b-41d4-a716-446655440001';
const queryId1 = '770e8400-e29b-41d4-a716-446655440001';
const queryId2 = '770e8400-e29b-41d4-a716-446655440002';
const templateId1 = '880e8400-e29b-41d4-a716-446655440001';
const templateId2 = '880e8400-e29b-41d4-a716-446655440002';
const token = jwt.sign({ userId }, 'dev-access-secret', { expiresIn: '15m' });

function mockMembership(role = 'ADMIN') {
  mockPrisma.workspaceMembership.findUnique.mockResolvedValue({
    userId, workspaceId, role, createdAt: new Date()
  } as never);
}

describe('Prompt Library & Query Generation (Module 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: seed check returns >0 so no seed happens
    mockPrisma.promptTemplate.count.mockResolvedValue(10 as never);
  });

  describe('GET /api/prompts', () => {
    it('lists system and workspace prompts', async () => {
      mockMembership();
      mockPrisma.promptTemplate.findMany.mockResolvedValue([
        { id: 'p1', name: 'Best Tools', template: 'best {topic} tools', category: 'comparison', isSystem: true, workspaceId: null },
        { id: 'p2', name: 'Custom', template: 'my {topic} query', category: 'custom', isSystem: false, workspaceId }
      ] as never);

      const res = await request(app)
        .get(`/api/prompts?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].isSystem).toBe(true);
    });
  });

  describe('POST /api/prompts', () => {
    it('creates a custom prompt template', async () => {
      mockMembership();
      mockPrisma.promptTemplate.create.mockResolvedValue({
        id: 'p3', workspaceId, name: 'My Template', template: 'custom {topic} query',
        category: 'custom', isSystem: false, createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, name: 'My Template', template: 'custom {topic} query' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Template');
      expect(res.body.isSystem).toBe(false);
    });
  });

  describe('PATCH /api/prompts/:id', () => {
    it('updates a custom prompt', async () => {
      mockMembership();
      mockPrisma.promptTemplate.findUniqueOrThrow.mockResolvedValue({
        id: 'p3', workspaceId, isSystem: false
      } as never);
      mockPrisma.promptTemplate.update.mockResolvedValue({
        id: 'p3', workspaceId, name: 'Updated', template: 'updated {topic}',
        category: 'custom', isSystem: false
      } as never);

      const res = await request(app)
        .patch('/api/prompts/p3')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('rejects updating system templates', async () => {
      mockMembership();
      mockPrisma.promptTemplate.findUniqueOrThrow.mockResolvedValue({
        id: 'p1', workspaceId: null, isSystem: true
      } as never);

      const res = await request(app)
        .patch('/api/prompts/p1')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/queries/generate', () => {
    it('generates queries from templates', async () => {
      mockMembership();
      mockPrisma.topic.findMany.mockResolvedValue([
        { id: topicId1, topicName: 'AI search', workspaceId, createdAt: new Date() }
      ] as never);
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'b1', name: 'MyBrand', workspaceId
      } as never);
      mockPrisma.competitor.findMany.mockResolvedValue([
        { id: 'c1', domain: 'rival.com', brandName: 'Rival', workspaceId }
      ] as never);
      mockPrisma.promptTemplate.findMany.mockResolvedValue([
        { id: templateId1, name: 'Best Tools', template: 'best {topic} tools', isSystem: true },
        { id: templateId2, name: 'What Is', template: 'what is {topic}', isSystem: true }
      ] as never);
      mockPrisma.aeoQuery.findMany
        .mockResolvedValueOnce([] as never) // existing queries check
        .mockResolvedValueOnce([ // final return
          { id: queryId1, query: 'best AI search tools', topicId: topicId1, topic: { id: topicId1, topicName: 'AI search' } },
          { id: queryId2, query: 'what is AI search', topicId: topicId1, topic: { id: topicId1, topicName: 'AI search' } }
        ] as never);
      mockPrisma.aeoQuery.createMany.mockResolvedValue({ count: 2 } as never);

      const res = await request(app)
        .post('/api/queries/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ workspaceId, topicIds: [topicId1] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /api/queries', () => {
    it('lists queries for workspace', async () => {
      mockMembership();
      mockPrisma.aeoQuery.findMany.mockResolvedValue([
        { id: queryId1, query: 'best AI tools', workspaceId, topic: { id: topicId1, topicName: 'AI' } }
      ] as never);

      const res = await request(app)
        .get(`/api/queries?workspaceId=${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].topic.topicName).toBe('AI');
    });
  });
});
