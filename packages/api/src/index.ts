import express from 'express';
import cors from 'cors';
import dealsRouter from './routes/deals';
import categoriesRouter from './routes/categories';
import referencesRouter from './routes/references';
import statsRouter from './routes/stats';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/deals', dealsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[DealRadar API] Running on http://localhost:${PORT}`);
});
