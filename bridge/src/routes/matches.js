import { Router } from 'express';
import db from '../config/db.js';
import { mapMatch } from '../utils/mappers.js';

const router = Router();

const baseSelect = `SELECT id, home_team, away_team, league, season, match_date, gameweek, start_time, home_score, away_score, home_xg, away_xg FROM matches`;

router.get('/live', (_req, res, next) => {
  try {
    // No explicit status column in PlusOne — approximate "live" as kickoff within the last 3h with no score yet.
    const rows = db.prepare(`${baseSelect} WHERE home_score IS NULL AND datetime(match_date) <= datetime('now') AND datetime(match_date) >= datetime('now', '-3 hours')`).all();
    const data = rows.map(mapMatch);
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
});

router.get('/upcoming', (_req, res, next) => {
  try {
    const rows = db.prepare(`${baseSelect} WHERE home_score IS NULL AND datetime(match_date) > datetime('now') ORDER BY match_date ASC LIMIT 30`).all();
    res.json({ success: true, count: rows.length, data: rows.map(mapMatch) });
  } catch (err) { next(err); }
});

router.get('/', (req, res, next) => {
  try {
    const { q, league, page = 1, pageSize = 20 } = req.query;
    const clauses = [];
    const params = {};
    if (q) { clauses.push(`(home_team LIKE @q OR away_team LIKE @q OR league LIKE @q)`); params.q = `%${q}%`; }
    if (league) { clauses.push(`league = @league`); params.league = league; }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const total = db.prepare(`SELECT COUNT(*) as c FROM matches ${where}`).get(params).c;
    const offset = (Number(page) - 1) * Number(pageSize);
    const rows = db.prepare(`${baseSelect} ${where} ORDER BY match_date DESC LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit: Number(pageSize), offset });

    res.json({ success: true, total, page: Number(page), pageSize: Number(pageSize), data: rows.map(mapMatch) });
  } catch (err) { next(err); }
});

router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare(`${baseSelect} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: mapMatch(row) });
  } catch (err) { next(err); }
});

export default router;
