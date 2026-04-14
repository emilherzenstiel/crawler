import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

const VALID_STATUSES = ['new', 'contacted', 'bought', 'sold', 'skipped'] as const;
type DealStatus = (typeof VALID_STATUSES)[number];

const SORT_COLUMNS: Record<string, string> = {
  score: 'd.score',
  margin: 'd.estimated_margin',
  margin_percent: 'd.margin_percent',
  date: 'd.found_at',
  price: 'd.ask_price',
};

/**
 * GET /api/deals
 * Query params: category_id, status, min_score, sort_by, limit, offset
 */
router.get('/', (req, res) => {
  const db = getDb();
  const { category_id, status, min_score, sort_by, limit, offset } = req.query;

  const where: string[] = ['1=1'];
  const params: unknown[] = [];

  if (category_id) {
    where.push('d.category_id = ?');
    params.push(Number(category_id));
  }
  if (status) {
    if (!VALID_STATUSES.includes(status as DealStatus)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }
    where.push('d.status = ?');
    params.push(status);
  }
  if (min_score != null && min_score !== '') {
    const n = Number(min_score);
    if (Number.isNaN(n)) {
      res.status(400).json({ error: 'min_score must be a number' });
      return;
    }
    where.push('d.score >= ?');
    params.push(n);
  }

  const sortColumn = SORT_COLUMNS[String(sort_by ?? 'score')] ?? SORT_COLUMNS.score;
  const parsedLimit = Math.min(Math.max(Number(limit ?? 50), 1), 500);
  const parsedOffset = Math.max(Number(offset ?? 0), 0);

  const query = `
    SELECT
      d.*,
      c.name AS category_name,
      r.display_name AS reference_display_name,
      r.avg_sell_price AS reference_avg_sell_price
    FROM deals d
    LEFT JOIN categories c ON c.id = d.category_id
    LEFT JOIN reference_prices r ON r.id = d.matched_reference_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortColumn} DESC NULLS LAST
    LIMIT ? OFFSET ?
  `;

  const deals = db.prepare(query).all(...params, parsedLimit, parsedOffset);

  const countQuery = `SELECT COUNT(*) as total FROM deals d WHERE ${where.join(' AND ')}`;
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  res.json({
    deals,
    pagination: { total, limit: parsedLimit, offset: parsedOffset },
  });
});

/**
 * GET /api/deals/:id
 * Single deal with joined reference and category data.
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const deal = db.prepare(`
    SELECT
      d.*,
      c.name AS category_name,
      c.platform AS category_platform,
      r.display_name AS reference_display_name,
      r.avg_sell_price AS reference_avg_sell_price,
      r.item_pattern AS reference_item_pattern
    FROM deals d
    LEFT JOIN categories c ON c.id = d.category_id
    LEFT JOIN reference_prices r ON r.id = d.matched_reference_id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!deal) {
    res.status(404).json({ error: 'Deal not found' });
    return;
  }
  res.json(deal);
});

/**
 * PATCH /api/deals/:id
 * Update status, bought_price, sold_price. Any subset of fields accepted.
 */
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { status, bought_price, sold_price } = req.body ?? {};

  const updates: string[] = [];
  const params: unknown[] = [];

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }
    updates.push('status = ?');
    params.push(status);
  }
  if (bought_price !== undefined) {
    if (bought_price !== null && (typeof bought_price !== 'number' || bought_price < 0)) {
      res.status(400).json({ error: 'bought_price must be a non-negative integer (cents) or null' });
      return;
    }
    updates.push('bought_price = ?');
    params.push(bought_price);
  }
  if (sold_price !== undefined) {
    if (sold_price !== null && (typeof sold_price !== 'number' || sold_price < 0)) {
      res.status(400).json({ error: 'sold_price must be a non-negative integer (cents) or null' });
      return;
    }
    updates.push('sold_price = ?');
    params.push(sold_price);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided (status, bought_price, sold_price)' });
    return;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  const result = db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Deal not found' });
    return;
  }

  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  res.json(deal);
});

export default router;
