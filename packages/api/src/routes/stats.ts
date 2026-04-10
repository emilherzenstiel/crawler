import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();

  const totalDeals = db.prepare('SELECT COUNT(*) as count FROM deals').get() as { count: number };
  const newDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'new'").get() as { count: number };
  const boughtDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'bought'").get() as { count: number };
  const soldDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'sold'").get() as { count: number };
  const totalProfit = db.prepare('SELECT COALESCE(SUM(net_profit), 0) as total FROM flips').get() as { total: number };
  const avgMargin = db.prepare('SELECT COALESCE(AVG(margin_percent), 0) as avg FROM deals WHERE margin_percent IS NOT NULL').get() as { avg: number };

  res.json({
    total_deals: totalDeals.count,
    new_deals: newDeals.count,
    bought_deals: boughtDeals.count,
    sold_deals: soldDeals.count,
    total_profit_cents: totalProfit.total,
    avg_margin_percent: Math.round(avgMargin.avg * 100) / 100,
  });
});

export default router;
