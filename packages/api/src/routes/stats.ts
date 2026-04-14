import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

interface CountResult { count: number }
interface SumResult { total: number }
interface AvgResult { avg: number }

router.get('/', (_req, res) => {
  const db = getDb();

  // Deal counts by status
  const totalDeals = db.prepare('SELECT COUNT(*) as count FROM deals').get() as CountResult;
  const newDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'new'").get() as CountResult;
  const contactedDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'contacted'").get() as CountResult;
  const boughtDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'bought'").get() as CountResult;
  const soldDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'sold'").get() as CountResult;
  const skippedDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'skipped'").get() as CountResult;

  // Deals today / this week
  const dealsToday = db.prepare(
    "SELECT COUNT(*) as count FROM deals WHERE date(found_at) = date('now', 'localtime')"
  ).get() as CountResult;

  const dealsThisWeek = db.prepare(
    "SELECT COUNT(*) as count FROM deals WHERE found_at >= datetime('now', '-7 days')"
  ).get() as CountResult;

  // Average margin across top 10% scored deals (proxy for "top deals")
  const topDealsAvgMargin = db.prepare(`
    SELECT COALESCE(AVG(margin_percent), 0) as avg FROM (
      SELECT margin_percent FROM deals
      WHERE margin_percent IS NOT NULL AND score IS NOT NULL
      ORDER BY score DESC
      LIMIT MAX(1, (SELECT CAST(COUNT(*) * 0.1 AS INTEGER) FROM deals WHERE score IS NOT NULL))
    )
  `).get() as AvgResult;

  const overallAvgMargin = db.prepare(
    'SELECT COALESCE(AVG(margin_percent), 0) as avg FROM deals WHERE margin_percent IS NOT NULL'
  ).get() as AvgResult;

  // Flip profit totals
  const totalProfit = db.prepare('SELECT COALESCE(SUM(net_profit), 0) as total FROM flips').get() as SumResult;

  const profitThisMonth = db.prepare(`
    SELECT COALESCE(SUM(net_profit), 0) as total FROM flips
    WHERE sold_at >= datetime('now', 'start of month')
  `).get() as SumResult;

  const profitThisWeek = db.prepare(`
    SELECT COALESCE(SUM(net_profit), 0) as total FROM flips
    WHERE sold_at >= datetime('now', '-7 days')
  `).get() as SumResult;

  const flipCount = db.prepare('SELECT COUNT(*) as count FROM flips').get() as CountResult;

  res.json({
    deals: {
      total: totalDeals.count,
      by_status: {
        new: newDeals.count,
        contacted: contactedDeals.count,
        bought: boughtDeals.count,
        sold: soldDeals.count,
        skipped: skippedDeals.count,
      },
      today: dealsToday.count,
      this_week: dealsThisWeek.count,
    },
    margins: {
      top_10pct_avg_percent: Math.round(topDealsAvgMargin.avg * 100) / 100,
      overall_avg_percent: Math.round(overallAvgMargin.avg * 100) / 100,
    },
    flips: {
      total_count: flipCount.count,
      total_profit_cents: totalProfit.total,
      profit_this_month_cents: profitThisMonth.total,
      profit_this_week_cents: profitThisWeek.total,
    },
  });
});

export default router;
