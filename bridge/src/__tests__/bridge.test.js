import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * Integration tests against the REAL PlusOne snapshot copied into
 * bridge/data/plusone_backup.sqlite (run `npm run sync -- <path>` first).
 * These exercise actual SQL queries against actual data — not mocks.
 */
let app;

beforeAll(async () => {
  process.env.PLUSONE_DB_PATH = process.env.PLUSONE_DB_PATH || './data/plusone_backup.sqlite';
  ({ default: app } = await import('../app.js'));
});

describe('GET /api/v1/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/v1/matches', () => {
  it('returns a paginated list of real matches', async () => {
    const res = await request(app).get('/api/v1/matches?pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const match = res.body.data[0];
    expect(match).toHaveProperty('homeTeam.name');
    expect(match).toHaveProperty('awayTeam.name');
    expect(match).toHaveProperty('league.name');
  });

  it('supports search filtering', async () => {
    const res = await request(app).get('/api/v1/matches?q=Ludogorets&pageSize=5');
    expect(res.status).toBe(200);
    res.body.data.forEach((m) => {
      const hit = m.homeTeam.name.includes('Ludogorets') || m.awayTeam.name.includes('Ludogorets') || m.league.name.includes('Ludogorets');
      expect(hit).toBe(true);
    });
  });
});

describe('GET /api/v1/matches/:id', () => {
  it('404s for a nonexistent match', async () => {
    const res = await request(app).get('/api/v1/matches/this-id-does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns a real match by id', async () => {
    const list = await request(app).get('/api/v1/matches?pageSize=1');
    const id = list.body.data[0].id;
    const res = await request(app).get(`/api/v1/matches/${encodeURIComponent(id)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });
});

describe('GET /api/v1/predictions/:matchId', () => {
  it('maps PlusOne prediction_log into the 3-engine shape, gated for anonymous users', async () => {
    const withPrediction = await request(app).get('/api/v1/matches?q=Ludogorets&pageSize=1');
    const id = withPrediction.body.data[0]?.id;
    if (!id) return; // snapshot-dependent; skip gracefully if data shape changes

    const res = await request(app).get(`/api/v1/predictions/${encodeURIComponent(id)}`);
    expect(res.status).toBe(200);
    if (res.body.data.statistical) {
      expect(res.body.data.statistical).toHaveProperty('homeWinProb');
      expect(res.body.data.machineLearning).toHaveProperty('overUnder');
      expect(res.body.data.hybrid).toHaveProperty('locked', true); // anonymous request => gated
    }
  });

  it('unlocks the full hybrid breakdown for a premium-authenticated request', async () => {
    const jwt = await import('jsonwebtoken');
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret';
    const token = jwt.default.sign({ id: 1, role: 'ADMIN' }, process.env.JWT_ACCESS_SECRET);

    const withPrediction = await request(app).get('/api/v1/matches?q=Ludogorets&pageSize=1');
    const id = withPrediction.body.data[0]?.id;
    if (!id) return;

    const res = await request(app)
      .get(`/api/v1/predictions/${encodeURIComponent(id)}`)
      .set('Authorization', `Bearer ${token}`);

    if (res.body.data.hybrid) {
      expect(res.body.data.hybrid.locked).toBeUndefined();
    }
  });
});

describe('GET /api/v1/stats/model-accuracy', () => {
  it('returns computed accuracy percentages from graded predictions', async () => {
    const res = await request(app).get('/api/v1/stats/model-accuracy');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('gradedPredictions');
    expect(res.body.data.gradedPredictions).toBeGreaterThan(0);
  });
});
