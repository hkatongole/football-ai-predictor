import { predictStatistical } from '../statisticalEngine.js';
import { predictML } from '../mlEngine.js';
import { predictHybrid, eloExpectedScore, correctScoreMatrix } from '../hybridEngine.js';

const strongHome = {
  recentForm: ['W', 'W', 'W', 'D', 'W'],
  homeAdvantage: 1.15,
  goalsScoredAvg: 2.1,
  goalsConcededAvg: 0.8,
  xGFor: 2.0,
  xGAgainst: 0.9,
  possessionAvg: 58,
  cornersAvg: 6.1,
  cardsAvg: 1.8,
  cleanSheetRate: 0.5,
};

const weakAway = {
  recentForm: ['L', 'D', 'L', 'L', 'W'],
  homeAdvantage: 1.0,
  goalsScoredAvg: 0.9,
  goalsConcededAvg: 1.8,
  xGFor: 0.8,
  xGAgainst: 1.7,
  possessionAvg: 42,
  cornersAvg: 3.9,
  cardsAvg: 2.4,
  cleanSheetRate: 0.15,
};

describe('Statistical Engine', () => {
  it('probabilities sum to ~1 and favor the stronger home side', () => {
    const result = predictStatistical(strongHome, weakAway, []);
    const sum = result.homeWinProb + result.drawProb + result.awayWinProb;
    expect(sum).toBeCloseTo(1, 1);
    expect(result.homeWinProb).toBeGreaterThan(result.awayWinProb);
  });
});

describe('ML Engine', () => {
  it('returns valid probability distribution and over/under market', () => {
    const result = predictML({ home: strongHome, away: weakAway, elo: { home: 1650, away: 1480 }, h2h: [] });
    const sum = result.homeWinProb + result.drawProb + result.awayWinProb;
    expect(sum).toBeCloseTo(1, 1);
    expect(result.overUnder['2.5']).toHaveProperty('over');
    expect(result.overUnder['2.5']).toHaveProperty('under');
  });
});

describe('Hybrid AI Engine', () => {
  it('blends sub-engines and produces a correct score + recommended bet', () => {
    const result = predictHybrid({
      home: strongHome, away: weakAway, elo: { home: 1650, away: 1480 }, h2h: [],
      context: { momentum: 0.2, homeInjuriesImpact: 0, awayInjuriesImpact: 0.4, weatherImpact: 0 },
    });
    expect(result.homeWinProb + result.drawProb + result.awayWinProb).toBeCloseTo(1, 1);
    expect(result.correctScore).toHaveProperty('home');
    expect(result.correctScore).toHaveProperty('away');
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskRating);
    expect(typeof result.recommendedBet).toBe('string');
  });
});

describe('ELO helpers', () => {
  it('expected score is between 0 and 1', () => {
    const e = eloExpectedScore(1600, 1500);
    expect(e).toBeGreaterThan(0.5);
    expect(e).toBeLessThan(1);
  });

  it('correct score matrix rows sum close to total probability mass', () => {
    const matrix = correctScoreMatrix(1.5, 1.1);
    const total = matrix.flat().reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0.8); // most mass captured within 0-6 goals
  });
});
