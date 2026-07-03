import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';

/**
 * These tests exercise the REAL Express app, REAL middleware (Helmet, rate
 * limiting, JWT auth, role guards), and REAL controller logic — the only
 * thing mocked is the Prisma client itself, standing in for MySQL (which
 * isn't available in this environment). This is a deliberate boundary: it
 * proves the HTTP/auth/validation layer is correct, but does not prove SQL
 * correctness against a live MySQL instance — that needs `prisma migrate`
 * against a real database, which is documented as a manual step in the README.
 */

let usersById = new Map();
let nextId = 1;
let refreshTokens = [];

function makeFakePrisma() {
  return {
    role: {
      upsert: jest.fn(async ({ create }) => ({ id: 1, name: create.name })),
    },
    user: {
      findFirst: jest.fn(async ({ where }) => {
        const all = [...usersById.values()];
        if (where.OR) {
          return all.find((u) => where.OR.some((cond) => Object.entries(cond).every(([k, v]) => u[k] === v))) || null;
        }
        return null;
      }),
      findUnique: jest.fn(async ({ where }) => usersById.get(where.id) || null),
      create: jest.fn(async ({ data }) => {
        const user = { id: nextId++, isActive: true, isPremium: false, isEmailVerified: false, role: { name: 'USER' }, ...data };
        usersById.set(user.id, user);
        return user;
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = usersById.get(where.id);
        const updated = { ...user, ...data };
        usersById.set(where.id, updated);
        return updated;
      }),
    },
    refreshToken: {
      create: jest.fn(async ({ data }) => { refreshTokens.push(data); return data; }),
      findUnique: jest.fn(async ({ where }) => refreshTokens.find((t) => t.token === where.token) || null),
      updateMany: jest.fn(async ({ where, data }) => {
        refreshTokens.forEach((t) => { if (t.token === where.token) Object.assign(t, data); });
      }),
    },
  };
}

let app;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

  jest.unstable_mockModule('../config/prisma.js', () => ({ default: makeFakePrisma(), prisma: makeFakePrisma() }));
  jest.unstable_mockModule('../config/redis.js', () => ({
    default: { get: async () => null, set: async () => null },
    redis: { get: async () => null, set: async () => null },
    cached: async (_key, _ttl, fetcher) => fetcher(),
  }));

  ({ default: app } = await import('../app.js'));
});

beforeEach(() => {
  usersById = new Map();
  nextId = 1;
  refreshTokens = [];
});

describe('POST /api/v1/auth/register', () => {
  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com', username: 'testuser', password: 'Password123!', fullName: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ emailOrUsername: 'nope', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in a registered user and issues an access token', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com', username: 'loginuser', password: 'Password123!',
    });
    const res = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'login@example.com', password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('login@example.com');
  });
});

describe('Role-gated admin routes', () => {
  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin user token', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign({ id: 1, email: 'u@u.com', role: 'USER' }, process.env.JWT_ACCESS_SECRET);
    const res = await request(app).get('/api/v1/admin/dashboard/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/health', () => {
  it('is reachable without auth', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});
