export interface ScoringInput {
  askPrice: number;       // cents
  sellPrice: number;      // cents
  listingAgeHours: number;
  confidenceMatch: number; // 0.0 - 1.0
}

export function calculateScore(input: ScoringInput): {
  marginPercent: number;
  estimatedMargin: number;
  score: number;
} {
  const { askPrice, sellPrice, listingAgeHours, confidenceMatch } = input;

  const estimatedMargin = sellPrice - askPrice;
  const marginPercent = askPrice > 0 ? (estimatedMargin / askPrice) * 100 : 0;

  // Normalize margin to 0-1 range (100%+ margin = 1.0)
  const normalizedMargin = Math.min(marginPercent / 100, 1);

  // Freshness: exponential decay with 24h half-life
  const freshness = Math.exp(-0.693 * (listingAgeHours / 24));

  // Composite score
  const score = (normalizedMargin * 0.4) + (freshness * 0.3) + (confidenceMatch * 0.3);

  return {
    marginPercent: Math.round(marginPercent * 100) / 100,
    estimatedMargin,
    score: Math.round(score * 1000) / 1000,
  };
}
