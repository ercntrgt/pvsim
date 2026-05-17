import type { FinanceInputs } from "./types";
import { buildCashflow } from "./cashflow";

export type TornadoVariable =
  | "tariffEscalation"
  | "capex"
  | "annualEnergyKwh"
  | "annualOpex"
  | "discountRate";

export interface TornadoEntry {
  variable: TornadoVariable;
  label: string;
  baseNpv: number;
  lowNpv: number;
  highNpv: number;
  /** |highNpv - lowNpv|, sıralama için. */
  swing: number;
}

const LABELS: Record<TornadoVariable, string> = {
  tariffEscalation: "Tarife Artışı",
  capex: "Yatırım Maliyeti (CapEx)",
  annualEnergyKwh: "Yıllık Üretim",
  annualOpex: "İşletme Gideri (OpEx)",
  discountRate: "İskonto Oranı",
};

function withOverride(
  base: FinanceInputs,
  v: TornadoVariable,
  factor: number,
): FinanceInputs {
  const next = { ...base };
  switch (v) {
    case "tariffEscalation":
      next.tariffEscalation = base.tariffEscalation * factor;
      break;
    case "capex":
      next.capex = base.capex * factor;
      break;
    case "annualEnergyKwh":
      next.annualEnergyKwh = base.annualEnergyKwh * factor;
      break;
    case "annualOpex":
      next.annualOpex = base.annualOpex * factor;
      break;
    case "discountRate":
      next.discountRate = base.discountRate * factor;
      break;
  }
  return next;
}

/**
 * Tornado duyarlılık analizi: her değişken ±delta (varsayılan %20) oynatılır,
 * NPV etkisi swing'e göre azalan sırada döner.
 */
export function tornado(
  base: FinanceInputs,
  delta = 0.2,
): TornadoEntry[] {
  const baseNpv = buildCashflow(base).npv;
  const vars: TornadoVariable[] = [
    "tariffEscalation",
    "capex",
    "annualEnergyKwh",
    "annualOpex",
    "discountRate",
  ];
  return vars
    .map((v) => {
      const lowNpv = buildCashflow(withOverride(base, v, 1 - delta)).npv;
      const highNpv = buildCashflow(withOverride(base, v, 1 + delta)).npv;
      return {
        variable: v,
        label: LABELS[v],
        baseNpv,
        lowNpv,
        highNpv,
        swing: Math.abs(highNpv - lowNpv),
      };
    })
    .sort((a, b) => b.swing - a.swing);
}

export interface MonteCarloResult {
  iterations: number;
  npv: { p10: number; p50: number; p90: number; mean: number };
  irr: { p10: number; p50: number; p90: number; mean: number };
  probabilityNpvPositive: number;
}

/** Üçgen dağılımdan örnekleme (min, mode, max). */
function triangular(min: number, mode: number, max: number, r: number): number {
  const c = (mode - min) / (max - min);
  return r < c
    ? min + Math.sqrt(r * (max - min) * (mode - min))
    : max - Math.sqrt((1 - r) * (max - min) * (max - mode));
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Monte Carlo: CapEx, üretim, tarife artışı ve OpEx üzerinde üçgen
 * dağılımlarla N iterasyon. P10/P50/P90 NPV & IRR döner.
 */
export function monteCarlo(
  base: FinanceInputs,
  iterations = 1000,
  seed = 12345,
): MonteCarloResult {
  // Deterministik LCG (testlerin tekrarlanabilir olması için).
  let s = seed >>> 0;
  const rng = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const npvs: number[] = [];
  const irrs: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample: FinanceInputs = {
      ...base,
      capex: triangular(base.capex * 0.9, base.capex, base.capex * 1.15, rng()),
      annualEnergyKwh: triangular(
        base.annualEnergyKwh * 0.92,
        base.annualEnergyKwh,
        base.annualEnergyKwh * 1.05,
        rng(),
      ),
      tariffEscalation: triangular(
        base.tariffEscalation * 0.6,
        base.tariffEscalation,
        base.tariffEscalation * 1.3,
        rng(),
      ),
      annualOpex: triangular(
        base.annualOpex * 0.8,
        base.annualOpex,
        base.annualOpex * 1.3,
        rng(),
      ),
    };
    const r = buildCashflow(sample);
    npvs.push(r.npv);
    if (r.irr !== null) irrs.push(r.irr);
  }
  npvs.sort((a, b) => a - b);
  irrs.sort((a, b) => a - b);
  const mean = (arr: number[]) =>
    arr.reduce((x, y) => x + y, 0) / (arr.length || 1);

  return {
    iterations,
    npv: {
      p10: Math.round(percentile(npvs, 0.1)),
      p50: Math.round(percentile(npvs, 0.5)),
      p90: Math.round(percentile(npvs, 0.9)),
      mean: Math.round(mean(npvs)),
    },
    irr: {
      p10: round4(percentile(irrs, 0.1)),
      p50: round4(percentile(irrs, 0.5)),
      p90: round4(percentile(irrs, 0.9)),
      mean: round4(mean(irrs)),
    },
    probabilityNpvPositive:
      round4(npvs.filter((n) => n > 0).length / npvs.length),
  };
}

export interface ScenarioComparison {
  /**
   * GES: CapEx yatırılır, yıllık net işletme akışları mevduat faizinde
   * yeniden değerlendirilir → ömür sonu servet (nominal ₺).
   */
  pvInvestmentTerminal: number;
  /** Aynı CapEx 1. günden mevduatta bileşik → ömür sonu servet. */
  bankDepositTerminal: number;
  /** "Yatırım yapma" — referans (servet yok). */
  doNothingTerminal: number;
  /** GES serveti − mevduat serveti (pozitif → GES avantajlı). */
  advantageOverDeposit: number;
}

/**
 * "Bu GES vs. banka mevduatı vs. hiç yatırım yapmama" karşılaştırması.
 *
 * Adil terminal-servet bazı: HER İKİ senaryoda da başlangıç sermayesi
 * `capex`. Mevduat: capex 1. günden faize girer, ömür sonuna bileşiklenir.
 * GES: capex tesise harcanır; yıllık proje (unlevered) net nakit akışları
 * aynı mevduat faizinde ömür sonuna kadar yeniden değerlendirilir.
 *
 * @param depositRate yıllık brüt mevduat faizi (örn 0.40)
 */
export function compareScenarios(
  base: FinanceInputs,
  depositRate: number,
): ScenarioComparison {
  const r = buildCashflow(base);
  const n = base.lifetimeYears;

  // GES: proje akışları (capex hariç) mevduatta reinvest, ömür sonuna FV.
  let gesTerminal = 0;
  for (let t = 1; t <= n; t++) {
    const cf = r.projectCashFlows[t] ?? 0; // t. yıl işletme net akışı
    gesTerminal += cf * Math.pow(1 + depositRate, n - t);
  }

  // Mevduat: aynı capex 1. günden bileşik.
  const bankTerminal = base.capex * Math.pow(1 + depositRate, n);

  return {
    pvInvestmentTerminal: Math.round(gesTerminal),
    bankDepositTerminal: Math.round(bankTerminal),
    doNothingTerminal: 0,
    advantageOverDeposit: Math.round(gesTerminal - bankTerminal),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
