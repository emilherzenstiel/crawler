import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { category_id } = req.query;
  let query = 'SELECT * FROM reference_prices';
  const params: unknown[] = [];
  if (category_id) {
    query += ' WHERE category_id = ?';
    params.push(category_id);
  }
  query += ' ORDER BY display_name';
  const refs = db.prepare(query).all(...params);
  res.json(refs);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { category_id, item_pattern, display_name, avg_sell_price, source, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO reference_prices (category_id, item_pattern, display_name, avg_sell_price, source, last_updated, notes) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)'
  ).run(category_id, item_pattern, display_name, avg_sell_price, source, notes);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { item_pattern, display_name, avg_sell_price, source, notes } = req.body;
  db.prepare(
    'UPDATE reference_prices SET item_pattern = ?, display_name = ?, avg_sell_price = ?, source = ?, last_updated = CURRENT_TIMESTAMP, notes = ? WHERE id = ?'
  ).run(item_pattern, display_name, avg_sell_price, source, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM reference_prices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
