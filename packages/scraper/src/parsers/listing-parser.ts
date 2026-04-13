import type { Listing } from '../scrapers/base-scraper';

/**
 * Parses a Kleinanzeigen price string into cents.
 * Examples: "123 €", "1.234 €", "VB 50 €", "Zu verschenken", "99 € VB"
 * Returns 0 for "Zu verschenken" or unparseable strings.
 */
export function parsePrice(priceText: string | null | undefined): number {
  if (!priceText) return 0;
  const text = priceText.trim();
  if (/zu verschenken/i.test(text)) return 0;

  // Kleinanzeigen uses "." as thousand separator and "," as decimal separator.
  const match = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/);
  if (!match) return 0;

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const euros = parseFloat(normalized);
  if (isNaN(euros)) return 0;

  return Math.round(euros * 100);
}

/**
 * Extracts a listing ID from a Kleinanzeigen URL.
 * URLs look like: /s-anzeige/title-slug/1234567890-123-4567
 * Returns the numeric part before "-XXX-XXXX" which is the unique listing id.
 */
export function extractExternalId(url: string): string | null {
  if (!url) return null;
  // Match /s-anzeige/.../ID-CAT-SUBCAT or similar
  const match = url.match(/\/s-anzeige\/[^/]+\/(\d+)-\d+-\d+/);
  if (match) return match[1];

  // Fallback: any trailing numeric segment
  const fallback = url.match(/(\d{6,})/);
  return fallback ? fallback[1] : null;
}

/**
 * Parses Kleinanzeigen's relative date strings into ISO date strings.
 * Examples: "Heute, 14:30", "Gestern, 08:15", "14.03.2026"
 */
export function parseListingDate(dateText: string | null | undefined): string | null {
  if (!dateText) return null;
  const text = dateText.trim();
  const now = new Date();

  if (/heute/i.test(text)) {
    const time = text.match(/(\d{1,2}):(\d{2})/);
    if (time) {
      now.setHours(parseInt(time[1], 10), parseInt(time[2], 10), 0, 0);
    }
    return now.toISOString();
  }

  if (/gestern/i.test(text)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const time = text.match(/(\d{1,2}):(\d{2})/);
    if (time) {
      yesterday.setHours(parseInt(time[1], 10), parseInt(time[2], 10), 0, 0);
    }
    return yesterday.toISOString();
  }

  const dmY = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dmY) {
    const [, d, m, y] = dmY;
    const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return parsed.toISOString();
  }

  return null;
}

export function normalizeListing(raw: Partial<Listing> & { title: string; url: string }): Listing {
  return {
    externalId: raw.externalId || '',
    platform: raw.platform || 'kleinanzeigen',
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
