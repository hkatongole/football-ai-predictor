import { Router } from 'express';
import prisma from '../config/prisma.js';
import { cached } from '../config/redis.js';

const router = Router();

router.get('/live', async (_req, res, next) => {
  try {
    const matches = await cached('matches:live', 15, () =>
      prisma.match.findMany({
        where: { status: 'LIVE' },
        include: { homeTeam: true, awayTeam: true, league: true },
      }));
    res.json({ success: true, count: matches.length, data: matches });
  } catch (err) { next(err); }
});

router.get('/upcoming', async (_req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      where: { status: 'SCHEDULED', kickoff: { gte: new Date() } },
      include: { homeTeam: true, awayTeam: true, league: true },
      orderBy: { kickoff: 'asc' },
      take: 30,
    });
    res.json({ success: true, count: matches.length, data: matches });
  } catch (err) { next(err); }
});

// Paginated listing with search — used by "Search" feature (team / league / country / season)
router.get('/', async (req, res, next) => {
  try {
    const { q, leagueId, page = 1, pageSize = 20 } = req.query;
    const where = {
      ...(leagueId ? { leagueId: Number(leagueId) } : {}),
      ...(q ? {
        OR: [
          { homeTeam: { name: { contains: q } } },
          { awayTeam: { name: { contains: q } } },
          { league: { name: { contains: q } } },
        ],
      } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        include: { homeTeam: true, awayTeam: true, league: true },
        orderBy: { kickoff: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
    ]);
    res.json({ success: true, total, page: Number(page), pageSize: Number(pageSize), data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: Number(req.params.id) },
      include: { homeTeam: true, awayTeam: true, league: true, predictions: { include: { model: true } } },
    });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (err) { next(err); }
});

export default router;
