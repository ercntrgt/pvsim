/**
 * Üretim–tüketim eşleştirme.
 *
 * Saatlik üretim ve tüketim dizilerinden anlık öz tüketim, şebekeye verilen
 * fazla ve şebekeden çekilen enerjiyi hesaplar. Mahsuplaşma (netMetering)
 * modülü bu aylık değerleri kullanır.
 */

export interface MatchResult {
  /** Yıllık üretim, kWh. */
  totalGeneration: number;
  /** Yıllık tüketim, kWh. */
  totalConsumption: number;
  /** Anlık öz tüketilen (üretim ∧ tüketim), kWh. */
  selfConsumed: number;
  /** Şebekeye verilen fazla üretim, kWh. */
  exported: number;
  /** Şebekeden çekilen, kWh. */
  imported: number;
  /** Öz tüketim oranı = selfConsumed / üretim. */
  selfConsumptionRate: number;
  /** Öz yeterlilik (autarky) = selfConsumed / tüketim. */
  selfSufficiency: number;
  /** Aylık kırılım (12). */
  monthly: MonthlyMatch[];
}

export interface MonthlyMatch {
  month: number; // 1-12
  generation: number;
  consumption: number;
  selfConsumed: number;
  exported: number;
  imported: number;
}

/** Saat indexinden ay (1-12). 2023 takvimi (8760 saat). */
function hourToMonth(hourIndex: number): number {
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let h = hourIndex;
  for (let m = 0; m < 12; m++) {
    const monthHours = DAYS[m] * 24;
    if (h < monthHours) return m + 1;
    h -= monthHours;
  }
  return 12;
}

/**
 * Saatlik üretim & tüketim → eşleştirme metrikleri.
 * Diziler eşit uzunlukta olmalı (8760 önerilir); kısa olan kadar işlenir.
 */
export function matchGenerationConsumption(
  generationKwh: number[],
  consumptionKwh: number[],
): MatchResult {
  const n = Math.min(generationKwh.length, consumptionKwh.length);
  const monthly: MonthlyMatch[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    generation: 0,
    consumption: 0,
    selfConsumed: 0,
    exported: 0,
    imported: 0,
  }));

  let totalGen = 0;
  let totalCons = 0;
  let selfConsumed = 0;
  let exported = 0;
  let imported = 0;

  for (let i = 0; i < n; i++) {
    const g = Math.max(0, generationKwh[i]);
    const c = Math.max(0, consumptionKwh[i]);
    const self = Math.min(g, c);
    const exp = g - self;
    const imp = c - self;

    const mi = hourToMonth(i) - 1;
    const m = monthly[mi];
    m.generation += g;
    m.consumption += c;
    m.selfConsumed += self;
    m.exported += exp;
    m.imported += imp;

    totalGen += g;
    totalCons += c;
    selfConsumed += self;
    exported += exp;
    imported += imp;
  }

  return {
    totalGeneration: round(totalGen),
    totalConsumption: round(totalCons),
    selfConsumed: round(selfConsumed),
    exported: round(exported),
    imported: round(imported),
    selfConsumptionRate: totalGen > 0 ? round4(selfConsumed / totalGen) : 0,
    selfSufficiency: totalCons > 0 ? round4(selfConsumed / totalCons) : 0,
    monthly: monthly.map((m) => ({
      month: m.month,
      generation: round(m.generation),
      consumption: round(m.consumption),
      selfConsumed: round(m.selfConsumed),
      exported: round(m.exported),
      imported: round(m.imported),
    })),
  };
}

function round(n: number): number {
  return Math.round(n);
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
