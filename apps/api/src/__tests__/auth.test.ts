import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => {
  const mockPrisma = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn()
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  };
  return { prisma: mockPrisma };
});

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn()
  }
}));

import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

const app = createApp();
const mockPrisma = vi.mocked(prisma);
const mockBcrypt = vi.mocked(bcrypt);

describe('Auth Module (Module 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', name: 'Test User',
        passwordHash: '$2a$10$hashedpassword', createdAt: new Date(), updatedAt: new Date()
      } as never);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-1', userId: 'user-1', token: 'refresh-tok',
        expiresAt: new Date(), revoked: false, createdAt: new Date()
      } as never);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', name: 'Test User',
        passwordHash: null, createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com', password: 'password123', name: 'Test User'
      });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
    });

    it('rejects duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as never);

      const res = await request(app).post('/api/auth/register').send({
        email: 'existing@example.com', password: 'password123', name: 'Dup User'
      });

      expect(res.status).toBe(409);
    });

    it('validates required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
      expect(res.status).toBe(500); // zod throws
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', passwordHash: '$2a$10$hash',
        name: 'Test', createdAt: new Date(), updatedAt: new Date()
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-1', userId: 'user-1', token: 'tok', expiresAt: new Date(), revoked: false, createdAt: new Date()
      } as never);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', name: 'Test',
        passwordHash: null, createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com', password: 'password123'
      });

      expect(res.status).toBe(200);
      expect(res.body.tokens.accessToken).toBeDefined();
    });

    it('rejects invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', passwordHash: '$2a$10$hash',
        name: 'Test', createdAt: new Date(), updatedAt: new Date()
      } as never);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com', password: 'wrong'
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues new tokens for valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'user-1', token: 'valid-tok',
        revoked: false, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date()
      } as never);
      mockPrisma.refreshToken.update.mockResolvedValue({} as never);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-2', userId: 'user-1', token: 'new-tok',
        expiresAt: new Date(), revoked: false, createdAt: new Date()
      } as never);
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', name: 'Test',
        passwordHash: null, createdAt: new Date(), updatedAt: new Date()
      } as never);

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'valid-tok' });

      expect(res.status).toBe(200);
      expect(res.body.tokens.accessToken).toBeDefined();
    });

    it('rejects expired refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1', userId: 'user-1', token: 'expired-tok',
        revoked: false, expiresAt: new Date(Date.now() - 1000), createdAt: new Date()
      } as never);

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'expired-tok' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user with valid token', async () => {
      const token = jwt.sign({ userId: 'user-1' }, 'dev-access-secret', { expiresIn: '15m' });
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', name: 'Test'
      } as never);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    it('rejects missing token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
