import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    workspace: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    workspaceMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    apiKey: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn()
    },
    promptTemplate: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn()
    }
  };
  return { prisma: mockPrisma };
});

import { prisma } from '../lib/prisma.js';

const app = createApp();
const mockPrisma = vi.mocked(prisma);
const userId = 'user-1';
const workspaceId = 'ws-1';
const token = jwt.sign({ userId }, 'dev-access-secret', { expiresIn: '15m' });

function mockMembership(role = 'ADMIN') {
  mockPrisma.workspaceMembership.findUnique.mockResolvedValue({
    userId, workspaceId, role, createdAt: new Date()
  } as never);
}

describe('Workspace Module (Module 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/workspaces', () => {
    it('lists user workspaces', async () => {
      mockPrisma.workspaceMembership.findMany.mockResolvedValue([
        {
          workspace: { id: workspaceId, name: 'My Workspace', slug: 'my-ws', onboardingComplete: false, createdAt: new Date() },
          role: 'ADMIN', createdAt: new Date()
        }
      ] as never);

      const res = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('My Workspace');
      expect(res.body[0].role).toBe('ADMIN');
    });
  });

  describe('POST /api/workspaces', () => {
    it('creates a workspace', async () => {
      mockPrisma.workspace.create.mockResolvedValue({
        id: workspaceId, name: 'New WS', slug: 'new-ws', onboardingComplete: false,
        createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New WS', slug: 'new-ws' });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('new-ws');
    });

    it('validates slug format', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', slug: 'INVALID SLUG!' });

      expect(res.status).toBe(500); // zod validation error
    });
  });

  describe('GET /api/workspaces/:workspaceId', () => {
    it('returns workspace details for members', async () => {
      mockMembership();
      mockPrisma.workspace.findUniqueOrThrow.mockResolvedValue({
        id: workspaceId, name: 'My WS', slug: 'my-ws', onboardingComplete: false,
        brands: [], _count: { memberships: 1, apiKeys: 0 },
        createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('My WS');
    });

    it('rejects non-members', async () => {
      mockPrisma.workspaceMembership.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/workspaces/:workspaceId', () => {
    it('allows admin to update workspace', async () => {
      mockMembership('ADMIN');
      mockPrisma.workspace.update.mockResolvedValue({
        id: workspaceId, name: 'Updated', slug: 'my-ws',
        onboardingComplete: false, createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app)
        .patch(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('rejects non-admin updates', async () => {
      mockMembership('VIEWER');

      const res = await request(app)
        .patch(`/api/workspaces/${workspaceId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/workspaces/:workspaceId/invite', () => {
    it('invites a member', async () => {
      mockMembership('ADMIN');
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-2', email: 'new@example.com', name: 'new'
      } as never);
      mockPrisma.workspaceMembership.upsert.mockResolvedValue({
        userId: 'user-2', workspaceId, role: 'EDITOR',
        user: { id: 'user-2', email: 'new@example.com', name: 'new' }
      } as never);

      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/invite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com', role: 'EDITOR' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('EDITOR');
    });
  });
});
