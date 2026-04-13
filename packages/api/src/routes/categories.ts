import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

interface CategoryRow {
  id: number;
  name: string;
  platform: string;
  keywords: string;
  max_buy_price: number | null;
  active: number;
  created_at: string;
}

const VALID_PLATFORMS = ['kleinanzeigen', 'ebay'] as const;

function parseKeywords(row: CategoryRow): Record<string, unknown> {
  let keywords: string[] = [];
  try {
    const parsed = JSON.parse(row.keywords);
    if (Array.isArray(parsed)) keywords = parsed;
  } catch {
    // ignore malformed
  }
  return { ...row, keywords };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM categories ORDER BY name').all() as CategoryRow[];
  res.json(rows.map(parseKeywords));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as CategoryRow | undefined;
  if (!row) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(parseKeywords(row));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, platform, keywords, max_buy_price, active } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
    return;
  }
  if (!Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: 'keywords must be a non-empty array' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO categories (name, platform, keywords, max_buy_price, active) VALUES (?, ?, ?, ?, ?)'
  ).run(name, platform, JSON.stringify(keywords), max_buy_price ?? null, active === false ? 0 : 1);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as CategoryRow;
  res.status(201).json(parseKeywords(created));
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const { name, platform, keywords, max_buy_price, active } = req.body ?? {};

  const updates: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || !name) {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    updates.push('name = ?');
    params.push(name);
  }
  if (platform !== undefined) {
    if (!VALID_PLATFORMS.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
      return;
    }
    updates.push('platform = ?');
    params.push(platform);
  }
  if (keywords !== undefined) {
    if (!Array.isArray(keywords)) {
      res.status(400).json({ error: 'keywords must be an array' });
      return;
    }
    updates.push('keywords = ?');
    params.push(JSON.stringify(keywords));
  }
  if (max_buy_price !== undefined) {
    updates.push('max_buy_price = ?');
    params.push(max_buy_price);
  }
  if (active !== undefined) {
    updates.push('active = ?');
    params.push(active ? 1 : 0);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  params.push(req.params.id);
  const result = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as CategoryRow;
  res.json(parseKeywords(updated));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.status(204).end();
});

export default router;
