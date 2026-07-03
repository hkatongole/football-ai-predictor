import { Router } from 'express';
import db from '../config/db.js';
import { mapTeamStats, mapPlayer, mapInjury, mapOdds } from '../utils/mappers.js';

const router = Router();

router.get('/stats', (req, res, next) => {
  try {
    const { team, league } = req.query;
    if (!team) return res.status(400).json({ success: false, message: 'team query param is required' });
    const row = db.prepare(`SELECT * FROM team_stats WHERE team = ? ${league ? 'AND league = ?' : ''} ORDER BY updated_at DESC LIMIT 1`)
      .get(...(league ? [team, league] : [team]));
    if (!row) return res.status(404).json({ success: false, message: 'No stats found for this team yet' });
    res.json({ success: true, data: mapTeamStats(row) });
  } catch (err) { next(err); }
});

router.get('/players', (req, res, next) => {
  try {
    const { team, page = 1, pageSize = 30 } = req.query;
    const where = team ? 'WHERE team = @team' : '';
    const total = db.prepare(`SELECT COUNT(*) as c FROM players ${where}`).get(team ? { team } : {}).c;
    const rows = db.prepare(`SELECT * FROM players ${where} ORDER BY goals DESC LIMIT @limit OFFSET @offset`)
      .all({ team, limit: Number(pageSize), offset: (Number(page) - 1) * Number(pageSize) });
    res.json({ success: true, total, data: rows.map(mapPlayer) });
  } catch (err) { next(err); }
});

router.get('/injuries', (req, res, next) => {
  try {
    const { team } = req.query;
    const rows = team
      ? db.prepare(`SELECT * FROM team_injuries WHERE club = ?`).all(team)
      : db.prepare(`SELECT * FROM team_injuries ORDER BY updated_at DESC LIMIT 50`).all();
    res.json({ success: true, count: rows.length, data: rows.map(mapInjury) });
  } catch (err) { next(err); }
});

router.get('/odds', (req, res, next) => {
  try {
    const { homeTeam, awayTeam, matchDate } = req.query;
    if (!homeTeam || !awayTeam) return res.status(400).json({ success: false, message: 'homeTeam and awayTeam are required' });
    const row = db.prepare(`SELECT * FROM match_odds WHERE home_team = ? AND away_team = ? ${matchDate ? 'AND match_date = ?' : ''} ORDER BY updated_at DESC LIMIT 1`)
      .get(...(matchDate ? [homeTeam, awayTeam, matchDate] : [homeTeam, awayTeam]));
    if (!row) return res.status(404).json({ success: false, message: 'No odds found for this fixture' });
    res.json({ success: true, data: mapOdds(row) });
  } catch (err) { next(err); }
});

/** Aggregate model accuracy from graded predictions — powers the Admin analytics + AI Confidence Meter. */
router.get('/model-accuracy', (_req, res, next) => {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*) as graded,
        SUM(dc_correct) as dc_correct,
        SUM(ml_correct) as ml_correct,
        SUM(legacy_correct) as legacy_correct,
        SUM(consensus_correct) as consensus_correct
      FROM prediction_log WHERE status = 'graded'
    `).get();

    const pct = (n) => (row.graded ? +((n / row.graded) * 100).toFixed(1) : null);
    res.json({
      success: true,
      data: {
        gradedPredictions: row.graded,
        dixonColesAccuracy: pct(row.dc_correct),
        mlAccuracy: pct(row.ml_correct),
        legacyAccuracy: pct(row.legacy_correct),
        consensusAccuracy: pct(row.consensus_correct),
      },
    });
  } catch (err) { next(err); }
});

export default router;
