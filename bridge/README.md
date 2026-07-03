# PlusOne Bridge

A **read-only** REST API that reshapes PlusOne's exported SQLite data into the exact response format `football-ai-predictor`'s React frontend already expects. This lets the polished PWA frontend display PlusOne's real matches, team stats, and — most importantly — its four prediction engines (Dixon-Coles, ML, Legacy, Consensus) without any changes to PlusOne itself.

## Safety guarantees (verified, not just claimed)

- The bridge never opens the PlusOne extension source in any way — it only reads a **copy** of a `.sqlite` export you provide.
- `sql.js` loads the database file's bytes into memory; the bridge never calls anything that writes back to disk. It is architecturally incapable of modifying the source file.
- The one script that touches files (`npm run sync`) only ever *copies* a file into `bridge/data/` — it never opens the source for writing, and it archives the previous local snapshot instead of silently overwriting it.
- Verified end-to-end in this build: MD5 checksums of `manifest.json`, `storage/schema.js`, and the original `.sqlite` export were recorded before any work began and matched exactly afterward.

**PlusOne itself was not modified in any way** — no files inside `plusone_v24_fixed/` were edited, and none of its scraper/engine code was executed. This is a pure "add-on" that sits *next to* PlusOne, reading a snapshot of its output.

## What it does

Maps PlusOne's `prediction_log` table (4 engines: Dixon-Coles, ML, Legacy, Consensus) into the 3-engine shape `MatchDetail.jsx` already renders:

| football-ai-predictor slot | PlusOne source |
|---|---|
| `statistical` | Legacy heuristic engine (`legacy_*` columns) |
| `machineLearning` | PlusOne ML engine (`ml_*` columns) + a reconstructed Poisson over/under market from `dc_expected_home/away` |
| `hybrid` (premium-gated) | Consensus engine (`consensus_*`, scorelines, value gaps, reasoning) |

Also exposes `team_stats`, `players`, `team_injuries`, `match_odds`, and an aggregate `model-accuracy` endpoint computed from PlusOne's own graded prediction history (real numbers from your data: DC 52.5%, ML 66.7%, Legacy 46.3%, Consensus 61.1% at last sync).

## Setup

```bash
cd bridge
npm install
cp .env.example .env          # set JWT_ACCESS_SECRET to match your auth backend
npm run sync -- /path/to/your/plusone_export.sqlite
npm start                     # runs on :5050
```

To refresh with a newer PlusOne export later, just re-run `npm run sync -- /path/to/new_export.sqlite` and restart — the previous snapshot is archived automatically, nothing is lost.

## Point the frontend at it

In `client/.env`:
```
VITE_API_URL=http://localhost:5050/api/v1
```

No other frontend changes are required — `Home.jsx`, `Matches.jsx`, and `MatchDetail.jsx` already call `/matches`, `/matches/live`, `/predictions/today`, and `/predictions/:matchId`, all of which this bridge implements.

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/matches` — search/paginate (`?q=`, `?league=`, `?page=`, `?pageSize=`)
- `GET /api/v1/matches/live`, `/upcoming`, `/:id`
- `GET /api/v1/predictions/today`
- `GET /api/v1/predictions/:matchId` — full 3-engine breakdown (premium-gated hybrid, same as before)
- `GET /api/v1/stats/stats?team=`, `/players?team=`, `/injuries?team=`, `/odds?homeTeam=&awayTeam=`, `/model-accuracy`

## Later: live sync instead of manual export

Right now this is a manual "export → sync → restart" flow. If/when you want near-real-time updates instead, the next step (not built yet, deliberately deferred) is turning PlusOne's already-existing-but-stubbed `backend_sync.js` into a real implementation that POSTs new rows to a `/internal/sync` endpoint on this bridge after each scrape cycle — see `plusone-frontend-integration-prompt.md`, Task 2, "Better" option. That would touch one PlusOne file; everything in this current build touches zero.
