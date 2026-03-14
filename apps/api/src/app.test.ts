import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('health', () => {
  it('returns status payload', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body.service).toBe('api');
  });
});
