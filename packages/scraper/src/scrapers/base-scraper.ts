import type { Browser } from 'puppeteer';

export interface Listing {
  externalId: string;
  platform: string;
  title: string;
  description?: string;
  askPrice: number; // in cents
  url: string;
  imageUrl?: string;
  location?: string;
  seller?: string;
  listingDate?: Date;
}

export interface ScraperConfig {
  categoryId: number;
  keywords: string[];
  maxBuyPrice?: number; // in cents
  maxPages: number;
  delayMs: { min: number; max: number };
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export abstract class BaseScraper {
  abstract readonly name: string;

  abstract scrape(config: ScraperConfig): Promise<Listing[]>;

  protected log(msg: string): void {
    console.log(`[${this.name}] ${msg}`);
  }

  protected warn(msg: string): void {
    console.warn(`[${this.name}] WARN: ${msg}`);
  }

  protected error(msg: string, err?: unknown): void {
    console.error(`[${this.name}] ERROR: ${msg}`, err instanceof Error ? err.message : err ?? '');
  }
}
