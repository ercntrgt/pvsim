/**
 * Aylık mahsuplaşma (net metering) — Türkiye Lisanssız Üretim (≤5 MW).
 *
 * Modelleme (2026, EPDK Lisanssız Üretim Yönetmeliği amended):
 *  - Anlık öz tüketim: perakende efektif fiyattan (aktif+dağıtım+vergi)
 *    TASARRUF sağlar.
 *  - Aylık netleştirme: ay içindeki ihracat, ithalatı AKTİF ENERJİ
 *    bedelinden mahsup eder.
 *  - Ay sonunda kalan net fazla (üretim > tüketim): görevli tedarik
 *    şirketince düşük bir birim fiyattan alınır (surplusFactor; 2022
 *    değişikliği sonrası fazla enerji düşük değerlenir — varsayılan 0.30).
 */

import {
  type TariffStructure,
  retailEffectivePrice,
  exportUnitPrice,
} from "./trTariffs";

export interface NetMeteringOptions {
  /**
   * Ay sonu net fazlanın aktif enerji fiyatına oranı (0–1).
   * 2022 sonrası fazla enerji düşük değerlenir; varsayılan 0.30.
   */
  surplusFactor?: number;
}

export interface MonthlyBilling {
  month: number;
  selfConsumed: number;
  exported: number;
  imported: number;
  /** Öz tüketim tasarrufu (₺). */
  selfConsumedValue: number;
  /** İhracatın ithalatı mahsup eden kısmının değeri (₺). */
  offsetValue: number;
  /** Ay sonu net fazla satış geliri (₺). */
  surplusValue: number;
  /** Toplam aylık GES değeri (₺). */
  totalValue: number;
}

export interface NetMeteringResult {
  monthly: MonthlyBilling[];
  annualSelfConsumedValue: number;
  annualOffsetValue: number;
  annualSurplusValue: number;
  /** Yıllık toplam GES finansal faydası (₺). */
  annualTotalValue: number;
  /** Üretilen kWh başına harmanlanmış değer (finance modülüne girer). */
  blendedValuePerKwh: number;
}

/** Saat indeksinden yerel saat (üreticiler 0-23 yerel sıralı). */
function localHourOf(index: number): number {
  return ((index % 24) + 24) % 24;
}

function monthOf(index: number): number {
  const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let h = index;
  for (let m = 0; m < 12; m++) {
    const mh = DAYS[m] * 24;
    if (h < mh) return m;
    h -= mh;
  }
  return 11;
}

/**
 * Saatlik üretim & tüketim + tarife → aylık mahsuplaşma ve yıllık GES değeri.
 */
export function computeNetMetering(
  generationKwh: number[],
  consumptionKwh: number[],
  tariff: TariffStructure,
  options: NetMeteringOptions = {},
): NetMeteringResult {
  const surplusFactor = options.surplusFactor ?? 0.3;
  const n = Math.min(generationKwh.length, consumptionKwh.length);

  const monthly: MonthlyBilling[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    selfConsumed: 0,
    exported: 0,
    imported: 0,
    selfConsumedValue: 0,
    offsetValue: 0,
    surplusValue: 0,
    totalValue: 0,
  }));

  let totalGeneration = 0;

  for (let i = 0; i < n; i++) {
    const g = Math.max(0, generationKwh[i]);
    const c = Math.max(0, consumptionKwh[i]);
    const self = Math.min(g, c);
    const exp = g - self;
    const imp = c - self;
    const lh = localHourOf(i);
    const mi = monthOf(i);
    const m = monthly[mi];

    m.selfConsumed += self;
    m.exported += exp;
    m.imported += imp;
    m.selfConsumedValue += self * retailEffectivePrice(tariff, lh);
    totalGeneration += g;
  }

  let annualSelf = 0;
  let annualOffset = 0;
  let annualSurplus = 0;

  for (const m of monthly) {
    // Mahsup: ihracatın ithalatı karşılayan kısmı aktif enerji bedelinden.
    // Ortalama ihracat saati gündüz olduğundan gündüz aktif fiyatı kullan.
    const exportPrice = exportUnitPrice(tariff, 12);
    const offsetKwh = Math.min(m.exported, m.imported);
    const surplusKwh = Math.max(0, m.exported - m.imported);

    m.offsetValue = offsetKwh * exportPrice;
    m.surplusValue = surplusKwh * exportPrice * surplusFactor;
    m.totalValue =
      round2(m.selfConsumedValue) +
      round2(m.offsetValue) +
      round2(m.surplusValue);
    m.selfConsumedValue = round2(m.selfConsumedValue);
    m.offsetValue = round2(m.offsetValue);
    m.surplusValue = round2(m.surplusValue);
    m.selfConsumed = Math.round(m.selfConsumed);
    m.exported = Math.round(m.exported);
    m.imported = Math.round(m.imported);

    annualSelf += m.selfConsumedValue;
    annualOffset += m.offsetValue;
    annualSurplus += m.surplusValue;
  }

  const annualTotal = annualSelf + annualOffset + annualSurplus;
  return {
    monthly,
    annualSelfConsumedValue: round2(annualSelf),
    annualOffsetValue: round2(annualOffset),
    annualSurplusValue: round2(annualSurplus),
    annualTotalValue: round2(annualTotal),
    blendedValuePerKwh:
      totalGeneration > 0
        ? Math.round((annualTotal / totalGeneration) * 10000) / 10000
        : 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
