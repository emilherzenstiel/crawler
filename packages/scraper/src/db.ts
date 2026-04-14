import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../../data/deal-radar.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export interface CategoryRow {
  id: number;
  name: string;
  platform: string;
  keywords: string; // JSON array
  max_buy_price: number | null;
  active: number;
}

export interface ReferenceRow {
  id: number;
  category_id: number;
  item_pattern: string;
  display_name: string;
  avg_sell_price: number;
  source: string | null;
  last_updated: string | null;
  notes: string | null;
}

export interface DealRow {
  id: number;
  external_id: string;
  platform: string;
  category_id: number;
  title: string;
  description: string | null;
  ask_price: number | null;
  url: string;
  image_url: string | null;
  location: string | null;
  seller: string | null;
  matched_reference_id: number | null;
  estimated_sell_price: number | null;
  estimated_margin: number | null;
  margin_percent: number | null;
  score: number | null;
  status: string;
  found_at: string;
  listing_date: string | null;
}

export function getCategoryByName(name: string): CategoryRow | undefined {
  return getDb().prepare('SELECT * FROM categories WHERE name = ? AND active = 1').get(name) as CategoryRow | undefined;
}

export function getReferencesForCategory(categoryId: number): ReferenceRow[] {
  return getDb().prepare('SELECT * FROM reference_prices WHERE category_id = ?').all(categoryId) as ReferenceRow[];
}

export function getExistingExternalIds(platform: string, categoryId: number): Set<string> {
  const rows = getDb()
    .prepare('SELECT external_id FROM deals WHERE platform = ? AND category_id = ?')
    .all(platform, categoryId) as { external_id: string }[];
  return new Set(rows.map((r) => r.external_id));
}

export function insertDeal(deal: {
  external_id: string;
  platform: string;
  category_id: number;
  title: string;
  description?: string;
  ask_price?: number;
  url: string;
  image_url?: string;
  location?: string;
  seller?: string;
  listing_date?: string;
  matched_reference_id?: number;
  estimated_sell_price?: number;
  estimated_margin?: number;
  margin_percent?: number;
  score?: number;
}): number {
  const result = getDb().prepare(`
    INSERT INTO deals (
      external_id, platform, category_id, title, description, ask_price, url,
      image_url, location, seller, listing_date,
      matched_reference_id, estimated_sell_price, estimated_margin, margin_percent, score
    ) VALUES (
      @external_id, @platform, @category_id, @title, @description, @ask_price, @url,
      @image_url, @location, @seller, @listing_date,
      @matched_reference_id, @estimated_sell_price, @estimated_margin, @margin_percent, @score
    )
  `).run({
    external_id: deal.external_id,
    platform: deal.platform,
    category_id: deal.category_id,
    title: deal.title,
    description: deal.description ?? null,
    ask_price: deal.ask_price ?? null,
    url: deal.url,
    image_url: deal.image_url ?? null,
    location: deal.location ?? null,
    seller: deal.seller ?? null,
    listing_date: deal.listing_date ?? null,
    matched_reference_id: deal.matched_reference_id ?? null,
    estimated_sell_price: deal.estimated_sell_price ?? null,
    estimated_margin: deal.estimated_margin ?? null,
    margin_percent: deal.margin_percent ?? null,
    score: deal.score ?? null,
  });
  return Number(result.lastInsertRowid);
}
