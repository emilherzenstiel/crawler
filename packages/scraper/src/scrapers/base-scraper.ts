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
  keywords: string[];
  maxBuyPrice?: number; // in cents
  maxPages?: number;
  delayMs?: { min: number; max: number };
}

export interface BaseScraper {
  name: string;
  scrape(config: ScraperConfig): Promise<Listing[]>;
}
