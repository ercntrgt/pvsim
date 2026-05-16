/**
 * Net Bugünkü Değer (Net Present Value).
 *
 * Konvansiyon: cashflows[0] = t0 anındaki akış (genelde -yatırım),
 * cashflows[t] = t. yıl sonundaki net akış.
 *
 *   NPV = Σ_{t=0}^{N} CF_t / (1 + r)^t
 */
export function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce(
    (acc, cf, t) => acc + cf / Math.pow(1 + rate, t),
    0,
  );
}

/**
 * NPV'nin iskonto oranına göre türevi — IRR Newton-Raphson çözümünde kullanılır.
 *   dNPV/dr = Σ_{t=0}^{N} -t · CF_t / (1 + r)^{t+1}
 */
export function npvDerivative(rate: number, cashflows: number[]): number {
  return cashflows.reduce(
    (acc, cf, t) => acc - (t * cf) / Math.pow(1 + rate, t + 1),
    0,
  );
}

/** Gelecekteki tek bir tutarın bugünkü değeri. */
export function presentValue(amount: number, rate: number, year: number): number {
  return amount / Math.pow(1 + rate, year);
}
