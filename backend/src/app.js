import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import xssClean from 'xss-clean';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import apiV1Router from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// --- Security & core middleware ---
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
// --- Stripe webhook needs the raw request body for signature verification,
// so this must be registered BEFORE the global express.json() parser below,
// and express.json() must explicitly skip this one path (it has no path
// filter of its own, so without this it would re-run on the webhook route,
// find an already-consumed stream, and clobber req.body). ---
const STRIPE_WEBHOOK_PATH = '/api/v1/subscriptions/webhook';
app.use(STRIPE_WEBHOOK_PATH, express.raw({ type: 'application/json' }));

app.use(compression());
app.use((req, res, next) => {
  if (req.originalUrl === STRIPE_WEBHOOK_PATH) return next(); // already parsed as raw above
  return express.json({ limit: '2mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xssClean()); // strips known XSS vectors from req.body/query/params
// Note: Prisma's parameterized queries prevent SQL injection by design.

// --- Global rate limiting ---
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// --- Swagger docs ---
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Football AI Predictor API', version: '1.0.0', description: 'REST API for Football AI Predictor' },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./src/routes/*.js'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API routes (versioned) ---
app.use('/api/v1', apiV1Router);

app.use(notFound);
app.use(errorHandler);

export default app;
