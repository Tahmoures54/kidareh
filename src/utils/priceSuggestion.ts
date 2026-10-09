export type PriceSuggestionConfidence = "high" | "medium" | "low" | "insufficient";

export interface PriceSuggestionSummary {
  suggestedPrice: number | null;
  sampleSize: number;
  minPrice: number | null;
  maxPrice: number | null;
  confidence: PriceSuggestionConfidence;
}

/** میانه قیمت‌ها را محاسبه می‌کند تا چند قیمت پرت، پیشنهاد را منحرف نکنند. */
export function summarizeLocalPrices(values: readonly number[]): PriceSuggestionSummary {
  const prices = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .map(Math.round)
    .sort((a, b) => a - b);
  const sampleSize = prices.length;

  if (sampleSize < 3) {
    return {
      suggestedPrice: null,
      sampleSize,
      minPrice: prices[0] ?? null,
      maxPrice: prices[prices.length - 1] ?? null,
      confidence: "insufficient",
    };
  }

  const middle = Math.floor(sampleSize / 2);
  const suggestedPrice = sampleSize % 2 === 0
    ? Math.round((prices[middle - 1] + prices[middle]) / 2)
    : prices[middle];

  return {
    suggestedPrice,
    sampleSize,
    minPrice: prices[0],
    maxPrice: prices[prices.length - 1],
    confidence: sampleSize >= 15 ? "high" : sampleSize >= 7 ? "medium" : "low",
  };
}
