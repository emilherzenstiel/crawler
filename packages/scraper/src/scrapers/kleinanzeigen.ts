import { BaseScraper, Listing, ScraperConfig } from './base-scraper';

export class KleinanzeigenScraper implements BaseScraper {
  name = 'kleinanzeigen';

  async scrape(config: ScraperConfig): Promise<Listing[]> {
    // TODO: Implement Kleinanzeigen scraping with Puppeteer
    console.log(`[Kleinanzeigen] Scraping with keywords: ${config.keywords.join(', ')}`);
    return [];
  }
}
