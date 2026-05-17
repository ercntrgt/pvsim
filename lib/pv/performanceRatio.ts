/**
 * Performans Oranı (PR) ve spesifik üretim.
 *
 *   Reference Yield  Yr = H_poa(kWh/m²) / G_stc(1 kW/m²)  ⇒ sayısal = H_poa
 *   Final Yield      Yf = E_ac(kWh) / P0(kWp)
 *   PR = Yf / Yr
 */

export function specificYield(
  annualAcKwh: number,
  dcNameplateKwp: number,
): number {
  if (dcNameplateKwp <= 0) return 0;
  return annualAcKwh / dcNameplateKwp;
}

export function performanceRatio(
  annualAcKwh: number,
  dcNameplateKwp: number,
  annualPoaKwhM2: number,
): number {
  if (dcNameplateKwp <= 0 || annualPoaKwhM2 <= 0) return 0;
  const yf = annualAcKwh / dcNameplateKwp;
  const yr = annualPoaKwhM2; // / 1 kW/m²
  return yf / yr;
}

/** Türkiye için tipik spesifik üretim aralığı kontrolü (1300–1750). */
export function isTypicalForTurkey(specificYieldKwhKwp: number): boolean {
  return specificYieldKwhKwp >= 1250 && specificYieldKwhKwp <= 1850;
}
