# Deal Radar — Projekt-Architektur

## Was ist das?

Ein persönliches Arbitrage-Tool, das automatisiert Deals auf Kleinanzeigen und eBay findet, gegen Referenzpreise abgleicht und dir die profitabelsten Flips anzeigt. Dein unfairer Vorteil als technisch versierter Reseller.

---

## Tech Stack

| Komponente | Technologie | Warum |
|---|---|---|
| Scraper | Node.js + Puppeteer/Playwright | Headless Browsing für Kleinanzeigen (kein offizielles API) |
| Datenbank | SQLite (via better-sqlite3) | Zero Setup, single file, reicht für 100k+ Einträge |
| Backend API | Express.js | Lightweight, du kennst es schon |
| Frontend | React (Vite) | Schnell, modular, kannst du |
| Scheduling | node-cron oder systemd timer | Scraper alle 15-30 Min laufen lassen |
| Alerts | Telegram Bot API | Push-Notifications aufs Handy bei Hot Deals |

---

## Ordnerstruktur

```
deal-radar/
├── packages/
│   ├── scraper/
│   │   ├── src/
│   │   │   ├── scrapers/
│   │   │   │   ├── kleinanzeigen.ts      # Kleinanzeigen Scraper
│   │   │   │   ├── ebay.ts               # eBay Scraper (Phase 2)
│   │   │   │   └── base-scraper.ts       # Shared Interface
│   │   │   ├── parsers/
│   │   │   │   └── listing-parser.ts     # HTML → strukturierte Daten
│   │   │   ├── scheduler.ts              # Cron-basiertes Scheduling
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── deals.ts              # GET /deals, GET /deals/:id
│   │   │   │   ├── references.ts         # CRUD Referenzpreise
│   │   │   │   ├── categories.ts         # CRUD Kategorien/Keywords
│   │   │   │   └── stats.ts             # Dashboard-Statistiken
│   │   │   ├── db/
│   │   │   │   ├── schema.sql            # Tabellendefinitionen
│   │   │   │   ├── migrations/           # Schema-Änderungen
│   │   │   │   └── connection.ts         # DB-Verbindung
│   │   │   ├── services/
│   │   │   │   ├── scoring.ts            # Marge-Berechnung + Ranking
│   │   │   │   └── alerts.ts            # Telegram-Benachrichtigungen
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── dashboard/
│       ├── src/
│       │   ├── components/
│       │   │   ├── DealCard.tsx           # Einzelner Deal
│       │   │   ├── DealList.tsx           # Gefilterte Deal-Übersicht
│       │   │   ├── MarginBadge.tsx        # Visuelle Marge-Anzeige
│       │   │   ├── CategoryManager.tsx    # Kategorien verwalten
│       │   │   ├── ReferenceEditor.tsx    # Referenzpreise pflegen
│       │   │   ├── StatsPanel.tsx         # KPIs: Deals gefunden, Avg. Marge
│       │   │   └── AlertSettings.tsx      # Telegram/Notification Config
│       │   ├── hooks/
│       │   │   └── useDeals.ts           # Data Fetching
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── data/
│   └── deal-radar.db                     # SQLite-Datei
│
├── package.json                          # Workspace Root
└── README.md
```

---

## Datenmodell

### Tabelle: `categories`
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,              -- z.B. "Retro Mainboards"
  platform TEXT NOT NULL,          -- "kleinanzeigen" | "ebay"
  keywords TEXT NOT NULL,          -- JSON Array: ["sockel 775", "lga 1366", "am2+"]
  max_buy_price INTEGER,           -- Nur Listings unter diesem Preis scrapen (Cent)
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabelle: `reference_prices`
```sql
CREATE TABLE reference_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id),
  item_pattern TEXT NOT NULL,      -- Regex oder Keywords: "asus p5q" 
  display_name TEXT NOT NULL,      -- "ASUS P5Q Deluxe"
  avg_sell_price INTEGER NOT NULL, -- Durchschnittlicher Verkaufspreis (Cent)
  source TEXT,                     -- "ebay_sold" | "manual"
  last_updated DATETIME,
  notes TEXT
);
```

### Tabelle: `deals`
```sql
CREATE TABLE deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,         -- Kleinanzeigen/eBay Listing-ID
  platform TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  ask_price INTEGER,               -- Angebotspreis (Cent)
  url TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  seller TEXT,
  
  -- Berechnete Felder
  matched_reference_id INTEGER REFERENCES reference_prices(id),
  estimated_sell_price INTEGER,    -- Aus Referenzpreis
  estimated_margin INTEGER,        -- sell - ask (Cent)
  margin_percent REAL,             -- Marge in %
  score REAL,                      -- Composite Score (Marge + Geschwindigkeit + Risiko)
  
  -- Status
  status TEXT DEFAULT 'new',       -- new | contacted | bought | sold | skipped
  bought_price INTEGER,            -- Tatsächlicher Kaufpreis
  sold_price INTEGER,              -- Tatsächlicher Verkaufspreis
  
  found_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  listing_date DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabelle: `flips` (Abgeschlossene Deals)
```sql
CREATE TABLE flips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER REFERENCES deals(id),
  bought_price INTEGER NOT NULL,
  sold_price INTEGER NOT NULL,
  platform_fees INTEGER DEFAULT 0, -- eBay Gebühren, Versand etc.
  net_profit INTEGER NOT NULL,     -- sold - bought - fees
  sold_at DATETIME,
  notes TEXT
);
```

---

## Scoring-Logik

```
Score = (margin_percent × 0.4) + (freshness × 0.3) + (confidence × 0.3)

- margin_percent: (sell_price - ask_price) / ask_price
- freshness: Wie neu das Listing ist (exponentieller Decay, 24h Halbwertszeit)  
- confidence: Wie sicher der Match mit Referenzpreis ist (exact match = 1.0, fuzzy = 0.5)
```

Deals mit Score > 0.7 → Telegram Alert
Deals mit Score > 0.5 → Dashboard "Hot" Markierung

---

## Scraping-Strategie

### Kleinanzeigen
- Puppeteer mit randomisierten User-Agents und Delays
- Suche über URL-Parameter: `https://www.kleinanzeigen.de/s-{keyword}/k0`
- Rate Limiting: Max 1 Request alle 5-10 Sekunden (randomisiert)
- Pagination: Erste 3 Seiten pro Keyword reichen
- IP-Rotation: Optional via Proxy (für später)

### eBay (Phase 2)
- eBay hat eine offizielle API (Finding API) — deutlich sauberer
- "Sold Items" API für Referenzpreise automatisieren
- Browse API für aktive Listings

### Anti-Detection
- Randomisierte Delays zwischen Requests (3-12 Sekunden)
- User-Agent Rotation
- Cookie-Handling
- Optional: Residential Proxy für Scale

---

## MVP-Scope (Wochenend-Sprint)

### Phase 1: Samstag Vormittag — Scraper
- [ ] Kleinanzeigen-Scraper für eine Kategorie (Retro Mainboards)
- [ ] Listings in SQLite speichern
- [ ] Manuell laufen lassen und Output prüfen

### Phase 2: Samstag Nachmittag — Backend + Scoring
- [ ] Express API mit /deals Endpoint
- [ ] Referenzpreise manuell eintragen (5-10 bekannte Boards)
- [ ] Scoring-Logik implementieren
- [ ] Cron-Job alle 30 Minuten

### Phase 3: Sonntag Vormittag — Dashboard
- [ ] React Dashboard: Deal-Liste mit Sortierung
- [ ] Marge-Badges (grün/gelb/rot)
- [ ] Kategorie-Manager
- [ ] Referenzpreis-Editor

### Phase 4: Sonntag Nachmittag — Alerts + Polish
- [ ] Telegram Bot für Hot Deal Alerts
- [ ] Status-Tracking (new → contacted → bought → sold)
- [ ] Flip-Tracker: tatsächliche Profite erfassen
- [ ] Stats: "Diese Woche X€ Profit"

---

## Spätere Erweiterungen

- **eBay Sold Items Scraper**: Referenzpreise automatisch aktualisieren
- **Weitere Kategorien**: Vintage Kameras, Hi-Fi, LEGO, Werkzeug
- **Preishistorie**: Charts pro Referenz-Item über Zeit
- **Multi-Platform**: Vinted, Facebook Marketplace
- **Mobile App**: React Native oder PWA
- **Profit Dashboard**: Monatliche P&L, ROI pro Kategorie
