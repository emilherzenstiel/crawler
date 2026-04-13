import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dealsRouter from './routes/deals';
import categoriesRouter from './routes/categories';
import referencesRouter from './routes/references';
import statsRouter from './routes/stats';
import flipsRouter from './routes/flips';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// CORS: allow Vite dev server. Extra origins via CORS_ORIGINS env (comma-separated).
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const extraOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...extraOrigins])];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

app.use('/api/deals', dealsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/flips', flipsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unknown /api routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[API] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    detail: err instanceof Error ? err.message : String(err),
  });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[DealRadar API] Running on http://localhost:${PORT}`);
  console.log(`[DealRadar API] CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
