import puppeteer, { Browser, Page } from 'puppeteer';
import {
  BaseScraper,
  Listing,
  ScraperConfig,
  getRandomUserAgent,
  randomDelay,
} from './base-scraper';
import { parsePrice, extractExternalId, parseListingDate } from '../parsers/listing-parser';

const BASE_URL = 'https://www.kleinanzeigen.de';

export class KleinanzeigenScraper extends BaseScraper {
  readonly name = 'kleinanzeigen';

  async scrape(config: ScraperConfig): Promise<Listing[]> {
    const maxPages = config.maxPages ?? 2;
    const delayRange = config.delayMs ?? { min: 3000, max: 12000 };

    const browser = await this.launchBrowser();
    const allListings: Listing[] = [];
    const seenIds = new Set<string>();

    try {
      for (const keyword of config.keywords) {
        this.log(`Scraping keyword: "${keyword}"`);
        try {
          const listings = await this.scrapeKeyword(browser, keyword, maxPages, delayRange);
          for (const listing of listings) {
            if (!seenIds.has(listing.externalId)) {
              seenIds.add(listing.externalId);
              allListings.push(listing);
            }
          }
          this.log(`Found ${listings.length} listings for "${keyword}"`);
        } catch (err) {
          this.error(`Failed to scrape keyword "${keyword}"`, err);
        }
        // Delay between keywords
        await randomDelay(delayRange.min, delayRange.max);
      }
    } finally {
      await browser.close();
    }

    return allListings;
  }

  private async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });
  }

  private async scrapeKeyword(
    browser: Browser,
    keyword: string,
    maxPages: number,
    delayRange: { min: number; max: number }
  ): Promise<Listing[]> {
    const results: Listing[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = this.buildSearchUrl(keyword, pageNum);
      this.log(`  → Page ${pageNum}: ${url}`);

      const page = await this.newPage(browser);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Handle cookie consent if shown
        await this.dismissCookieBanner(page);

        // Wait for listing container with multiple fallbacks
        const hasListings = await this.waitForListings(page);
        if (!hasListings) {
          this.warn(`No listings container found on page ${pageNum} for "${keyword}"`);
          break;
        }

        const pageListings = await this.extractListings(page);
        if (pageListings.length === 0) {
          this.log(`  → No listings found on page ${pageNum}, stopping pagination`);
          break;
        }

        results.push(...pageListings);
      } catch (err) {
        this.error(`  → Error on page ${pageNum}`, err);
      } finally {
        await page.close().catch(() => {});
      }

      // Delay between pages
      if (pageNum < maxPages) {
        await randomDelay(delayRange.min, delayRange.max);
      }
    }

    return results;
  }

  private buildSearchUrl(keyword: string, pageNum: number): string {
    // Kleinanzeigen URL pattern: /s-{keyword}/k0 (page 1) or /s-seite:{N}/{keyword}/k0 (page N)
    const slug = keyword.trim().toLowerCase().replace(/\s+/g, '-');
    if (pageNum === 1) {
      return `${BASE_URL}/s-${encodeURIComponent(slug)}/k0`;
    }
    return `${BASE_URL}/s-seite:${pageNum}/${encodeURIComponent(slug)}/k0`;
  }

  private async newPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();
    const userAgent = getRandomUserAgent();
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1280 + Math.floor(Math.random() * 200), height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    });
    // Block heavy resources to speed things up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'font' || type === 'media' || type === 'stylesheet') {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
    return page;
  }

  private async dismissCookieBanner(page: Page): Promise<void> {
    try {
      // Kleinanzeigen uses an iframe or button with data-testid
      const selectors = [
        'button[data-testid="gdpr-accept-all-button"]',
        'button#gdpr-banner-accept',
        'button[aria-label*="Alle akzeptieren"]',
      ];
      for (const sel of selectors) {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click().catch(() => {});
          await randomDelay(500, 1500);
          return;
        }
      }
    } catch {
      // Non-fatal
    }
  }

  private async waitForListings(page: Page): Promise<boolean> {
    const selectors = [
      '#srchrslt-adtable',
      'ul#srchrslt-adtable',
      'article.aditem',
      '[data-adid]',
    ];
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        return true;
      } catch {
        // try next
      }
    }
    return false;
  }

  private async extractListings(page: Page): Promise<Listing[]> {
    // Evaluate in page context. Use stable data-attrs where possible.
    const raw = await page.evaluate((baseUrl) => {
      const items: Array<Record<string, string | null>> = [];
      const articles = Array.from(document.querySelectorAll<HTMLElement>('article.aditem, [data-adid]'));

      for (const el of articles) {
        const externalId = el.getAttribute('data-adid') || null;

        const linkEl = el.querySelector<HTMLAnchorElement>('a.ellipsis, a[href*="/s-anzeige/"]');
        const href = linkEl?.getAttribute('href') || null;
        const url = href ? (href.startsWith('http') ? href : `${baseUrl}${href}`) : null;

        const titleEl = el.querySelector('h2 a, a.ellipsis, h2');
        const title = titleEl?.textContent?.trim() || null;

        const priceEl = el.querySelector('.aditem-main--middle--price-shipping--price, p.aditem-main--middle--price, .aditem-main--middle--price');
        const priceText = priceEl?.textContent?.trim() || null;

        const locationEl = el.querySelector('.aditem-main--top--left, [class*="aditem-main--top"] .text-module-begin');
        const location = locationEl?.textContent?.trim().replace(/\s+/g, ' ') || null;

        const dateEl = el.querySelector('.aditem-main--top--right, [class*="aditem-main--top"] .text-module-end');
        const dateText = dateEl?.textContent?.trim() || null;

        const descEl = el.querySelector('.aditem-main--middle--description, p[class*="description"]');
        const description = descEl?.textContent?.trim() || null;

        const imgEl = el.querySelector<HTMLImageElement>('.aditem-image img, img[src], img[data-src]');
        const imageUrl =
          imgEl?.getAttribute('src') ||
          imgEl?.getAttribute('data-src') ||
          imgEl?.getAttribute('srcset')?.split(' ')[0] ||
          null;

        items.push({ externalId, url, title, priceText, location, dateText, description, imageUrl });
      }

      return items;
    }, BASE_URL);

    const listings: Listing[] = [];
    for (const r of raw) {
      if (!r.title || !r.url) continue;

      const externalId = r.externalId || extractExternalId(r.url);
      if (!externalId) continue;

      const askPrice = parsePrice(r.priceText);
      const listingDateIso = parseListingDate(r.dateText);

      listings.push({
        externalId,
        platform: this.name,
        title: r.title,
        description: r.description || undefined,
        askPrice,
        url: r.url,
        imageUrl: r.imageUrl || undefined,
        location: r.location || undefined,
        listingDate: listingDateIso ? new Date(listingDateIso) : undefined,
      });
    }

    return listings;
  }
}
