import { Router } from 'express';
import db from '../config/db.js';
import { mapMatch, mapPrediction } from '../utils/mappers.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

/**
 * GET /predictions/today
 * Joins matches (today) with prediction_log to return match + all-engines summary.
 */
router.get('/today', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT m.id as match_id, m.home_team, m.away_team, m.league, m.match_date, m.start_time,
             p.consensus_home_prob, p.consensus_draw_prob, p.consensus_away_prob, p.confidence
      FROM matches m
      LEFT JOIN prediction_log p ON p.match_id = m.id
      WHERE date(m.match_date) = date('now')
      ORDER BY m.match_date ASC
      LIMIT 50
    `).all();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { next(err); }
});

/**
 * GET /predictions/:matchId
 * Full three-engine breakdown for a single match, mapped from PlusOne's prediction_log.
 */
router.get('/:matchId', optionalAuth, (req, res, next) => {
  try {
    const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(req.params.matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const predictionRow = db.prepare(`SELECT * FROM prediction_log WHERE match_id = ? ORDER BY predicted_at DESC LIMIT 1`).get(req.params.matchId);
    if (!predictionRow) {
      return res.json({
        success: true,
        data: { match: mapMatch(match), statistical: null, machineLearning: null, hybrid: null, message: 'PlusOne has not generated a prediction for this match yet.' },
      });
    }

    // req.user is populated by the SAME auth middleware football-ai-predictor's backend already
    // uses (JWT), reused here unchanged — see src/middleware/auth.js
    const isPremiumUser = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN' || req.user?.isPremium;
    const engines = mapPrediction(predictionRow, { isPremiumUser });

    res.json({ success: true, data: { match: mapMatch(match), ...engines } });
  } catch (err) { next(err); }
});

export default router;
