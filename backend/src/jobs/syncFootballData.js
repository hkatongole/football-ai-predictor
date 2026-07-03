import cron from 'node-cron';
import prisma from '../config/prisma.js';
import SoccerDataService from '../services/soccerDataService.js';

/**
 * Syncs leagues + teams (slow-changing data). Runs daily at 03:00.
 */
async function syncLeaguesAndTeams() {
  const leagues = await SoccerDataService.getLeagues();
  for (const l of leagues) {
    const league = await prisma.league.upsert({
      where: { externalId: String(l.id) },
      update: { name: l.name, logoUrl: l.logo, season: l.season, isWomens: !!l.isWomens },
      create: {
        externalId: String(l.id),
        name: l.name,
        logoUrl: l.logo,
        season: l.season,
        isWomens: !!l.isWomens,
        type: l.type || 'league',
      },
    });

    const teams = await SoccerDataService.getTeams(l.id);
    for (const t of teams) {
      await prisma.team.upsert({
        where: { externalId: String(t.id) },
        update: { name: t.name, logoUrl: t.logo, leagueId: league.id },
        create: {
          externalId: String(t.id),
          name: t.name,
          shortName: t.shortName,
          logoUrl: t.logo,
          venue: t.venue,
          founded: t.founded,
          leagueId: league.id,
        },
      });
    }
  }
  console.log(`[sync] leagues+teams synced: ${leagues.length} leagues`);
}

/**
 * Syncs fixtures/results for active leagues. Runs every 10 minutes.
 */
async function syncFixtures() {
  const leagues = await prisma.league.findMany({ where: { isActive: true } });
  for (const league of leagues) {
    const fixtures = await SoccerDataService.getFixtures(league.externalId);
    for (const f of fixtures) {
      const homeTeam = await prisma.team.findUnique({ where: { externalId: String(f.homeTeamId) } });
      const awayTeam = await prisma.team.findUnique({ where: { externalId: String(f.awayTeamId) } });
      if (!homeTeam || !awayTeam) continue;

      await prisma.match.upsert({
        where: { externalId: String(f.id) },
        update: {
          status: mapStatus(f.status),
          minute: f.minute,
          homeScore: f.homeScore,
          awayScore: f.awayScore,
          statsJson: f.stats || undefined,
        },
        create: {
          externalId: String(f.id),
          leagueId: league.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoff: new Date(f.kickoff),
          status: mapStatus(f.status),
          venue: f.venue,
        },
      });
    }
  }
  console.log('[sync] fixtures synced');
}

/**
 * Syncs live scores only, for leagues with matches currently in play. Runs every 30s.
 */
async function syncLiveScores() {
  const live = await SoccerDataService.getLiveScores();
  for (const m of live) {
    await prisma.match.updateMany({
      where: { externalId: String(m.id) },
      data: { status: 'LIVE', minute: m.minute, homeScore: m.homeScore, awayScore: m.awayScore },
    });
  }
}

function mapStatus(raw) {
  const map = {
    NS: 'SCHEDULED', LIVE: 'LIVE', HT: 'HALF_TIME', FT: 'FINISHED',
    PST: 'POSTPONED', CANC: 'CANCELLED',
  };
  return map[raw] || 'SCHEDULED';
}

export function scheduleFootballDataJobs() {
  cron.schedule('0 3 * * *', () => syncLeaguesAndTeams().catch((e) => console.error('[sync:leagues]', e)));
  cron.schedule('*/10 * * * *', () => syncFixtures().catch((e) => console.error('[sync:fixtures]', e)));
  cron.schedule('*/30 * * * * *', () => syncLiveScores().catch((e) => console.error('[sync:live]', e)));
  console.log('[jobs] football data sync jobs scheduled');
}

export default { syncLeaguesAndTeams, syncFixtures, syncLiveScores, scheduleFootballDataJobs };
