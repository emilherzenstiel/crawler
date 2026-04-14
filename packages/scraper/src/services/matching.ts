import type { Listing } from '../scrapers/base-scraper';
import type { ReferenceRow } from '../db';

export interface MatchResult {
  matchedReferenceId: number;
  displayName: string;
  confidence: number; // 0.6 (partial) or 1.0 (exact)
  estimatedSellPrice: number; // cents
  estimatedMargin: number; // cents
  marginPercent: number;
  score: number;
}

/**
 * Matches a listing title against a set of reference prices.
 * Case-insensitive substring match on item_pattern.
 * - Exact match: item_pattern equals the full title (normalized) → confidence 1.0
 * - Partial match: item_pattern is a substring of the title → confidence 0.6
 * Returns null if no reference matched.
 */
export function matchListing(
  listing: Listing,
  references: ReferenceRow[]
): MatchResult | null {
  if (references.length === 0) return null;

  const haystack = normalize(listing.title + ' ' + (listing.description ?? ''));
  const normalizedTitle = normalize(listing.title);

  let best: { ref: ReferenceRow; confidence: number } | null = null;

  for (const ref of references) {
    const pattern = normalize(ref.item_pattern);
    if (!pattern) continue;

    // Exact match against title
    if (normalizedTitle === pattern) {
      best = { ref, confidence: 1.0 };
      break;
    }

    // Substring / token match
    if (haystack.includes(pattern) || tokenSubset(pattern, haystack)) {
      const confidence = 0.6;
      if (!best || confidence > best.confidence) {
        best = { ref, confidence };
      }
    }
  }

  if (!best) return null;

  const sellPrice = best.ref.avg_sell_price;
  const askPrice = listing.askPrice;

  if (askPrice <= 0) {
    // Can't compute a meaningful margin; still return match with zeroed numbers
    return {
      matchedReferenceId: best.ref.id,
      displayName: best.ref.display_name,
      confidence: best.confidence,
      estimatedSellPrice: sellPrice,
      estimatedMargin: 0,
      marginPercent: 0,
      score: calculateScore(0, listing.listingDate, best.confidence),
    };
  }

  const estimatedMargin = sellPrice - askPrice;
  const marginPercent = (estimatedMargin / askPrice) * 100;
  const score = calculateScore(marginPercent, listing.listingDate, best.confidence);

  return {
    matchedReferenceId: best.ref.id,
    displayName: best.ref.display_name,
    confidence: best.confidence,
    estimatedSellPrice: sellPrice,
    estimatedMargin,
    marginPercent: Math.round(marginPercent * 100) / 100,
    score: Math.round(score * 1000) / 1000,
  };
}

/**
 * Composite score: (margin_percent * 0.4) + (freshness * 0.3) + (confidence * 0.3)
 * - margin_percent is normalized to 0..1 (100% margin = 1.0, capped)
 * - freshness: 1.0 for today, 0.5 for yesterday, exponential decay thereafter (half-life 24h)
 * - confidence: 0.6 or 1.0
 */
export function calculateScore(
  marginPercent: number,
  listingDate: Date | undefined,
  confidence: number
): number {
  const normalizedMargin = Math.max(0, Math.min(marginPercent / 100, 1));
  const freshness = computeFreshness(listingDate);
  return normalizedMargin * 0.4 + freshness * 0.3 + confidence * 0.3;
}

export function computeFreshness(listingDate: Date | undefined): number {
  if (!listingDate) return 0.5; // unknown date → neutral

  const now = new Date();
  const diffMs = now.getTime() - listingDate.getTime();
  if (diffMs < 0) return 1.0;

  const diffHours = diffMs / (1000 * 60 * 60);

  // Exponential decay: f(0h) = 1.0, f(24h) = 0.5, f(48h) = 0.25, ...
  return Math.exp(-Math.LN2 * (diffHours / 24));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true if every whitespace-separated token in `pattern` appears in `text`.
 * Helps with patterns like "asus p5q" matching "ASUS P5Q Deluxe Mainboard".
 */
function tokenSubset(pattern: string, text: string): boolean {
  const tokens = pattern.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => text.includes(t));
}
