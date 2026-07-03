import prisma from '../config/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { predictStatistical } from '../prediction/statisticalEngine.js';
import { predictML } from '../prediction/mlEngine.js';
import { predictHybrid } from '../prediction/hybridEngine.js';
import { buildTeamStats, getHeadToHead, getEloRatings, buildContext } from '../services/statsBuilderService.js';

/**
 * GET /api/v1/predictions/:matchId
 * Runs all three engines for a match and returns a unified response.
 * Premium predictions are blurred for non-premium users (handled client-side
 * via `isPremium` flag + partial response for anonymous/free users below).
 */
export async function getMatchPredictions(req, res, next) {
  try {
    const matchId = Number(req.params.matchId);
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: true, awayTeam: true, league: true },
    });
    if (!match) throw new ApiError(404, 'Match not found');

    const [homeStats, awayStats, h2h, elo] = await Promise.all([
      buildTeamStats(match.homeTeamId),
      buildTeamStats(match.awayTeamId),
      getHeadToHead(match.homeTeamId, match.awayTeamId),
      getEloRatings(match.homeTeamId, match.awayTeamId),
    ]);
    const context = await buildContext(match);

    const statistical = predictStatistical(homeStats, awayStats, h2h);
    const ml = predictML({ home: homeStats, away: awayStats, elo, h2h });
    const hybrid = predictHybrid({ home: homeStats, away: awayStats, elo, h2h, context });

    const isPremiumUser = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN' || req.user?.isPremium;
    const responsePayload = {
      match: {
        id: match.id,
        league: match.league.name,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        kickoff: match.kickoff,
        status: match.status,
      },
      statistical,
      machineLearning: ml,
      // Hybrid = flagship "premium" output; free users get win/draw/loss only
      hybrid: isPremiumUser ? hybrid : {
        homeWinProb: hybrid.homeWinProb,
        drawProb: hybrid.drawProb,
        awayWinProb: hybrid.awayWinProb,
        confidence: hybrid.confidence,
        locked: true,
        message: 'Upgrade to Premium to unlock full AI Hybrid analysis (correct score, risk rating, recommended bet, reasoning).',
      },
    };

    res.json({ success: true, data: responsePayload });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/predictions/today
 */
export async function getTodayPredictions(req, res, next) {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const matches = await prisma.match.findMany({
      where: { kickoff: { gte: start, lte: end } },
      include: { homeTeam: true, awayTeam: true, league: true },
      orderBy: { kickoff: 'asc' },
      take: 50,
    });

    res.json({ success: true, count: matches.length, data: matches });
  } catch (err) {
    next(err);
  }
}
