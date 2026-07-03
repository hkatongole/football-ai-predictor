import prisma from '../config/prisma.js';

/**
 * Builds the `TeamStats` shape consumed by the prediction engines from a
 * team's last 10 finished matches stored in the database.
 */
export async function buildTeamStats(teamId) {
  const recentMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { kickoff: 'desc' },
    take: 10,
    include: { homeTeam: true, awayTeam: true },
  });

  if (!recentMatches.length) {
    // Neutral defaults for teams with no history yet (new to platform)
    return {
      recentForm: ['D', 'D', 'D', 'D', 'D'],
      homeAdvantage: 1.1,
      goalsScoredAvg: 1.2,
      goalsConcededAvg: 1.2,
      xGFor: 1.2,
      xGAgainst: 1.2,
      possessionAvg: 50,
      cornersAvg: 5,
      cardsAvg: 2,
      cleanSheetRate: 0.25,
    };
  }

  let scored = 0, conceded = 0, xgFor = 0, xgAgainst = 0, possession = 0, cleanSheets = 0;
  const recentForm = [];

  for (const m of recentMatches.slice(0, 5).reverse()) {
    const isHome = m.homeTeamId === teamId;
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    if (gf > ga) recentForm.push('W'); else if (gf === ga) recentForm.push('D'); else recentForm.push('L');
  }

  for (const m of recentMatches) {
    const isHome = m.homeTeamId === teamId;
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    scored += gf ?? 0;
    conceded += ga ?? 0;
    xgFor += isHome ? (m.homeXg ?? gf ?? 1) : (m.awayXg ?? gf ?? 1);
    xgAgainst += isHome ? (m.awayXg ?? ga ?? 1) : (m.homeXg ?? ga ?? 1);
    if ((ga ?? 1) === 0) cleanSheets += 1;
    const stats = m.statsJson || {};
    possession += isHome ? (stats.homePossession ?? 50) : (stats.awayPossession ?? 50);
  }

  const n = recentMatches.length;
  return {
    recentForm,
    homeAdvantage: 1.1,
    goalsScoredAvg: +(scored / n).toFixed(2),
    goalsConcededAvg: +(conceded / n).toFixed(2),
    xGFor: +(xgFor / n).toFixed(2),
    xGAgainst: +(xgAgainst / n).toFixed(2),
    possessionAvg: +(possession / n).toFixed(1),
    cornersAvg: 5.2,
    cardsAvg: 2.1,
    cleanSheetRate: +(cleanSheets / n).toFixed(2),
  };
}

export async function getHeadToHead(teamAId, teamBId, limit = 10) {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      OR: [
        { homeTeamId: teamAId, awayTeamId: teamBId },
        { homeTeamId: teamBId, awayTeamId: teamAId },
      ],
    },
    orderBy: { kickoff: 'desc' },
    take: limit,
  });

  return matches.map((m) => {
    const homeWon = m.homeScore > m.awayScore;
    const draw = m.homeScore === m.awayScore;
    let result;
    if (draw) result = 'DRAW';
    else if ((m.homeTeamId === teamAId && homeWon) || (m.awayTeamId === teamAId && !homeWon)) result = 'HOME';
    else result = 'AWAY';
    return { matchId: m.id, result, homeScore: m.homeScore, awayScore: m.awayScore, date: m.kickoff };
  });
}

export async function getEloRatings(homeTeamId, awayTeamId) {
  const [home, away] = await Promise.all([
    prisma.team.findUnique({ where: { id: homeTeamId } }),
    prisma.team.findUnique({ where: { id: awayTeamId } }),
  ]);
  return { home: home?.eloRating ?? 1500, away: away?.eloRating ?? 1500 };
}

/** Contextual signals for the Hybrid engine: momentum, injuries, weather. */
export async function buildContext(match) {
  const injuredHome = await prisma.player.count({ where: { teamId: match.homeTeamId, isInjured: true } });
  const injuredAway = await prisma.player.count({ where: { teamId: match.awayTeamId, isInjured: true } });

  return {
    momentum: 0, // could be derived from last-3-match trend delta
    homeInjuriesImpact: Math.min(1, injuredHome / 5),
    awayInjuriesImpact: Math.min(1, injuredAway / 5),
    weatherImpact: match.weather === 'HEAVY_RAIN' || match.weather === 'SNOW' ? 0.6 : 0,
    leagueStrength: 0.5,
  };
}
