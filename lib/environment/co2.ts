/**
 * Çevresel etki — önlenen CO₂ ve eşdeğerleri.
 *
 * Türkiye şebeke emisyon faktörü 2026 ~0.45 kg CO₂/kWh (kullanıcı
 * güncelleyebilir; TEİAŞ/IEA referans mertebesi).
 */

export const TR_GRID_EMISSION_FACTOR = 0.45; // kg CO₂ / kWh
const TREE_CO2_PER_YEAR = 22; // kg CO₂ / ağaç / yıl
const CAR_CO2_PER_KM = 0.12; // kg CO₂ / km (ort. binek)

export interface EnvironmentalImpact {
  /** Yıllık önlenen CO₂, ton. */
  annualCo2TonnesAvoided: number;
  /** Proje ömrü boyunca önlenen CO₂, ton. */
  lifetimeCo2TonnesAvoided: number;
  /** Eşdeğer dikilen ağaç (yıllık absorbe bazında). */
  equivalentTreesPerYear: number;
  /** Eşdeğer otomobil km (yıllık). */
  equivalentCarKmPerYear: number;
}

export function environmentalImpact(params: {
  annualEnergyKwh: number;
  lifetimeYears: number;
  /** Yıllık degradasyon (toplam üretimi düşürür). */
  degradationRate?: number;
  emissionFactor?: number;
}): EnvironmentalImpact {
  const ef = params.emissionFactor ?? TR_GRID_EMISSION_FACTOR;
  const deg = params.degradationRate ?? 0.005;

  const annualKg = params.annualEnergyKwh * ef;

  let lifetimeKwh = 0;
  for (let y = 1; y <= params.lifetimeYears; y++) {
    lifetimeKwh += params.annualEnergyKwh * Math.pow(1 - deg, y - 1);
  }
  const lifetimeKg = lifetimeKwh * ef;

  return {
    annualCo2TonnesAvoided: round2(annualKg / 1000),
    lifetimeCo2TonnesAvoided: round2(lifetimeKg / 1000),
    equivalentTreesPerYear: Math.round(annualKg / TREE_CO2_PER_YEAR),
    equivalentCarKmPerYear: Math.round(annualKg / CAR_CO2_PER_KM),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
