import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, prisma } from './index.js';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production';
});
afterAll(async () => { await prisma.$disconnect(); });

describe('API access controls', () => {
  it('exposes a health check', async () => {
    const result = await request(app).get('/api/health');
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ok');
  });

  it('allows each comma-separated configured browser origin through CORS', async () => {
    const original = process.env.CLIENT_ORIGIN;
    process.env.CLIENT_ORIGIN = 'http://localhost:5173, http://localhost:4173';
    try {
      for (const origin of ['http://localhost:5173', 'http://localhost:4173']) {
        const response = await request(app).get('/api/health').set('Origin', origin);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
      const blocked = await request(app).get('/api/health').set('Origin', 'http://evil.example');
      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      if (original === undefined) delete process.env.CLIENT_ORIGIN;
      else process.env.CLIENT_ORIGIN = original;
    }
  });

  it('returns the shared JSON validation error for invalid body and query input', async () => {
    const invalidForm = await request(app).post('/api/forms').send({ title: '', fields: [] });
    expect(invalidForm.status).toBe(400);
    expect(invalidForm.body.error.message).toBe('Invalid request body');
    const invalidExport = await request(app).get('/api/responses/export.csv');
    expect(invalidExport.status).toBe(400);
    expect(invalidExport.body.error.message).toBe('Invalid request query');
  });

  it('requires authentication for assigned forms', async () => {
    const result = await request(app).get('/api/forms/assigned');
    expect(result.status).toBe(401);
  });

  it('requires the ADMIN role to create a form', async () => {
    const workerToken = jwt.sign({ id: 'worker-test', role: 'WORKER' }, 'test-access-secret-not-for-production');
    const result = await request(app).post('/api/forms').set('Authorization', `Bearer ${workerToken}`).send({ title: 'Forbidden', fields: [{ id: 'name', label: 'Name', type: 'text', required: true }] });
    expect(result.status).toBe(403);
  });

  it('treats a repeated client UUID as a successful duplicate', async () => {
    const workerToken = jwt.sign({ id: 'worker-test', role: 'WORKER' }, 'test-access-secret-not-for-production');
    const lookup = vi.spyOn(prisma.response, 'findUnique').mockResolvedValue({ id: 'saved' } as never);
    const payload = { submissions: [{ clientId: '4a12b724-675a-4d5b-bcf8-ad6b5773db4a', formVersionId: 'version-1', answers: {}, collectedAt: new Date().toISOString() }] };
    const first = await request(app).post('/api/sync').set('Authorization', `Bearer ${workerToken}`).send(payload);
    const second = await request(app).post('/api/sync').set('Authorization', `Bearer ${workerToken}`).send(payload);
    expect(first.body.results[0].status).toBe('DUPLICATE');
    expect(second.body.results[0].status).toBe('DUPLICATE');
    expect(lookup).toHaveBeenCalledTimes(2);
    lookup.mockRestore();
  });

  it('scopes a worker response query to the authenticated worker', async () => {
    const workerToken = jwt.sign({ id: 'worker-only-me', role: 'WORKER' }, 'test-access-secret-not-for-production');
    const find = vi.spyOn(prisma.response, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.response, 'count').mockResolvedValue(0);
    await request(app).get('/api/responses?workerId=someone-else').set('Authorization', `Bearer ${workerToken}`);
    expect(find.mock.calls[0][0]?.where).toMatchObject({ workerId: 'worker-only-me' });
    find.mockRestore();
    vi.restoreAllMocks();
  });

  it('limits a worker form list to assigned forms', async () => {
    const workerToken = jwt.sign({ id: 'worker-only-me', role: 'WORKER' }, 'test-access-secret-not-for-production');
    const find = vi.spyOn(prisma.form, 'findMany').mockResolvedValue([]);
    await request(app).get('/api/forms/assigned').set('Authorization', `Bearer ${workerToken}`);
    expect(find.mock.calls[0][0]?.where).toEqual({ assignments: { some: { workerId: 'worker-only-me' } } });
    vi.restoreAllMocks();
  });

  it('hides another worker response by ID', async () => {
    const workerToken = jwt.sign({ id: 'worker-only-me', role: 'WORKER' }, 'test-access-secret-not-for-production');
    const find = vi.spyOn(prisma.response, 'findFirst').mockResolvedValue(null);
    const result = await request(app).get('/api/responses/private-response').set('Authorization', `Bearer ${workerToken}`);
    expect(result.status).toBe(404);
    expect(find.mock.calls[0][0]?.where).toEqual({ id: 'private-response', workerId: 'worker-only-me' });
    vi.restoreAllMocks();
  });
});
