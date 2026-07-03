import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const dbPath = process.env.PLUSONE_DB_PATH || './data/plusone_backup.sqlite';

if (!fs.existsSync(dbPath)) {
  console.error(`[bridge] PlusOne snapshot not found at ${dbPath}.`);
  console.error('[bridge] Run "npm run sync -- /path/to/export.sqlite" to copy a snapshot in, then restart.');
  process.exit(1);
}

/**
 * IMPORTANT: sql.js loads the file's bytes into an in-memory WASM database.
 * We never call db.export()/write back to the original path, so the file on
 * disk is never touched. This process cannot write to, migrate, or corrupt
 * the PlusOne snapshot or the live PlusOne extension in any way.
 */
const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync(path.resolve(dbPath));
const sqljsDb = new SQL.Database(fileBuffer);

console.log(`[bridge] Loaded PlusOne snapshot READ-ONLY (in-memory): ${dbPath}`);
console.log(`[bridge] Snapshot last modified: ${fs.statSync(dbPath).mtime.toISOString()}`);

/**
 * Thin wrapper giving route code a better-sqlite3-like `.prepare(sql).all(params)` /
 * `.get(params)` API, backed by sql.js under the hood. Supports both positional
 * ('?') and named ('@key') bind parameters.
 */
function prepare(sql) {
  return {
    all(params) {
      const stmt = sqljsDb.prepare(sql);
      bindParams(stmt, params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    get(...args) {
      // Support both get(paramsObject) and get(p1, p2, ...) positional call styles
      const params = args.length === 1 && typeof args[0] === 'object' && args[0] !== null ? args[0] : args;
      const stmt = sqljsDb.prepare(sql);
      bindParams(stmt, params);
      const has = stmt.step();
      const row = has ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
  };
}

function bindParams(stmt, params) {
  if (params === undefined) return;
  if (Array.isArray(params)) {
    if (params.length) stmt.bind(params);
  } else if (typeof params === 'object') {
    const named = {};
    let hasNamed = false;
    for (const [k, v] of Object.entries(params)) {
      named[`@${k}`] = v;
      hasNamed = true;
    }
    if (hasNamed) stmt.bind(named);
  }
}

export const db = { prepare };
export default db;
