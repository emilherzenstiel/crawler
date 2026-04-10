import { KleinanzeigenScraper } from './scrapers/kleinanzeigen';
import { startScheduler } from './scheduler';

const scraper = new KleinanzeigenScraper();

async function runScrape() {
  console.log(`[DealRadar] Starting scrape run at ${new Date().toISOString()}`);
  const listings = await scraper.scrape({
    keywords: ['sockel 775', 'lga 1366', 'am2+', 'sockel 939'],
    maxBuyPrice: 40000, // 400€ in cents
    maxPages: 3,
    delayMs: { min: 3000, max: 12000 },
  });
  console.log(`[DealRadar] Found ${listings.length} listings`);
}

const args = process.argv.slice(2);
if (args.includes('--cron')) {
  startScheduler(runScrape, '*/30 * * * *');
  console.log('[DealRadar] Scraper scheduled every 30 minutes');
} else {
  runScrape().catch(console.error);
}
