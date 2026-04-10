import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { status, category_id, min_score, sort } = req.query;

  let query = 'SELECT * FROM deals WHERE 1=1';
  const params: unknown[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (category_id) {
    query += ' AND category_id = ?';
    params.push(category_id);
  }
  if (min_score) {
    query += ' AND score >= ?';
    params.push(min_score);
  }

  const sortColumn = sort === 'margin' ? 'estimated_margin' : 'score';
  query += ` ORDER BY ${sortColumn} DESC`;

  const deals = db.prepare(query).all(...params);
  res.json(deals);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!deal) {
    res.status(404).json({ error: 'Deal not found' });
    return;
  }
  res.json(deal);
});

router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['new', 'contacted', 'bought', 'sold', 'skipped'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }
  db.prepare('UPDATE deals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);
  res.json({ success: true });
});

export default router;
