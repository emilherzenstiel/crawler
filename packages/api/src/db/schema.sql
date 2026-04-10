CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  keywords TEXT NOT NULL,
  max_buy_price INTEGER,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reference_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id),
  item_pattern TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avg_sell_price INTEGER NOT NULL,
  source TEXT,
  last_updated DATETIME,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  platform TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  ask_price INTEGER,
  url TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  seller TEXT,
  matched_reference_id INTEGER REFERENCES reference_prices(id),
  estimated_sell_price INTEGER,
  estimated_margin INTEGER,
  margin_percent REAL,
  score REAL,
  status TEXT DEFAULT 'new',
  bought_price INTEGER,
  sold_price INTEGER,
  found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  listing_date DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER REFERENCES deals(id),
  bought_price INTEGER NOT NULL,
  sold_price INTEGER NOT NULL,
  platform_fees INTEGER DEFAULT 0,
  net_profit INTEGER NOT NULL,
  sold_at DATETIME,
  notes TEXT
);
