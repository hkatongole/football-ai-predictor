/**
 * MODEL 1 — Statistical Prediction Engine
 * ----------------------------------------
 * Uses team form, home/away splits, goals scored/conceded, and head-to-head
 * history to derive win/draw/loss probabilities via a weighted-strength model.
 *
 * Input shape (`TeamStats`):
 * {
 *   recentForm: ['W','D','L','W','W'],   // last 5 results, most recent last
 *   homeAdvantage: 1.15,                  // multiplier, computed from home/away goal ratios
 *   goalsScoredAvg: 1.8,
 *   goalsConcededAvg: 1.1,
 *   xGFor: 1.7,
 *   xGAgainst: 1.0,
 *   possessionAvg: 54,
 *   cornersAvg: 5.4,
 *   cardsAvg: 2.1,
 *   cleanSheetRate: 0.35,                 // 0..1
 * }
 */

const FORM_POINTS = { W: 3, D: 1, L: 0 };

function formScore(recentForm = []) {
  if (!recentForm.length) return 1.5; // neutral
  const total = recentForm.reduce((sum, r, i) => {
    // more recent results weighted higher (recency weighting)
    const weight = 1 + i * 0.15;
    return sum + FORM_POINTS[r] * weight;
  }, 0);
  const maxPossible = recentForm.reduce((sum, _r, i) => sum + 3 * (1 + i * 0.15), 0);
  return (total / maxPossible) * 3; // normalize back to a 0-3 scale
}

function attackStrength(stats) {
  return (stats.goalsScoredAvg * 0.5 + stats.xGFor * 0.5) * (1 + (stats.possessionAvg - 50) / 200);
}

function defenseWeakness(stats) {
  return stats.goalsConcededAvg * 0.5 + stats.xGAgainst * 0.5 - stats.cleanSheetRate * 0.5;
}

/**
 * Computes a single team's overall "power rating" from its stats.
 */
function teamPower(stats, isHome) {
  const form = formScore(stats.recentForm);
  const attack = attackStrength(stats);
  const defense = Math.max(0.2, defenseWeakness(stats));
  const homeBonus = isHome ? stats.homeAdvantage || 1.1 : 1;

  // Higher attack & form, lower defensive weakness => higher power
  return (form * 1.2 + attack * 2 - defense * 1.5) * homeBonus;
}

/**
 * Applies head-to-head history as a small adjustment (-0.3 .. +0.3)
 */
function h2hAdjustment(h2h = []) {
  if (!h2h.length) return 0;
  const homeWins = h2h.filter((m) => m.result === 'HOME').length;
  const awayWins = h2h.filter((m) => m.result === 'AWAY').length;
  const diff = (homeWins - awayWins) / h2h.length;
  return diff * 0.3;
}

/**
 * Converts raw power ratings into normalized win/draw/loss probabilities
 * using a softmax-like distribution, with draw probability derived from
 * how close the two powers are (closer teams => higher draw chance).
 */
export function predictStatistical(homeStats, awayStats, h2h = []) {
  const homePower = teamPower(homeStats, true) + h2hAdjustment(h2h);
  const awayPower = teamPower(awayStats, false) - h2hAdjustment(h2h);

  const gap = homePower - awayPower;
  const closeness = 1 / (1 + Math.abs(gap)); // 0..1, 1 = very close match

  // Base draw probability scales with closeness of the two sides
  const drawProb = 0.22 + closeness * 0.15;

  const remaining = 1 - drawProb;
  const expHome = Math.exp(homePower);
  const expAway = Math.exp(awayPower);
  const homeShare = expHome / (expHome + expAway);

  const homeWinProb = +(remaining * homeShare).toFixed(3);
  const awayWinProb = +(remaining * (1 - homeShare)).toFixed(3);
  const draw = +(1 - homeWinProb - awayWinProb).toFixed(3);

  const confidence = +(Math.max(homeWinProb, draw, awayWinProb) * 100).toFixed(1);

  return {
    engine: 'STATISTICAL',
    homeWinProb,
    drawProb: draw,
    awayWinProb,
    confidence,
    factors: {
      homePower: +homePower.toFixed(2),
      awayPower: +awayPower.toFixed(2),
      formHome: +formScore(homeStats.recentForm).toFixed(2),
      formAway: +formScore(awayStats.recentForm).toFixed(2),
      h2hAdjustment: +h2hAdjustment(h2h).toFixed(2),
    },
  };
}
