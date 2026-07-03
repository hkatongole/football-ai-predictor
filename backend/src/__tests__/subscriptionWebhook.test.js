import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';

/**
 * Verifies the previously-stubbed subscription-cancellation flow: a
 * checkout.session.completed event should create a Subscription row mapped
 * to Stripe's subscription ID, and a later customer.subscription.deleted
 * event for that same ID should look it up and revoke isPremium — this is
 * the exact gap flagged in the "Remaining Work" section that's now fixed.
 */

let users, subscriptions, payments, nextSubId;

function makeFakePrisma() {
  return {
    user: {
      update: jest.fn(async ({ where, data }) => {
        const u = users.get(where.id);
        const updated = { ...u, ...data };
        users.set(where.id, updated);
        return updated;
      }),
    },
    payment: {
      create: jest.fn(async ({ data }) => { payments.push(data); return data; }),
    },
    subscription: {
      upsert: jest.fn(async ({ where, update, create }) => {
        const existing = [...subscriptions.values()].find((s) => s.stripeSubscriptionId === where.stripeSubscriptionId);
        if (existing) {
          const updated = { ...existing, ...update };
          subscriptions.set(existing.id, updated);
          return updated;
        }
        const record = { id: nextSubId++, ...create };
        subscriptions.set(record.id, record);
        return record;
      }),
      findUnique: jest.fn(async ({ where }) =>
        [...subscriptions.values()].find((s) => s.stripeSubscriptionId === where.stripeSubscriptionId) || null),
      findFirst: jest.fn(async ({ where }) =>
        [...subscriptions.values()].find((s) => s.userId === where.userId && s.status === where.status && s.id !== where.id?.not) || null),
      update: jest.fn(async ({ where, data }) => {
        const existing = [...subscriptions.values()].find((s) => s.stripeSubscriptionId === where.stripeSubscriptionId);
        const updated = { ...existing, ...data };
        subscriptions.set(existing.id, updated);
        return updated;
      }),
    },
  };
}

let app;
let mockConstructWebhookEvent;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

  mockConstructWebhookEvent = jest.fn();

  jest.unstable_mockModule('../config/prisma.js', () => ({ default: makeFakePrisma(), prisma: makeFakePrisma() }));
  jest.unstable_mockModule('../config/redis.js', () => ({
    default: { get: async () => null, set: async () => null },
    cached: async (_k, _t, fetcher) => fetcher(),
  }));
  jest.unstable_mockModule('../services/stripeService.js', () => ({
    isStripeConfigured: () => true,
    createCheckoutSession: jest.fn(),
    constructWebhookEvent: mockConstructWebhookEvent,
    retrieveSubscription: jest.fn(async () => ({ current_period_end: Math.floor(Date.now() / 1000) + 2592000 })),
  }));

  ({ default: app } = await import('../app.js'));
});

beforeEach(() => {
  users = new Map([[42, { id: 42, isPremium: false }]]);
  subscriptions = new Map();
  payments = [];
  nextSubId = 1;
});

describe('POST /api/v1/subscriptions/webhook', () => {
  it('rejects an unverifiable signature', async () => {
    mockConstructWebhookEvent.mockImplementation(() => { throw new Error('bad signature'); });
    const res = await request(app)
      .post('/api/v1/subscriptions/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'invalid')
      .send(JSON.stringify({ fake: true }));
    expect(res.status).toBe(400);
  });

  it('checkout.session.completed grants premium AND persists the stripeSubscriptionId mapping', async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          client_reference_id: '42',
          metadata: { userId: '42', planId: '1' },
          subscription: 'sub_test_abc',
          amount_total: 999,
          currency: 'usd',
        },
      },
    });

    const res = await request(app)
      .post('/api/v1/subscriptions/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({}));

    expect(res.status).toBe(200);
    expect(users.get(42).isPremium).toBe(true);
    const sub = [...subscriptions.values()].find((s) => s.stripeSubscriptionId === 'sub_test_abc');
    expect(sub).toBeTruthy();
    expect(sub.status).toBe('ACTIVE');
    expect(sub.userId).toBe(42);
  });

  it('customer.subscription.deleted revokes isPremium via the stored mapping (the previously-stubbed fix)', async () => {
    // First, simulate the completed checkout that creates the mapping.
    mockConstructWebhookEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', client_reference_id: '42', metadata: { userId: '42', planId: '1' }, subscription: 'sub_xyz', amount_total: 999, currency: 'usd' } },
    });
    await request(app).post('/api/v1/subscriptions/webhook').set('Content-Type', 'application/json').send(JSON.stringify({}));
    expect(users.get(42).isPremium).toBe(true);

    // Now simulate Stripe telling us that subscription was cancelled.
    mockConstructWebhookEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_xyz' } },
    });
    const res = await request(app).post('/api/v1/subscriptions/webhook').set('Content-Type', 'application/json').send(JSON.stringify({}));

    expect(res.status).toBe(200);
    expect(users.get(42).isPremium).toBe(false); // <-- this is the fix; previously this stayed true forever
    const sub = [...subscriptions.values()].find((s) => s.stripeSubscriptionId === 'sub_xyz');
    expect(sub.status).toBe('CANCELLED');
  });

  it('an unknown subscription ID on deletion does not crash the webhook', async () => {
    mockConstructWebhookEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_never_seen' } },
    });
    const res = await request(app).post('/api/v1/subscriptions/webhook').set('Content-Type', 'application/json').send(JSON.stringify({}));
    expect(res.status).toBe(200);
  });
});
