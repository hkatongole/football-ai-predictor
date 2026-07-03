import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import matchesRouter from './routes/matches.js';
import predictionsRouter from './routes/predictions.js';
import statsRouter from './routes/stats.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'plusone-bridge', timestamp: new Date().toISOString() });
});

app.use('/api/v1/matches', matchesRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/stats', statsRouter);

app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[bridge error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal bridge error' });
});

export default app;
