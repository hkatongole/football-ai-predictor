# ⚽ Football AI Predictor

A production-grade, installable Progressive Web App for AI-powered football predictions.

> **Architecture note:** Match/prediction data is now sourced from **PlusOne** (a separate scraper + prediction engine) via a read-only bridge service — see `bridge/README.md` and `plusone-frontend-integration-prompt.md`. Auth, admin management, subscriptions, payments, news, ads, and notifications remain on the original Express/Prisma/MySQL backend in `backend/`.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Router, React Query, Chart.js, Framer Motion |
| Backend | Node.js, Express.js, JWT auth, Socket.IO (live updates), Stripe, web-push |
| PlusOne Bridge | sql.js (read-only), Express |
| Database | MySQL 8 via Prisma ORM |
| Caching | Redis |
| Deployment | Docker, Docker Compose, Nginx |
| Docs | Swagger / OpenAPI at `/api/docs` |

---

## 2. What's Fully Built vs. Scaffolded

**Fully built and verified working (see "How this was verified" below):**
- Prisma schema covering users/roles/permissions, leagues/teams/players/matches/standings, predictions/models, subscriptions/payments, push subscriptions, favorites/notifications, news/ads, API keys/logs/settings/cron registry.
- JWT auth: register, login, refresh (httpOnly cookie), logout, forgot/reset password, email verification token flow, `/auth/me`, role-based access control.
- **Three independent, mathematically real prediction engines** (unit-tested): statistical power-rating model, trainable ML classifier (softmax + gradient descent), hybrid engine (ELO + Poisson correct-score matrix). Superseded as the *primary* data source by PlusOne but kept as a documented fallback engine registry (`/admin/predictions`).
- **PlusOne bridge**: read-only sql.js service mapping PlusOne's 4 real prediction engines (Dixon-Coles, ML, Legacy, Consensus) into the app's UI shape. Verified against real data: 2,677 matches, 1,400 graded predictions.
- **Full admin panel**: Users, Leagues, Fixtures, Prediction Models, Subscription Plans, News & Blogs, Ads, API Keys, Activity/API Logs, System Health (live backend + bridge health + PlusOne model accuracy) — all with working CRUD via a shared `DataTable` component, guarded client-side by `ProtectedRoute` (ADMIN/SUPER_ADMIN only) and server-side by `requireRole`.
- **Push notifications**: VAPID keypair generation script, `/notifications/subscribe|unsubscribe|vapid-public-key`, admin dispatch endpoint (`/admin/notifications/send`) that writes to the in-app `Notification` table and pushes via `web-push`, with dead-subscription pruning. Custom service worker (`client/src/sw.js`, `injectManifest` strategy) handles `push` and `notificationclick` events and deep-links into the matching match.
- **Stripe subscriptions**: Checkout Session creation, webhook handler with raw-body signature verification (mounted correctly ahead of the global JSON parser), `isPremium` flip on `checkout.session.completed`. Frontend `Premium` page lists plans and redirects to Stripe Checkout.
- **Background Sync**: offline write queueing (`client/src/utils/offlineQueue.js`) paired with a `sync` event replay handler in the service worker.
- **Real PWA app icons** (192/512/maskable/apple-touch), generated and verified as valid PNGs — not placeholders.
- **Functional dark/light mode toggle** (Settings page), persisted to `localStorage`, applied via `html.dark` class — not cosmetic.
- SoccerData API integration service (fallback data source), scheduled sync jobs, REST API with rate limiting/Helmet/CORS/XSS protection, Swagger docs, Socket.IO live-update rooms.
- Docker Compose stack (MySQL + Redis + backend + Nginx-served frontend).

**How this was verified (and what wasn't):**
- The three original prediction engines: unit-tested (`backend/src/prediction/__tests__`), all passing.
- The PlusOne bridge: integration-tested with `supertest` against the **real** uploaded `.sqlite` snapshot (`bridge/src/__tests__/bridge.test.js`), all 8 tests passing — real matches, real predictions, real premium gating, real accuracy stats.
- The main backend's HTTP/auth/middleware layer: integration-tested with `supertest` against a **mocked Prisma client** (`backend/src/__tests__/auth.test.js`), all 7 tests passing — this proves routing, validation, JWT issuance, and role guarding are correct, but does **not** prove SQL correctness against a live MySQL instance (this sandbox can't reach `binaries.prisma.sh` to generate the Prisma engine — a real environment with normal internet access won't hit this). Run `npx prisma migrate dev` against a real MySQL instance to complete that verification.
- Push notifications and Stripe checkout: the VAPID keypair generation and webhook signature-rejection path were exercised live; the full subscribe→push→receive and checkout→webhook→upgrade flows need a real browser + Stripe test-mode account to verify end-to-end (see "Configuring Push & Stripe" below).
- Client build: verified via `vite build` after every batch of changes — PWA manifest, custom service worker (confirmed `push`/`notificationclick`/`sync` handlers present in the built `dist/sw.js`), and all pages/routes compile cleanly.

**Still scaffolded, not built:**
- Payment-provider-side subscription cancellation handling is a stub (`customer.subscription.deleted` webhook logs but doesn't revoke `isPremium` — needs a stored Stripe-subscription-to-user mapping, noted in the code).
- Code-splitting for the frontend bundle (currently one ~560KB chunk — functional but not optimized; see the Vite build warning).
- ML engine currently runs a real, working logistic-regression classifier in Node (kept as fallback). For higher accuracy as a PlusOne alternative, swap its internals for a Python microservice (scikit-learn/XGBoost) — the feature vector contract (`buildFeatureVector`) is designed for a drop-in replacement.

---

## 2a. Configuring Push & Stripe

**Push notifications:**
```bash
cd backend
npm run generate-vapid   # prints a fresh VAPID keypair
# copy VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY into backend/.env
# copy the same public key into client/.env as VITE_VAPID_PUBLIC_KEY
```

**Stripe:**
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen --forward-to localhost:5000/api/v1/subscriptions/webhook`
```
Then, in the admin panel, edit a Subscription Plan's `features` JSON to include `{"stripePriceId": "price_..."}` for each paid plan (create the Price in your Stripe Dashboard first).

---

## 3. Project Structure

```
football-ai-predictor/
├── client/                     # React PWA
│   └── src/
│       ├── components/         # MatchCard, ConfidenceBadge, InstallPrompt, ProtectedRoute, admin/DataTable...
│       ├── pages/               # Home, Matches, MatchDetail, Login, Register, Settings, Premium, admin/*
│       ├── layouts/             # MainLayout (mobile bottom nav), AdminLayout (sidebar)
│       ├── contexts/            # AuthContext (JWT + silent refresh + /auth/me)
│       ├── hooks/               # usePushNotifications.js
│       ├── utils/               # offlineQueue.js (Background Sync writer)
│       ├── sw.js                # custom service worker (injectManifest): push, notificationclick, sync
│       └── services/            # api.js (main backend), bridgeApi.js (PlusOne bridge)
├── backend/
│   └── src/
│       ├── controllers/         # authController, predictionController, notificationController, subscriptionController
│       ├── routes/              # authRoutes, matchRoutes, predictionRoutes, adminRoutes, notificationRoutes, subscriptionRoutes
│       ├── middleware/          # auth (JWT + RBAC), errorHandler
│       ├── prediction/          # statisticalEngine.js, mlEngine.js, hybridEngine.js (+ tests, fallback engines)
│       ├── services/            # soccerDataService.js, statsBuilderService.js, pushService.js, stripeService.js
│       ├── jobs/                # syncFootballData.js (cron)
│       ├── scripts/             # generateVapidKeys.js
│       ├── __tests__/           # auth.test.js (supertest, mocked Prisma)
│       └── config/               # prisma.js, redis.js
│   └── prisma/schema.prisma     # full DB schema
├── bridge/                      # PlusOne read-only bridge (see bridge/README.md)
│   └── src/
│       ├── routes/               # matches.js, predictions.js, stats.js
│       ├── utils/                 # mappers.js, poisson.js
│       ├── scripts/importSnapshot.js
│       └── __tests__/            # bridge.test.js (supertest, real PlusOne data)
├── nginx/nginx.conf
├── docker-compose.yml
├── plusone-frontend-integration-prompt.md
└── README.md
```

---

## 4. Local Development

### Prerequisites
Node.js 20+, MySQL 8, Redis, npm.

### Backend (auth, admin, subscriptions, payments, notifications)
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT secrets, VAPID keys, Stripe keys
npm install
npx prisma migrate dev --name init
npm run seed               # creates admin user + prediction models + plans
npm run generate-vapid     # prints a VAPID keypair — copy into .env
npm run dev                 # http://localhost:5000, docs at /api/docs
```
Default seeded admin: `admin@footballai.app` / `ChangeMe123!` (change immediately).

### PlusOne Bridge (matches, predictions, stats)
```bash
cd bridge
npm install
cp .env.example .env
npm run sync -- /path/to/plusone_export.sqlite
npm start                   # http://localhost:5050
```

### Frontend
```bash
cd client
cp .env.example .env       # set VITE_API_URL, VITE_BRIDGE_URL, VITE_VAPID_PUBLIC_KEY
npm install
npm run dev                 # http://localhost:5173
```

### Run tests
```bash
cd backend && npm test      # prediction engines + auth/admin route guarding (12 tests)
cd bridge && npm test       # real PlusOne data integration tests (8 tests)
```

---

## 5. Docker Deployment

```bash
cp backend/.env.example backend/.env     # fill in secrets
cp bridge/.env.example bridge/.env       # JWT_ACCESS_SECRET must match backend/.env's value
mkdir -p bridge/data && cp /path/to/your/plusone_export.sqlite bridge/data/plusone_backup.sqlite

# IMPORTANT: Vite env vars are baked in at build time. Set your real VAPID key
# in client/.env.production BEFORE building, or push notifications won't work
# in the Docker build (see client/.env.production).

docker compose up --build -d
```
- Frontend: `http://localhost:8080` (Nginx routes `/api/v1/matches|predictions|stats` to the bridge, everything else under `/api/` to the backend, and `/socket.io` to the backend — all under one origin)
- Backend API: `http://localhost:5000/api/v1`
- Bridge API: `http://localhost:5050/api/v1`
- Swagger docs: `http://localhost:5000/api/docs`

The backend container runs `prisma migrate deploy` and seeds the database automatically on startup. The bridge container reads whatever `.sqlite` file is mounted at `bridge/data/plusone_backup.sqlite` — refresh it anytime by replacing that file and running `docker compose restart bridge` (no rebuild needed).

---

## 6. Database Schema Overview

Key tables: `User`/`Role`/`Permission`/`RefreshToken`/`PushSubscription`, `League`/`Team`/`Player`/`Match`/`Standing`/`Country`, `PredictionModel`/`Prediction`/`PredictionView`, `SubscriptionPlan`/`Subscription`/`Payment`, `Favorite`/`Notification`/`News`/`Advertisement`, `ApiKey`/`ApiLog`/`ActivityLog`/`Setting`/`CronJob`.

Full schema: `backend/prisma/schema.prisma`. Run `npx prisma studio` for a visual DB browser.

---

## 7. Prediction Engines — How They Work

**Primary (PlusOne, via the bridge):** Dixon-Coles Poisson model, an ML model, a Legacy heuristic engine, blended into a Consensus — all pre-computed by PlusOne and served read-only. See `bridge/README.md`.

**Fallback (built into `backend/`, used for leagues PlusOne hasn't scraped):**
1. **Statistical Engine** — converts recent form (recency-weighted), attack strength, defensive weakness, home advantage, and head-to-head history into power ratings, then derives probabilities via a softmax-style distribution with a closeness-scaled draw probability.
2. **ML Engine** — a multinomial logistic regression over 8 engineered features. Ships with real gradient-descent training (`train()`).
3. **Hybrid AI Engine** — blends Statistical (35%) + ML (40%) + ELO expected score (25%), applies contextual nudges (momentum, injuries, weather), derives a Poisson correct-score matrix, risk rating, and recommended bet market.

Free users see win/draw/loss for all engines; the full breakdown (correct score, risk, reasoning) is gated behind `isPremium`.

---

## 8. Security

Helmet, CORS allowlist, rate limiting (global + stricter on auth routes), `xss-clean` sanitization, bcrypt password hashing (cost 12), JWT access + httpOnly-cookie refresh tokens, Prisma parameterized queries (SQL-injection safe by design), role-based route guards (client + server side), Stripe webhook signature verification, `.env`-based secrets (never committed).

---

## 9. Scaling Notes

- Backend is stateless (JWT + Redis) → horizontally scalable behind a load balancer.
- Redis caches SoccerData API responses and can back a shared session/rate-limit store across instances.
- Prisma + MySQL: add read replicas and connection pooling (e.g. PgBouncer-equivalent for MySQL, or Prisma Accelerate) as load grows.
- Socket.IO can be scaled with a Redis adapter (`@socket.io/redis-adapter`) for multi-instance pub/sub.
- The PlusOne bridge loads its snapshot into memory (sql.js) — fine for a single-user dataset; for larger/shared deployments, consider mirroring PlusOne's export into a real Postgres/MySQL table instead (see Task 2/3 of `plusone-frontend-integration-prompt.md`).
- Cloud-portable: no vendor-specific APIs used; deploys equally to AWS ECS/RDS, Azure Container Apps/Database for MySQL, or GCP Cloud Run/Cloud SQL.

---

## 10. Remaining Work

**Done since the last update:**
- ✅ Bridge added as a `docker-compose.yml` service, with nginx routing `/api/v1/matches|predictions|stats` to it and everything else to the main backend under one origin.
- ✅ Stripe-subscription-to-user mapping persisted (`Subscription.stripeSubscriptionId`) — `customer.subscription.deleted` and `customer.subscription.updated` (failed payment/unpaid) now properly revoke `isPremium`, tested end-to-end with a mocked Stripe SDK (`backend/src/__tests__/subscriptionWebhook.test.js`, 4/4 passing).
- ✅ Frontend code-split: main chunk went from ~560KB to ~25KB via vendor chunking (`vite.config.js` `manualChunks`) plus lazy-loading the entire admin panel (11 files, only loaded for ADMIN/SUPER_ADMIN users).

**Still open:**
1. Turn PlusOne's `backend_sync.js` stub back into a real implementation for near-real-time sync instead of manual export/sync (see `plusone-frontend-integration-prompt.md`, Task 2).
2. Run `prisma migrate dev` against a real MySQL instance (blocked in this sandbox by network restrictions, not a code issue) to complete verification of the schema.
3. `vendor-charts` (156KB) and `vendor-motion` (112KB) are still sizeable individual chunks — chart.js is only used in the admin Dashboard and could be lazy-loaded further; framer-motion is used on the Home/Matches match cards, so deferring it would need a loading-state tradeoff.
4. **Important operational note:** `VITE_VAPID_PUBLIC_KEY` in `client/.env.production` must be filled in with your real generated key *before* running `docker compose up --build` — Vite env vars are baked in at build time, not read at container runtime.
