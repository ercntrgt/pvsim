import type {
  FinanceInputs,
  FinanceResult,
  CashflowRow,
  LoanYearRow,
} from "./types";
import { npv } from "./npv";
import { irr } from "./irr";
import { lcoe } from "./lcoe";
import { simplePayback, discountedPayback } from "./payback";
import { loanSchedule, dscrByYear } from "./loan";

/**
 * 25 yıllık (lifetimeYears) nakit akışı tablosunu kurar ve tüm finansal
 * metrikleri (NPV, IRR, LCOE, payback, PI, DSCR) hesaplar.
 *
 * Modelleme notları:
 *  - Enerji her yıl (1 - degradasyon)^(t-1) ile azalır.
 *  - Enerji birim değeri ve OpEx yıllık eskalasyonla büyür (bileşik).
 *  - Inverter değişimi tek seferlik gider olarak ilgili yıla yazılır.
 *  - Kredi varsa: özkaynak akışı = proje akışı - kredi taksiti + (t0'da +kredi).
 */
export function buildCashflow(input: FinanceInputs): FinanceResult {
  const {
    capex,
    lifetimeYears,
    discountRate,
    annualEnergyKwh,
    degradationRate,
    energyValuePerKwh,
    tariffEscalation,
    annualOpex,
    opexEscalation,
    inverterReplacementCost = 0,
    inverterReplacementYear = 11,
    loan,
  } = input;

  const loanSched: LoanYearRow[] = loan ? loanSchedule(loan) : [];
  const equityAtT0 = capex - (loan?.principal ?? 0);

  const schedule: CashflowRow[] = [];
  const opexByYear: number[] = [];
  const energyByYear: number[] = [];
  const projectCashFlows: number[] = [-capex]; // unlevered
  const equityCashFlows: number[] = [-equityAtT0]; // levered
  const operatingCashFlowByYear: number[] = []; // DSCR için (kredi öncesi)

  let cumulative = 0;
  let cumulativeDiscounted = 0;
  let totalEnergy = 0;
  let totalRevenue = 0;

  for (let year = 1; year <= lifetimeYears; year++) {
    const energy =
      annualEnergyKwh * Math.pow(1 - degradationRate, year - 1);
    const unitValue =
      energyValuePerKwh * Math.pow(1 + tariffEscalation, year - 1);
    const revenue = energy * unitValue;
    const opex = annualOpex * Math.pow(1 + opexEscalation, year - 1);
    const oneOff =
      inverterReplacementCost > 0 && year === inverterReplacementYear
        ? inverterReplacementCost
        : 0;

    const operatingCf = revenue - opex - oneOff; // kredi öncesi (proje)
    const loanRow = loanSched[year - 1];
    const loanPayment = loanRow ? loanRow.payment : 0;
    const netCf = operatingCf - loanPayment; // özkaynak bakışı

    cumulative += netCf;
    const discounted = netCf / Math.pow(1 + discountRate, year);
    cumulativeDiscounted += discounted;

    schedule.push({
      year,
      energyKwh: round(energy),
      revenue: round(revenue),
      opex: round(-opex),
      oneOff: round(-oneOff),
      loanPayment: round(-loanPayment),
      netCashFlow: round(netCf),
      cumulativeCashFlow: round(cumulative),
      discountedCashFlow: round(discounted),
      cumulativeDiscountedCashFlow: round(cumulativeDiscounted),
    });

    opexByYear.push(opex + oneOff);
    energyByYear.push(energy);
    operatingCashFlowByYear.push(operatingCf);
    projectCashFlows.push(operatingCf);
    equityCashFlows.push(netCf);
    totalEnergy += energy;
    totalRevenue += revenue;
  }

  const projectNpv = npv(discountRate, projectCashFlows);
  const dscrSeries = loan ? dscrByYear(operatingCashFlowByYear, loanSched) : [];
  const minDscr =
    dscrSeries.length > 0
      ? Math.min(...dscrSeries.filter((d) => Number.isFinite(d)))
      : null;

  return {
    capex,
    equityCashFlows,
    projectCashFlows,
    schedule,
    npv: round(projectNpv),
    irr: irr(projectCashFlows),
    equityIrr: loan ? irr(equityCashFlows) : irr(projectCashFlows),
    lcoe:
      Math.round(
        lcoe({ capex, opexByYear, energyByYear, discountRate }) * 10000,
      ) / 10000,
    simplePaybackYears: round2OrNull(simplePayback(projectCashFlows)),
    discountedPaybackYears: round2OrNull(
      discountedPayback(projectCashFlows, discountRate),
    ),
    profitabilityIndex: round4(projectNpv / capex + 1),
    minDscr: minDscr !== null ? round4(minDscr) : null,
    loanSchedule: loan ? loanSched : null,
    totalEnergyKwh: round(totalEnergy),
    totalRevenue: round(totalRevenue),
  };
}

function round(n: number): number {
  return Math.round(n);
}
function round2OrNull(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
