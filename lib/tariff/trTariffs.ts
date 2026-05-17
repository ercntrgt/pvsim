/**
 * Türkiye elektrik tarifeleri (2026 tahmini varsayılanlar).
 *
 * NOT: Tarifeler EPDK tarafından çeyreklik güncellenir. Buradaki değerler
 * 2026 başı tahmini mertebelerdir ve kullanıcı tarafından güncellenmelidir
 * (data/tariffs.tr.json + UI tarife editörü). Birim: ₺/kWh, vergiler oran.
 */

export type TariffCategory =
  | "mesken" // konut
  | "ticarethane" // ticari
  | "sanayi" // OG/AG sanayi
  | "tarimsal"; // tarımsal sulama

export type TimeOfUse = "single" | "three";

/** Üç zamanlı dilim sınırları (yerel saat). */
export const TOU_PERIODS = {
  gunduz: { startHour: 6, endHour: 17 }, // 06:00–17:00
  puant: { startHour: 17, endHour: 22 }, // 17:00–22:00
  gece: { startHour: 22, endHour: 6 }, // 22:00–06:00
} as const;

export interface TariffTaxes {
  /** Enerji fonu oranı (aktif+dağıtım üzerine). */
  energyFund: number;
  /** TRT payı oranı. */
  trtShare: number;
  /** Belediye tüketim vergisi (BTV/ETV) oranı. */
  municipalTax: number;
  /** KDV oranı. */
  vat: number;
}

export interface TariffStructure {
  category: TariffCategory;
  timeOfUse: TimeOfUse;
  /** Aktif enerji bedeli (₺/kWh). single → tek değer; three → 3 dilim. */
  activeEnergy: { single: number; gunduz: number; puant: number; gece: number };
  /** Dağıtım bedeli (₺/kWh). */
  distribution: number;
  taxes: TariffTaxes;
  /** Sürdürülebilir kaynak / diğer sabit bileşen (₺/kWh), opsiyonel. */
  otherPerKwh?: number;
  /** Yıl etiketi (raporlama). */
  year: number;
}

/** 2026 tahmini varsayılan tarifeler (₺/kWh, KDV hariç bileşenler). */
export const TR_DEFAULT_TARIFFS: Record<TariffCategory, TariffStructure> = {
  mesken: {
    category: "mesken",
    timeOfUse: "single",
    activeEnergy: { single: 2.45, gunduz: 2.35, puant: 3.85, gece: 1.55 },
    distribution: 1.05,
    taxes: { energyFund: 0.01, trtShare: 0, municipalTax: 0.05, vat: 0.2 },
    year: 2026,
  },
  ticarethane: {
    category: "ticarethane",
    timeOfUse: "single",
    activeEnergy: { single: 3.05, gunduz: 2.95, puant: 4.55, gece: 1.95 },
    distribution: 1.15,
    taxes: { energyFund: 0.01, trtShare: 0, municipalTax: 0.05, vat: 0.2 },
    year: 2026,
  },
  sanayi: {
    category: "sanayi",
    timeOfUse: "three",
    activeEnergy: { single: 2.85, gunduz: 2.75, puant: 4.25, gece: 1.8 },
    distribution: 0.85,
    taxes: { energyFund: 0.01, trtShare: 0, municipalTax: 0.01, vat: 0.2 },
    year: 2026,
  },
  tarimsal: {
    category: "tarimsal",
    timeOfUse: "single",
    activeEnergy: { single: 2.25, gunduz: 2.15, puant: 3.45, gece: 1.45 },
    distribution: 0.75,
    taxes: { energyFund: 0.01, trtShare: 0, municipalTax: 0.01, vat: 0.2 },
    year: 2026,
  },
};

/** Saat → üç zamanlı dilim. */
export function touPeriodForHour(
  localHour: number,
): "gunduz" | "puant" | "gece" {
  const h = ((localHour % 24) + 24) % 24;
  if (h >= 6 && h < 17) return "gunduz";
  if (h >= 17 && h < 22) return "puant";
  return "gece";
}

/** Belirli saat için vergisiz aktif+dağıtım birim fiyatı (₺/kWh). */
export function baseUnitPrice(
  tariff: TariffStructure,
  localHour: number,
): number {
  let active: number;
  if (tariff.timeOfUse === "single") {
    active = tariff.activeEnergy.single;
  } else {
    active = tariff.activeEnergy[touPeriodForHour(localHour)];
  }
  return active + tariff.distribution + (tariff.otherPerKwh ?? 0);
}

/**
 * Tüketici için efektif (vergiler dahil) perakende birim fiyat — öz tüketilen
 * her kWh bu kadar tasarruf ettirir.
 */
export function retailEffectivePrice(
  tariff: TariffStructure,
  localHour: number,
): number {
  const base = baseUnitPrice(tariff, localHour);
  const { energyFund, trtShare, municipalTax, vat } = tariff.taxes;
  const preVat = base * (1 + energyFund + trtShare + municipalTax);
  return preVat * (1 + vat);
}

/**
 * Mahsuplaşmada şebekeye verilen fazla enerjinin birim değeri.
 * EPDK Lisanssız Üretim: perakende tek terimli AKTİF ENERJİ bedeli
 * (dağıtım ve vergiler hariç). Üç zamanlıda saat dilimine göre.
 */
export function exportUnitPrice(
  tariff: TariffStructure,
  localHour: number,
): number {
  if (tariff.timeOfUse === "single") return tariff.activeEnergy.single;
  return tariff.activeEnergy[touPeriodForHour(localHour)];
}
