/**
 * Geri ödeme süresi hesapları.
 *
 * Girdi konvansiyonu: cashflows[0] = t0 (genelde negatif yatırım),
 * cashflows[t] = t. yıl net akışı. Kümülatif akış ilk kez 0'ı geçtiği
 * yıl, yıl içinde doğrusal interpolasyon ile kesirli olarak döner.
 *
 * Hiç geri dönmüyorsa `null`.
 */
function paybackFromSeries(series: number[]): number | null {
  let cumulative = 0;
  for (let t = 0; t < series.length; t++) {
    const prev = cumulative;
    cumulative += series[t];
    if (cumulative >= 0 && t > 0) {
      const yearFlow = series[t];
      if (yearFlow === 0) return t;
      // prev < 0, cumulative >= 0 → yıl içinde fraksiyon
      const fraction = -prev / yearFlow;
      return t - 1 + fraction;
    }
  }
  return null;
}

/** Basit (iskontosuz) geri ödeme süresi, yıl. */
export function simplePayback(cashflows: number[]): number | null {
  return paybackFromSeries(cashflows);
}

/** İskonto edilmiş geri ödeme süresi, yıl. */
export function discountedPayback(
  cashflows: number[],
  discountRate: number,
): number | null {
  const discounted = cashflows.map(
    (cf, t) => cf / Math.pow(1 + discountRate, t),
  );
  return paybackFromSeries(discounted);
}
