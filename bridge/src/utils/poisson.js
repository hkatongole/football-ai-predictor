/**
 * Pure Poisson goal-distribution math, carried over unchanged from
 * football-ai-predictor/backend/src/prediction/hybridEngine.js.
 * Used to reconstruct an Over/Under market from PlusOne's dc_expected_home /
 * dc_expected_away (Dixon-Coles expected goals) since PlusOne's prediction_log
 * doesn't store an over/under table directly.
 */

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

export function poissonPMF(lambda, k) {
  if (lambda <= 0) lambda = 0.05;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function buildOverUnderMarket(totalGoalsExpected) {
  const lines = [0.5, 1.5, 2.5, 3.5];
  const result = {};
  for (const line of lines) {
    const maxK = Math.floor(line);
    let pUnder = 0;
    for (let k = 0; k <= maxK; k++) pUnder += poissonPMF(totalGoalsExpected, k);
    result[line] = { over: +(1 - pUnder).toFixed(3), under: +pUnder.toFixed(3) };
  }
  return result;
}

export function estimateBTTS(homeXg, awayXg) {
  const pHomeScores = 1 - poissonPMF(homeXg, 0);
  const pAwayScores = 1 - poissonPMF(awayXg, 0);
  return +(pHomeScores * pAwayScores).toFixed(3);
}
