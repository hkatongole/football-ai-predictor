/**
 * MODEL 3 — AI Hybrid Prediction Engine
 * ----------------------------------------
 * Combines the Statistical Engine, ML Engine, ELO ratings, and a Poisson
 * goal-distribution model into a single blended prediction with a
 * correct-score matrix, risk rating, and recommended bet.
 */

import { predictStatistical } from './statisticalEngine.js';
import { predictML } from './mlEngine.js';

const K_FACTOR = 32;

/** Standard ELO expected-score formula */
export function eloExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/** Updates ELO ratings after a result. result: 1 = A win, 0.5 = draw, 0 = A loss */
export function updateElo(ratingA, ratingB, result) {
  const expectedA = eloExpectedScore(ratingA, ratingB);
  const newA = ratingA + K_FACTOR * (result - expectedA);
  const newB = ratingB + K_FACTOR * ((1 - result) - (1 - expectedA));
  return { newA: +newA.toFixed(1), newB: +newB.toFixed(1) };
}

function poissonPMF(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * Builds a correct-score probability matrix (0-6 goals each side) using
 * independent Poisson distributions for home/away expected goals.
 */
export function correctScoreMatrix(homeXg, awayXg, maxGoals = 6) {
  const matrix = [];
  for (let h = 0; h <= maxGoals; h++) {
    const row = [];
    for (let a = 0; a <= maxGoals; a++) {
      row.push(+(poissonPMF(homeXg, h) * poissonPMF(awayXg, a)).toFixed(4));
    }
    matrix.push(row);
  }
  return matrix;
}

function mostLikelyScore(matrix) {
  let best = { home: 0, away: 0, prob: 0 };
  matrix.forEach((row, h) => row.forEach((p, a) => {
    if (p > best.prob) best = { home: h, away: a, prob: p };
  }));
  return best;
}

function riskRating(confidence) {
  if (confidence >= 70) return 'LOW';
  if (confidence >= 50) return 'MEDIUM';
  return 'HIGH';
}

function recommendedBet({ homeWinProb, drawProb, awayWinProb, bttsProb, overUnder }) {
  const candidates = [
    { label: 'Home Win', prob: homeWinProb },
    { label: 'Draw', prob: drawProb },
    { label: 'Away Win', prob: awayWinProb },
    { label: 'Both Teams to Score', prob: bttsProb },
    { label: 'Over 2.5 Goals', prob: overUnder?.[2.5]?.over ?? 0 },
    { label: 'Under 2.5 Goals', prob: overUnder?.[2.5]?.under ?? 0 },
  ];
  return candidates.sort((a, b) => b.prob - a.prob)[0];
}

/**
 * Main hybrid prediction: weighted blend of statistical + ML outputs,
 * adjusted by ELO gap, momentum, and player availability, with a
 * Poisson-derived correct score.
 *
 * @param {object} params
 * @param {object} params.home        team stats (see statisticalEngine.js)
 * @param {object} params.away        team stats
 * @param {object} params.elo         { home, away } ELO ratings
 * @param {array}  params.h2h         head-to-head history
 * @param {object} [params.context]   { momentum: -1..1, injuriesImpact: 0..1 (home key/away key),
 *                                       weatherImpact: 0..1, leagueStrength: 0..1 }
 */
export function predictHybrid({ home, away, elo, h2h = [], context = {} }) {
  const stat = predictStatistical(home, away, h2h);
  const ml = predictML({ home, away, elo, h2h });

  const eloHomeProb = eloExpectedScore(elo.home + 65, elo.away); // +65 = home advantage in ELO terms

  // Weighted blend: 35% statistical, 40% ML, 25% ELO
  let homeWinProb = stat.homeWinProb * 0.35 + ml.homeWinProb * 0.4 + eloHomeProb * 0.25;
  let awayWinProb = stat.awayWinProb * 0.35 + ml.awayWinProb * 0.4 + (1 - eloHomeProb) * 0.25 * 0.9;
  let drawProb = 1 - homeWinProb - awayWinProb;

  // Contextual adjustments (momentum, injuries, weather) — small nudges, capped
  const momentum = clamp(context.momentum || 0, -1, 1) * 0.03;
  const injuryHome = clamp(context.homeInjuriesImpact || 0, 0, 1) * -0.05;
  const injuryAway = clamp(context.awayInjuriesImpact || 0, 0, 1) * -0.05;
  const weather = clamp(context.weatherImpact || 0, 0, 1) * -0.02; // adverse weather reduces high-scoring favorite edge

  homeWinProb += momentum + injuryHome - injuryAway + weather;
  awayWinProb -= momentum + injuryHome - injuryAway - weather;

  // Renormalize to sum to 1
  const total = homeWinProb + drawProb + awayWinProb;
  homeWinProb = clamp(homeWinProb / total, 0.02, 0.96);
  awayWinProb = clamp(awayWinProb / total, 0.02, 0.96);
  drawProb = clamp(1 - homeWinProb - awayWinProb, 0.02, 0.9);

  const homeXg = (home.xGFor + away.xGAgainst) / 2 * (1 + momentum);
  const awayXg = (away.xGFor + home.xGAgainst) / 2 * (1 - momentum);

  const matrix = correctScoreMatrix(Math.max(0.3, homeXg), Math.max(0.3, awayXg));
  const topScore = mostLikelyScore(matrix);

  const confidence = +(Math.max(homeWinProb, drawProb, awayWinProb) * 100).toFixed(1);
  const marketPick = recommendedBet({
    homeWinProb, drawProb, awayWinProb, bttsProb: ml.bttsProb, overUnder: ml.overUnder,
  });

  const reasoning = buildReasoning({ stat, ml, elo, context, confidence, topScore });

  return {
    engine: 'HYBRID_AI',
    homeWinProb: +homeWinProb.toFixed(3),
    drawProb: +drawProb.toFixed(3),
    awayWinProb: +awayWinProb.toFixed(3),
    expectedGoals: { home: +homeXg.toFixed(2), away: +awayXg.toFixed(2) },
    correctScore: { home: topScore.home, away: topScore.away, probability: topScore.prob },
    btts: ml.bttsProb >= 0.5,
    overUnder: ml.overUnder,
    confidence,
    riskRating: riskRating(confidence),
    recommendedBet: marketPick.label,
    reasoning,
    subEngineOutputs: { statistical: stat, machineLearning: ml },
  };
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function buildReasoning({ stat, ml, elo, context, confidence, topScore }) {
  const parts = [];
  parts.push(`Statistical model favors ${stat.homeWinProb > stat.awayWinProb ? 'home' : 'away'} side (form + attack/defense balance).`);
  parts.push(`ML classifier agrees with ${(Math.max(ml.homeWinProb, ml.drawProb, ml.awayWinProb) * 100).toFixed(0)}% confidence.`);
  parts.push(`ELO gap: ${Math.round(elo.home - elo.away)} points in favor of ${elo.home >= elo.away ? 'home' : 'away'}.`);
  if (context.momentum) parts.push(`Recent momentum ${context.momentum > 0 ? 'favors home' : 'favors away'} side.`);
  if (context.homeInjuriesImpact || context.awayInjuriesImpact) parts.push('Key player availability factored into adjustment.');
  parts.push(`Most probable scoreline: ${topScore.home}-${topScore.away} (${(topScore.prob * 100).toFixed(1)}%).`);
  parts.push(`Overall model confidence: ${confidence}%.`);
  return parts.join(' ');
}
