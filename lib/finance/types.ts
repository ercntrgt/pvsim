/**
 * Finansal analiz ortak tipleri.
 *
 * Tüm para birimleri ₺ (TRY), enerji kWh, oranlar ondalık (0.15 = %15).
 * Nakit akışı dizilerinde index 0 = t0 (yatırım anı), index t = t. yıl sonu.
 */

export interface FinanceInputs {
  /** Toplam yatırım maliyeti (KDV dahil), t0'da negatif akış. */
  capex: number;
  /** Proje ömrü (yıl), tipik 25. */
  lifetimeYears: number;
  /** Yıllık iskonto oranı (WACC / beklenen getiri), 0.15 = %15. */
  discountRate: number;
  /** 1. yıl net üretilen enerji (kWh/yıl, kayıplar düşülmüş). */
  annualEnergyKwh: number;
  /** Yıllık modül degradasyonu (0.005 = %0.5/yıl). */
  degradationRate: number;
  /** 1. yıl tasarruf edilen + satılan enerji birim değeri (₺/kWh karması). */
  energyValuePerKwh: number;
  /** Elektrik tarifesi yıllık artış oranı (0.20 = %20). */
  tariffEscalation: number;
  /** 1. yıl işletme gideri (₺/yıl). */
  annualOpex: number;
  /** OpEx yıllık artış (enflasyon, 0.20 = %20). */
  opexEscalation: number;
  /** Inverter değişim rezervi (₺), 0 ise yok. */
  inverterReplacementCost?: number;
  /** Inverter değişim yılı (tipik 11). */
  inverterReplacementYear?: number;
  /** Opsiyonel kredi tanımı. */
  loan?: LoanInputs;
}

export interface LoanInputs {
  /** Kredi anapara (₺). */
  principal: number;
  /** Yıllık nominal faiz (0.45 = %45). */
  annualRate: number;
  /** Vade (yıl). */
  termYears: number;
}

export interface LoanYearRow {
  year: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface CashflowRow {
  year: number;
  /** O yıl üretilen enerji (degradasyonlu), kWh. */
  energyKwh: number;
  /** Enerjiden gelen brüt fayda (tasarruf + satış), ₺. */
  revenue: number;
  /** İşletme gideri (-), ₺. */
  opex: number;
  /** Inverter değişimi gibi tek seferlik gider (-), ₺. */
  oneOff: number;
  /** Kredi taksiti (-), ₺. */
  loanPayment: number;
  /** Net nakit akışı (özkaynak bakışı), ₺. */
  netCashFlow: number;
  cumulativeCashFlow: number;
  discountedCashFlow: number;
  cumulativeDiscountedCashFlow: number;
}

export interface FinanceResult {
  capex: number;
  /** t0 dahil nakit akış dizisi (özkaynak). [0] = -özkaynak, [t] = net. */
  equityCashFlows: number[];
  /** t0 dahil proje (unlevered) nakit akışı: [0] = -capex. */
  projectCashFlows: number[];
  schedule: CashflowRow[];
  npv: number;
  irr: number | null;
  /** Özkaynak IRR'ı (kredi varsa anlamlı). */
  equityIrr: number | null;
  lcoe: number;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  profitabilityIndex: number;
  /** Kredi varsa min DSCR, yoksa null. */
  minDscr: number | null;
  loanSchedule: LoanYearRow[] | null;
  totalEnergyKwh: number;
  totalRevenue: number;
}
