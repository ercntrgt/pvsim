import { npv, npvDerivative } from "./npv";

/**
 * İç Verim Oranı (Internal Rate of Return).
 *
 * NPV(r) = 0 olacak r oranını bulur. Önce Newton-Raphson denenir,
 * yakınsamazsa [-0.99, 10] aralığında bisection'a düşer (sağlamlık için).
 *
 * Tek işaret değişimi olmayan akışlarda (örn. hiç pozitif yıl yok) `null` döner.
 */
export function irr(cashflows: number[], guess = 0.12): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((c) => c > 0);
  const hasNegative = cashflows.some((c) => c < 0);
  if (!hasPositive || !hasNegative) return null;

  // 1) Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 80; i++) {
    const f = npv(rate, cashflows);
    if (Math.abs(f) < 1e-6) return rate;
    const df = npvDerivative(rate, cashflows);
    if (df === 0 || !Number.isFinite(df)) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // 2) Bisection fallback
  let lo = -0.99;
  let hi = 10;
  let flo = npv(lo, cashflows);
  let fhi = npv(hi, cashflows);
  if (flo * fhi > 0) return null; // aralıkta kök yok
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid, cashflows);
    if (Math.abs(fmid) < 1e-7) return mid;
    if (flo * fmid < 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}
