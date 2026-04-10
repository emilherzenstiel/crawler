#!/usr/bin/env node

/**
 * Database initialization script.
 * Creates all tables and inserts seed data.
 *
 * Usage: node packages/api/src/db/init-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../../../data/deal-radar.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`[init-db] Initializing database at ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables from schema.sql
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);
console.log('[init-db] Tables created');

// --- Seed data ---

// Check if seed data already exists
const existingCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (existingCategories.count > 0) {
  console.log('[init-db] Seed data already exists, skipping');
  db.close();
  process.exit(0);
}

// Insert category: Retro Mainboards
const insertCategory = db.prepare(
  'INSERT INTO categories (name, platform, keywords, max_buy_price, active) VALUES (?, ?, ?, ?, ?)'
);

const categoryResult = insertCategory.run(
  'Retro Mainboards',
  'kleinanzeigen',
  JSON.stringify(['sockel 775', 'lga 1366', 'am2+', 'sockel 939']),
  40000, // 400€ max buy price in cents
  1
);

const categoryId = categoryResult.lastInsertRowid;
console.log(`[init-db] Inserted category "Retro Mainboards" (id: ${categoryId})`);

// Insert reference prices for known retro mainboards
const insertRef = db.prepare(
  `INSERT INTO reference_prices (category_id, item_pattern, display_name, avg_sell_price, source, last_updated, notes)
   VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`
);

const referenceBoards = [
  {
    pattern: 'asus p5q',
    name: 'ASUS P5Q Deluxe',
    price: 28000, // 280€
    notes: 'LGA 775, P45 Chipset. Sehr beliebt bei Retro-Gamern. Stabile Nachfrage.',
  },
  {
    pattern: 'gigabyte ga-ep45',
    name: 'Gigabyte GA-EP45-DS3L',
    price: 15000, // 150€
    notes: 'LGA 775, P45 Chipset. Solides Board, günstigere Alternative zur ASUS P5Q.',
  },
  {
    pattern: 'msi p45 neo',
    name: 'MSI P45 Neo-F',
    price: 17500, // 175€
    notes: 'LGA 775, P45 Chipset. Guter Allrounder, moderate Nachfrage.',
  },
  {
    pattern: 'asus rampage',
    name: 'ASUS Rampage II Extreme',
    price: 40000, // 400€
    notes: 'LGA 1366, X58 Chipset. High-End Board, Sammlerpreise. Top-Marge möglich.',
  },
  {
    pattern: 'asus crosshair ii',
    name: 'ASUS Crosshair II Formula',
    price: 22000, // 220€
    notes: 'AM2+, nForce 780a. Enthusiast-Board, gute Nachfrage bei AMD-Retro-Builds.',
  },
];

const insertRefs = db.transaction(() => {
  for (const board of referenceBoards) {
    insertRef.run(categoryId, board.pattern, board.name, board.price, 'ebay_sold', board.notes);
  }
});

insertRefs();
console.log(`[init-db] Inserted ${referenceBoards.length} reference prices`);

db.close();
console.log('[init-db] Done!');
