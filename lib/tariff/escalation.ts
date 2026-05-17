/**
 * Tarife / makro eskalasyon yardımcıları.
 *
 * Türkiye'de elektrik tarifeleri yüksek enflasyona bağlı artar. Finansal
 * modelde yıllık tarife artışı bileşik uygulanır.
 */

/** t. yıl için eskalasyonlu birim değer (yıl 1 = baz). */
export function escalatedValue(
  baseValue: number,
  annualEscalation: number,
  year: number,
): number {
  return baseValue * Math.pow(1 + annualEscalation, Math.max(0, year - 1));
}

/** Reel iskonto oranı (Fisher): (1+nominal)/(1+enflasyon) - 1. */
export function realDiscountRate(
  nominalRate: number,
  inflation: number,
): number {
  return (1 + nominalRate) / (1 + inflation) - 1;
}

/**
 * N yıllık eskalasyonlu seri (yıl 1..N), baz değer * (1+e)^(t-1).
 */
export function escalationSeries(
  baseValue: number,
  annualEscalation: number,
  years: number,
): number[] {
  return Array.from({ length: years }, (_, i) =>
    escalatedValue(baseValue, annualEscalation, i + 1),
  );
}
