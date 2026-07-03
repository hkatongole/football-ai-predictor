import axios from 'axios';
import { cached } from '../config/redis.js';

const client = axios.create({
  baseURL: process.env.SOCCERDATA_API_BASE,
  timeout: 15000,
  headers: { Authorization: `Bearer ${process.env.SOCCERDATA_API_KEY}` },
});

// Simple retry wrapper for transient network/API errors
async function withRetry(fn, retries = 3, delayMs = 500) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

export const SoccerDataService = {
  async getLeagues() {
    return cached('sd:leagues', 3600, async () => {
      const { data } = await withRetry(() => client.get('/leagues'));
      return data;
    });
  },

  async getTeams(leagueExternalId) {
    return cached(`sd:teams:${leagueExternalId}`, 3600, async () => {
      const { data } = await withRetry(() => client.get(`/leagues/${leagueExternalId}/teams`));
      return data;
    });
  },

  async getFixtures(leagueExternalId, params = {}) {
    // Fixtures/results change frequently — short TTL
    const key = `sd:fixtures:${leagueExternalId}:${JSON.stringify(params)}`;
    return cached(key, 120, async () => {
      const { data } = await withRetry(() => client.get(`/leagues/${leagueExternalId}/fixtures`, { params }));
      return data;
    });
  },

  async getLiveScores() {
    // Live data must not be cached long
    const key = 'sd:live';
    return cached(key, 20, async () => {
      const { data } = await withRetry(() => client.get('/livescores'));
      return data;
    });
  },

  async getStandings(leagueExternalId) {
    return cached(`sd:standings:${leagueExternalId}`, 600, async () => {
      const { data } = await withRetry(() => client.get(`/leagues/${leagueExternalId}/standings`));
      return data;
    });
  },

  async getOdds(matchExternalId) {
    return cached(`sd:odds:${matchExternalId}`, 60, async () => {
      const { data } = await withRetry(() => client.get(`/fixtures/${matchExternalId}/odds`));
      return data;
    });
  },

  async getHeadToHead(teamAId, teamBId) {
    return cached(`sd:h2h:${teamAId}:${teamBId}`, 3600, async () => {
      const { data } = await withRetry(() => client.get('/head-to-head', { params: { teamA: teamAId, teamB: teamBId } }));
      return data;
    });
  },

  async getLineups(matchExternalId) {
    return cached(`sd:lineups:${matchExternalId}`, 60, async () => {
      const { data } = await withRetry(() => client.get(`/fixtures/${matchExternalId}/lineups`));
      return data;
    });
  },

  async getInjuries(teamExternalId) {
    return cached(`sd:injuries:${teamExternalId}`, 1800, async () => {
      const { data } = await withRetry(() => client.get(`/teams/${teamExternalId}/injuries`));
      return data;
    });
  },
};

export default SoccerDataService;
