import { KleinanzeigenScraper } from './scrapers/kleinanzeigen';
import { startScheduler } from './scheduler';
import {
  getCategoryByName,
  getReferencesForCategory,
  getExistingExternalIds,
  insertDeal,
  closeDb,
} from './db';
import { matchListing } from './services/matching';
import type { Listing } from './scrapers/base-scraper';

interface CliArgs {
  category: string;
  maxPages: number;
  cron: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { category: 'Retro Mainboards', maxPages: 2, cron: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--category' && argv[i + 1]) {
      args.category = argv[++i];
    } else if (arg === '--max-pages' && argv[i + 1]) {
      args.maxPages = parseInt(argv[++i], 10);
    } else if (arg === '--cron') {
      args.cron = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Deal Radar Scraper

Usage:
  npx tsx src/index.ts [options]

Options:
  --category <name>      Category name to scrape (default: "Retro Mainboards")
  --max-pages <n>        Pages per keyword (default: 2)
  --cron                 Run on a schedule instead of once
  --help, -h             Show this help
`);
}

async function runScrapeForCategory(categoryName: string, maxPages: number): Promise<void> {
  console.log(`[DealRadar] Starting scrape for category "${categoryName}" at ${new Date().toISOString()}`);

  const category = getCategoryByName(categoryName);
  if (!category) {
    console.error(`[DealRadar] Category "${categoryName}" not found or inactive.`);
    process.exitCode = 1;
    return;
  }

  let keywords: string[];
  try {
    keywords = JSON.parse(category.keywords);
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('keywords must be a non-empty JSON array');
    }
  } catch (err) {
    console.error(`[DealRadar] Invalid keywords in category:`, err);
    process.exitCode = 1;
    return;
  }

  const references = getReferencesForCategory(category.id);
  console.log(`[DealRadar] Loaded ${references.length} reference prices for matching`);

  const existingIds = getExistingExternalIds('kleinanzeigen', category.id);
  console.log(`[DealRadar] ${existingIds.size} existing deals already in DB (will be skipped)`);

  const scraper = new KleinanzeigenScraper();
  let listings: Listing[] = [];
  try {
    listings = await scraper.scrape({
      categoryId: category.id,
      keywords,
      maxBuyPrice: category.max_buy_price ?? undefined,
      maxPages,
      delayMs: { min: 3000, max: 12000 },
    });
  } catch (err) {
    console.error('[DealRadar] Scraper failed:', err);
    return;
  }

  console.log(`[DealRadar] Scraper returned ${listings.length} total listings`);

  // Filter by max_buy_price (if configured)
  if (category.max_buy_price != null) {
    const before = listings.length;
    listings = listings.filter((l) => l.askPrice === 0 || l.askPrice <= category.max_buy_price!);
    if (before !== listings.length) {
      console.log(`[DealRadar] Filtered out ${before - listings.length} listings above max_buy_price`);
    }
  }

  let inserted = 0;
  let skipped = 0;
  let matched = 0;

  for (const listing of listings) {
    if (existingIds.has(listing.externalId)) {
      skipped++;
      continue;
    }

    const match = matchListing(listing, references);
    if (match) matched++;

    try {
      insertDeal({
        external_id: listing.externalId,
        platform: listing.platform,
        category_id: category.id,
        title: listing.title,
        description: listing.description,
        ask_price: listing.askPrice || undefined,
        url: listing.url,
        image_url: listing.imageUrl,
        location: listing.location,
        seller: listing.seller,
        listing_date: listing.listingDate?.toISOString(),
        matched_reference_id: match?.matchedReferenceId,
        estimated_sell_price: match?.estimatedSellPrice,
        estimated_margin: match?.estimatedMargin,
        margin_percent: match?.marginPercent,
        score: match?.score,
      });
      existingIds.add(listing.externalId);
      inserted++;
    } catch (err) {
      console.error(`[DealRadar] Failed to insert listing ${listing.externalId}:`, err);
    }
  }

  console.log(
    `[DealRadar] Done. Inserted: ${inserted}, skipped (dupes): ${skipped}, matched: ${matched}`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.cron) {
    startScheduler(() => runScrapeForCategory(args.category, args.maxPages), '*/30 * * * *');
    console.log(`[DealRadar] Scheduled scraper every 30 minutes for category "${args.category}"`);
    // Run once immediately on start
    await runScrapeForCategory(args.category, args.maxPages);
  } else {
    await runScrapeForCategory(args.category, args.maxPages);
    closeDb();
  }
}

main().catch((err) => {
  console.error('[DealRadar] Fatal error:', err);
  closeDb();
  process.exit(1);
});
