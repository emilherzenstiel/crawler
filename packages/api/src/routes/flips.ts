import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

interface FlipRow {
  id: number;
  deal_id: number;
  bought_price: number;
  sold_price: number;
  platform_fees: number;
  net_profit: number;
  sold_at: string | null;
  notes: string | null;
}

router.get('/', (_req, res) => {
  const db = getDb();
  const flips = db.prepare(`
    SELECT f.*, d.title AS deal_title, d.url AS deal_url, d.platform AS deal_platform
    FROM flips f
    LEFT JOIN deals d ON d.id = f.deal_id
    ORDER BY f.sold_at DESC, f.id DESC
  `).all();
  res.json(flips);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const flip = db.prepare(`
    SELECT f.*, d.title AS deal_title, d.url AS deal_url, d.platform AS deal_platform
    FROM flips f
    LEFT JOIN deals d ON d.id = f.deal_id
    WHERE f.id = ?
  `).get(req.params.id);

  if (!flip) {
    res.status(404).json({ error: 'Flip not found' });
    return;
  }
  res.json(flip);
});

/**
 * POST /api/flips
 * Marks a deal as flipped and records the financial outcome in the flips table.
 * Wraps both writes (flip insert + deal update) in a single transaction.
 *
 * Body: { deal_id, bought_price, sold_price, platform_fees?, sold_at?, notes? }
 * All prices in cents.
 */
router.post('/', (req, res) => {
  const db = getDb();
  const {
    deal_id,
    bought_price,
    sold_price,
    platform_fees = 0,
    sold_at,
    notes,
  } = req.body ?? {};

  if (!deal_id) {
    res.status(400).json({ error: 'deal_id is required' });
    return;
  }
  if (typeof bought_price !== 'number' || bought_price < 0) {
    res.status(400).json({ error: 'bought_price must be a non-negative integer (cents)' });
    return;
  }
  if (typeof sold_price !== 'number' || sold_price < 0) {
    res.status(400).json({ error: 'sold_price must be a non-negative integer (cents)' });
    return;
  }
  if (typeof platform_fees !== 'number' || platform_fees < 0) {
    res.status(400).json({ error: 'platform_fees must be a non-negative integer (cents)' });
    return;
  }

  const deal = db.prepare('SELECT id FROM deals WHERE id = ?').get(deal_id);
  if (!deal) {
    res.status(404).json({ error: `Deal ${deal_id} not found` });
    return;
  }

  const net_profit = sold_price - bought_price - platform_fees;
  const soldAtIso = sold_at ?? new Date().toISOString();

  const insertFlip = db.prepare(`
    INSERT INTO flips (deal_id, bought_price, sold_price, platform_fees, net_profit, sold_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateDeal = db.prepare(`
    UPDATE deals
    SET status = 'sold',
        bought_price = ?,
        sold_price = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const tx = db.transaction(() => {
    const result = insertFlip.run(deal_id, bought_price, sold_price, platform_fees, net_profit, soldAtIso, notes ?? null);
    updateDeal.run(bought_price, sold_price, deal_id);
    return Number(result.lastInsertRowid);
  });

  try {
    const flipId = tx();
    const created = db.prepare('SELECT * FROM flips WHERE id = ?').get(flipId) as FlipRow;
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to record flip',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM flips WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Flip not found' });
    return;
  }
  res.status(204).end();
});

export default router;
