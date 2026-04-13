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
    params.push(Number(category_id));
  }
  query += ' ORDER BY display_name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM reference_prices WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Reference not found' });
    return;
  }
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { category_id, item_pattern, display_name, avg_sell_price, source, notes } = req.body ?? {};

  if (!category_id || !item_pattern || !display_name || avg_sell_price == null) {
    res.status(400).json({
      error: 'category_id, item_pattern, display_name, avg_sell_price are required',
    });
    return;
  }
  if (typeof avg_sell_price !== 'number' || avg_sell_price < 0) {
    res.status(400).json({ error: 'avg_sell_price must be a non-negative integer (cents)' });
    return;
  }

  const result = db.prepare(
    `INSERT INTO reference_prices
       (category_id, item_pattern, display_name, avg_sell_price, source, last_updated, notes)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`
  ).run(category_id, item_pattern, display_name, avg_sell_price, source ?? null, notes ?? null);

  const created = db.prepare('SELECT * FROM reference_prices WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const allowed = ['category_id', 'item_pattern', 'display_name', 'avg_sell_price', 'source', 'notes'];

  const updates: string[] = [];
  const params: unknown[] = [];

  for (const key of allowed) {
    if (req.body?.[key] !== undefined) {
      if (key === 'avg_sell_price') {
        const v = req.body.avg_sell_price;
        if (typeof v !== 'number' || v < 0) {
          res.status(400).json({ error: 'avg_sell_price must be a non-negative integer (cents)' });
          return;
        }
      }
      updates.push(`${key} = ?`);
      params.push(req.body[key]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  updates.push('last_updated = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  const result = db.prepare(`UPDATE reference_prices SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Reference not found' });
    return;
  }

  const updated = db.prepare('SELECT * FROM reference_prices WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM reference_prices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Reference not found' });
    return;
  }
  res.status(204).end();
});

export default router;
