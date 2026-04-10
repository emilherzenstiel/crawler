import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, platform, keywords, max_buy_price, active } = req.body;
  const result = db.prepare(
    'INSERT INTO categories (name, platform, keywords, max_buy_price, active) VALUES (?, ?, ?, ?, ?)'
  ).run(name, platform, JSON.stringify(keywords), max_buy_price, active ?? 1);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, platform, keywords, max_buy_price, active } = req.body;
  db.prepare(
    'UPDATE categories SET name = ?, platform = ?, keywords = ?, max_buy_price = ?, active = ? WHERE id = ?'
  ).run(name, platform, JSON.stringify(keywords), max_buy_price, active, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
