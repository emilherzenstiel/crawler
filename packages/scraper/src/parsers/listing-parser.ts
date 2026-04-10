import { Listing } from '../scrapers/base-scraper';

export function parsePrice(priceText: string): number {
  const cleaned = priceText
    .replace(/[^0-9,.]/g, '')
    .replace(',', '.');
  const euros = parseFloat(cleaned);
  return Math.round(euros * 100); // convert to cents
}

export function normalizeListing(raw: Partial<Listing> & { title: string; url: string }): Listing {
  return {
    externalId: raw.externalId || '',
    platform: raw.platform || 'unknown',
    title: raw.title,
    description: raw.description,
    askPrice: raw.askPrice || 0,
    url: raw.url,
    imageUrl: raw.imageUrl,
    location: raw.location,
    seller: raw.seller,
    listingDate: raw.listingDate,
  };
}
