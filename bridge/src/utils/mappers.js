import { buildOverUnderMarket, estimateBTTS } from '../utils/poisson.js';

/**
 * Derives a football-ai-predictor-style match status from PlusOne's raw
 * match row (PlusOne doesn't store a status enum — it stores scores which
 * are null until the match is played).
 */
function deriveStatus(row) {
  const now = new Date();
  const kickoff = row.start_time ? new Date(`${row.match_date}T${row.start_time}`) : new Date(row.match_date);
  const hasScore = row.home_score !== null && row.away_score !== null;

  if (hasScore) return 'FINISHED';
  if (kickoff > now) return 'SCHEDULED';
  // Kickoff time has passed but no score recorded yet — best-effort "LIVE" guess
  if (now - kickoff < 3 * 60 * 60 * 1000) return 'LIVE';
  return 'SCHEDULED';
}

/** Maps a PlusOne `matches` row into the MatchCard/MatchDetail-friendly shape. */
export function mapMatch(row) {
  const kickoff = row.start_time ? `${row.match_date}T${row.start_time}` : row.match_date;
  return {
    id: row.id,
    league: { name: row.league },
    homeTeam: { name: row.home_team, logoUrl: null },
    awayTeam: { name: row.away_team, logoUrl: null },
    kickoff,
    status: deriveStatus(row),
    homeScore: row.home_score,
    awayScore: row.away_score,
    homeXg: row.home_xg,
    awayXg: row.away_xg,
    season: row.season,
    gameweek: row.gameweek,
  };
}

/**
 * Maps a PlusOne `prediction_log` row into the three-engine shape
 * football-ai-predictor's MatchDetail.jsx already renders.
 *
 *   statistical    <- PlusOne's "Legacy" heuristic engine
 *   machineLearning <- PlusOne's ML engine + a reconstructed Poisson over/under
 *   hybrid          <- PlusOne's Consensus engine (blend of DC + ML + Legacy)
 */
export function mapPrediction(row, { isPremiumUser = false } = {}) {
  if (!row) return null;

  const dcHomeXg = row.dc_expected_home ?? 1.3;
  const dcAwayXg = row.dc_expected_away ?? 1.1;
  const overUnder = buildOverUnderMarket(dcHomeXg + dcAwayXg);
  const bttsProb = estimateBTTS(dcHomeXg, dcAwayXg);

  const statistical = {
    engine: 'LEGACY_HEURISTIC', // PlusOne's rules-based engine — shown as "Statistical" in the UI
    homeWinProb: row.legacy_home_prob,
    drawProb: row.legacy_draw_prob,
    awayWinProb: row.legacy_away_prob,
    confidence: +(Math.max(row.legacy_home_prob, row.legacy_draw_prob, row.legacy_away_prob) * 100).toFixed(1),
    factors: {
      h2hHomeRate: row.h2h_home_rate,
      h2hTotal: row.h2h_total,
      h2hAvgGoals: row.h2h_avg_goals,
    },
  };

  const machineLearning = {
    engine: 'PLUSONE_ML',
    homeWinProb: row.ml_home_prob,
    drawProb: row.ml_draw_prob,
    awayWinProb: row.ml_away_prob,
    confidence: +(Math.max(row.ml_home_prob, row.ml_draw_prob, row.ml_away_prob) * 100).toFixed(1),
    bttsProb,
    overUnder,
    modelAccuracy: null, // computable from prediction_log.ml_correct aggregate — see /api/v1/stats/model-accuracy
  };

  const dcSummary = {
    outcome: row.dc_outcome,
    homeWinProb: row.dc_home_prob,
    drawProb: row.dc_draw_prob,
    awayWinProb: row.dc_away_prob,
    expectedGoals: { home: dcHomeXg, away: dcAwayXg },
  };

  const scorelines = [
    row.score_pred_1 ? { score: row.score_pred_1, probability: row.score_prob_1 } : null,
    row.score_pred_2 ? { score: row.score_pred_2, probability: row.score_prob_2 } : null,
    row.score_pred_3 ? { score: row.score_pred_3, probability: row.score_prob_3 } : null,
  ].filter(Boolean);

  const topScore = scorelines[0] ? { home: Number(scorelines[0].score.split('-')[0]), away: Number(scorelines[0].score.split('-')[1]), probability: scorelines[0].probability } : null;

  const confidence = +(Math.max(row.consensus_home_prob, row.consensus_draw_prob, row.consensus_away_prob) * 100).toFixed(1);

  const hybridFull = {
    engine: 'PLUSONE_CONSENSUS',
    homeWinProb: row.consensus_home_prob,
    drawProb: row.consensus_draw_prob,
    awayWinProb: row.consensus_away_prob,
    confidence,
    riskRating: row.confidence, // PlusOne already labels this Low/Medium/High-style via its own `confidence` column
    recommendedBet: row.best_bet_outcome,
    secondBestBet: row.second_best_bet_outcome,
    correctScore: topScore,
    scorelineCandidates: scorelines,
    btts: bttsProb >= 0.5,
    overUnder,
    engineAgreement: row.engine_agreement,
    valueGap: { home: row.value_gap_home, draw: row.value_gap_draw, away: row.value_gap_away },
    calibratedProbability: row.calibrated_prob,
    reasoning: buildReasoning(row, confidence),
    dixonColes: dcSummary,
  };

  const hybrid = isPremiumUser ? hybridFull : {
    homeWinProb: hybridFull.homeWinProb,
    drawProb: hybridFull.drawProb,
    awayWinProb: hybridFull.awayWinProb,
    confidence: hybridFull.confidence,
    locked: true,
    message: 'Upgrade to Premium to unlock the full Consensus breakdown (scorelines, recommended bet, value gaps, reasoning).',
  };

  return { statistical, machineLearning, hybrid };
}

function buildReasoning(row, confidence) {
  const parts = [];
  parts.push(`Engine agreement: ${row.engine_agreement || 'unknown'} (Dixon-Coles, ML, and Legacy engines ${row.engine_agreement === 'full' ? 'all agree' : 'partially disagree'}).`);
  if (row.h2h_total) {
    parts.push(`Head-to-head: ${row.h2h_home_wins}W-${row.h2h_draws}D-${row.h2h_away_wins}L over last ${row.h2h_total} meetings (home win rate ${(row.h2h_home_rate * 100).toFixed(0)}%).`);
  }
  if (row.best_bet_outcome) parts.push(`Recommended market: ${row.best_bet_outcome}.`);
  parts.push(`Overall consensus confidence: ${confidence}% (${row.confidence || 'n/a'}).`);
  return parts.join(' ');
}

/** Maps a PlusOne `team_stats` row into a flat stats object. */
export function mapTeamStats(row) {
  if (!row) return null;
  return {
    team: row.team,
    league: row.league,
    season: row.season,
    goalsScoredAvg: row.goals_per_game,
    goalsConcededAvg: row.conceded_per_game,
    formScore: row.form_score,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    played: row.games_played,
    points: row.points,
    winRate: row.win_rate,
    possessionAvg: row.possession_avg,
    xGFor: row.xg_per_game,
    xGAgainst: row.xg_against_pg,
    cleanSheets: row.clean_sheets,
  };
}

export function mapPlayer(row) {
  return {
    id: row.id,
    name: row.player,
    team: row.team,
    league: row.league,
    position: row.position,
    nationality: row.nationality,
    age: row.age,
    goals: row.goals,
    assists: row.assists,
    goalsPer90: row.goals_per90,
    assistsPer90: row.assists_per90,
    minutes: row.minutes,
  };
}

export function mapInjury(row) {
  return {
    team: row.club,
    player: row.player,
    position: row.position,
    injury: row.injury,
    returnDate: row.return_date,
    marketValue: row.market_value,
    updatedAt: row.updated_at,
  };
}

export function mapOdds(row) {
  return {
    matchDate: row.match_date,
    league: row.league,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    bookmaker: {
      b365: [row.b365_home, row.b365_draw, row.b365_away],
      pinnacle: [row.pinnacle_home, row.pinnacle_draw, row.pinnacle_away],
    },
    average: [row.avg_home, row.avg_draw, row.avg_away],
    max: [row.max_home, row.max_draw, row.max_away],
    overUnder25: { b365: [row.b365_over25, row.b365_under25], average: [row.avg_over25, row.avg_under25] },
    asianHandicap: { line: row.ah_line, b365: [row.b365_ah_home, row.b365_ah_away], average: [row.avg_ah_home, row.avg_ah_away] },
  };
}
