import { Router } from 'express';
import prisma from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { dispatch } from '../controllers/notificationController.js';

const router = Router();

// Every route below requires an authenticated ADMIN or SUPER_ADMIN
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

/** Dashboard summary stats */
router.get('/dashboard/stats', async (_req, res, next) => {
  try {
    const [users, matches, predictions, subscriptions, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: users,
        totalMatches: matches,
        totalPredictions: predictions,
        activeSubscriptions: subscriptions,
        totalRevenue: revenue._sum.amount || 0,
      },
    });
  } catch (err) { next(err); }
});

/** Manage Users */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, q } = req.query;
    const where = q ? { OR: [{ email: { contains: q } }, { username: { contains: q } }] } : {};
    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, include: { role: true },
        skip: (page - 1) * pageSize, take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json({ success: true, total, data });
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { isActive, isPremium, roleId } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { isActive, isPremium, roleId },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
});

/** Manage Leagues */
router.get('/leagues', async (_req, res, next) => {
  try {
    const leagues = await prisma.league.findMany({ include: { _count: { select: { teams: true, matches: true } } } });
    res.json({ success: true, data: leagues });
  } catch (err) { next(err); }
});

router.post('/leagues', async (req, res, next) => {
  try {
    const league = await prisma.league.create({ data: req.body });
    res.status(201).json({ success: true, data: league });
  } catch (err) { next(err); }
});

router.patch('/leagues/:id', async (req, res, next) => {
  try {
    const league = await prisma.league.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json({ success: true, data: league });
  } catch (err) { next(err); }
});

router.delete('/leagues/:id', async (req, res, next) => {
  try {
    await prisma.league.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'League deleted' });
  } catch (err) { next(err); }
});

/** Manage Fixtures */
router.get('/fixtures', async (req, res, next) => {
  try {
    const { q, page = 1, pageSize = 20 } = req.query;
    const where = q ? {
      OR: [
        { homeTeam: { name: { contains: q } } },
        { awayTeam: { name: { contains: q } } },
        { league: { name: { contains: q } } },
      ],
    } : {};
    const [total, data] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where, include: { homeTeam: true, awayTeam: true, league: true },
        orderBy: { kickoff: 'desc' },
        skip: (page - 1) * pageSize, take: Number(pageSize),
      }),
    ]);
    res.json({ success: true, total, data });
  } catch (err) { next(err); }
});

router.post('/fixtures', async (req, res, next) => {
  try {
    const match = await prisma.match.create({ data: req.body });
    res.status(201).json({ success: true, data: match });
  } catch (err) { next(err); }
});

router.patch('/fixtures/:id', async (req, res, next) => {
  try {
    const match = await prisma.match.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json({ success: true, data: match });
  } catch (err) { next(err); }
});

router.delete('/fixtures/:id', async (req, res, next) => {
  try {
    await prisma.match.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Fixture deleted' });
  } catch (err) { next(err); }
});

/** Manage Prediction Models */
router.get('/prediction-models', async (_req, res, next) => {
  try {
    const models = await prisma.predictionModel.findMany();
    res.json({ success: true, data: models });
  } catch (err) { next(err); }
});

router.patch('/prediction-models/:id', async (req, res, next) => {
  try {
    const model = await prisma.predictionModel.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json({ success: true, data: model });
  } catch (err) { next(err); }
});

/** Manage Subscription Plans */
router.get('/subscription-plans', async (_req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.subscriptionPlan.findMany() });
  } catch (err) { next(err); }
});
router.post('/subscription-plans', async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await prisma.subscriptionPlan.create({ data: req.body }) });
  } catch (err) { next(err); }
});
router.patch('/subscription-plans/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await prisma.subscriptionPlan.update({ where: { id: Number(req.params.id) }, data: req.body }) });
  } catch (err) { next(err); }
});
router.delete('/subscription-plans/:id', async (req, res, next) => {
  try {
    await prisma.subscriptionPlan.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) { next(err); }
});

/** Manage News / Blogs */
router.get('/news', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.news.findMany({ orderBy: { createdAt: 'desc' } }) }); }
  catch (err) { next(err); }
});
router.post('/news', async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await prisma.news.create({ data: req.body }) }); }
  catch (err) { next(err); }
});
router.patch('/news/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await prisma.news.update({ where: { id: Number(req.params.id) }, data: req.body }) }); }
  catch (err) { next(err); }
});
router.delete('/news/:id', async (req, res, next) => {
  try {
    await prisma.news.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Article deleted' });
  } catch (err) { next(err); }
});

/** Manage Advertisements */
router.get('/ads', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.advertisement.findMany() }); }
  catch (err) { next(err); }
});
router.post('/ads', async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await prisma.advertisement.create({ data: req.body }) }); }
  catch (err) { next(err); }
});
router.patch('/ads/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await prisma.advertisement.update({ where: { id: Number(req.params.id) }, data: req.body }) }); }
  catch (err) { next(err); }
});
router.delete('/ads/:id', async (req, res, next) => {
  try {
    await prisma.advertisement.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Ad deleted' });
  } catch (err) { next(err); }
});

/** API Keys */
router.get('/api-keys', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.apiKey.findMany({ select: { id: true, provider: true, label: true, isActive: true, createdAt: true } }) }); }
  catch (err) { next(err); }
});
router.post('/api-keys', async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await prisma.apiKey.create({ data: req.body }) }); }
  catch (err) { next(err); }
});
router.patch('/api-keys/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await prisma.apiKey.update({ where: { id: Number(req.params.id) }, data: req.body }) }); }
  catch (err) { next(err); }
});
router.delete('/api-keys/:id', async (req, res, next) => {
  try {
    await prisma.apiKey.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'API key deleted' });
  } catch (err) { next(err); }
});

/** Activity / API Logs */
router.get('/logs/activity', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) }); }
  catch (err) { next(err); }
});
router.get('/logs/api', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.apiLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) }); }
  catch (err) { next(err); }
});

/** System health */
router.get('/system/health', async (_req, res) => {
  res.json({
    success: true,
    data: {
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
  });
});

/** Cron job registry */
router.get('/cron-jobs', async (_req, res, next) => {
  try { res.json({ success: true, data: await prisma.cronJob.findMany() }); }
  catch (err) { next(err); }
});

/** Push / in-app notification dispatch */
router.post('/notifications/send', dispatch);

export default router;
