/**
 * Uçtan uca fizibilite orkestratörü.
 *
 * Zincir: katalog → boyutlandırma → solar kaynak → PV simülasyon (yıl 1) →
 * tüketim profili → eşleştirme → mahsuplaşma → finans (25y nakit akışı,
 * NPV/IRR/LCOE/payback) → duyarlılık → çevre → mevzuat.
 *
 * Saf hesap (DB/IO yok); /api/simulate ve PDF rapor bunu çağırır.
 */

import type { FeasibilityInput } from "./types";
import { getPanelById, getInverterById, getTariffs } from "../data/catalog";
import { recommendSystem } from "../pv/sizing";
import { resolveSolarResource } from "../solar";
import { simulatePvSystem, optimalTilt } from "../pv/pvwatts";
import {
  syntheticConsumption,
  fromMonthlyTotals,
} from "../consumption/syntheticProfile";
import { normalizeTo8760 } from "../consumption/profileParser";
import { matchGenerationConsumption } from "../consumption/matcher";
import { computeNetMetering } from "../tariff/netMetering";
import { TR_DEFAULT_TARIFFS, type TariffStructure } from "../tariff/trTariffs";
import { buildCashflow } from "../finance/cashflow";
import { tornado, compareScenarios } from "../finance/sensitivity";
import { environmentalImpact } from "../environment/co2";
import { checkEpdkCompliance } from "../regulation/epdk";
import { assessYekdem } from "../regulation/yekdem";

export async function runFeasibility(input: FeasibilityInput) {
  // ── 1. Katalog ──────────────────────────────────────────────
  const panel = getPanelById(input.system.panelId);
  const inverter = getInverterById(input.system.inverterId);
  if (!panel) throw new Error(`Panel bulunamadı: ${input.system.panelId}`);
  if (!inverter)
    throw new Error(`Inverter bulunamadı: ${input.system.inverterId}`);

  // ── 2. Boyutlandırma ────────────────────────────────────────
  const sizing = recommendSystem({
    panel,
    inverter,
    targetKwp: input.system.targetKwp,
    usableAreaM2: input.system.usableAreaM2,
    minAmbientC: -10,
  });
  const dcKwp = sizing.dcKwp;
  const inverterCount = Math.max(
    1,
    Math.round(dcKwp / (inverter.acRatedW / 1000) / 1.2),
  );
  const totalAcW = inverterCount * inverter.acRatedW;

  // ── 3. Solar kaynak ─────────────────────────────────────────
  const tz = input.location.timezoneOffsetHours ?? 3;
  const solar = await resolveSolarResource({
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    timezoneOffsetHours: tz,
    preferEmbedded: input.location.preferEmbedded,
  });

  // ── 4. Eğim ─────────────────────────────────────────────────
  const azimuth = input.system.azimuth ?? 180;
  const mountType =
    input.system.mountType ??
    (input.project.connectionType === "arazi" ? "open_rack" : "roof_mount");
  const baseCfg = {
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    timezoneOffsetHours: tz,
    dcNameplateKwp: dcKwp,
    tempCoeffPmaxPctPerC: panel.tempCoeffPmaxPctPerC,
    surfaceAzimuth: azimuth,
    albedo: input.system.albedo,
    mountType,
    inverter: {
      acRatedW: totalAcW,
      nominalEfficiency: inverter.euroEfficiency,
    },
    losses: input.system.losses,
    horizonProfile: input.system.horizonProfile,
    annualDegradation: panel.annualDegradationPct / 100,
    year: 1,
  };

  let tilt: number;
  if (input.system.tilt === "auto" || input.system.tilt === undefined) {
    tilt = optimalTilt(solar.hourly, baseCfg, {
      min: 5,
      max: 50,
      step: 2,
    }).tilt;
  } else {
    tilt = input.system.tilt;
  }

  // ── 5. PV simülasyon (yıl 1) ────────────────────────────────
  const pv = simulatePvSystem(solar.hourly, { ...baseCfg, surfaceTilt: tilt });

  // ── 6. Tüketim profili ──────────────────────────────────────
  let consumptionHourly: number[];
  if (input.consumption.method === "hourly" && input.consumption.hourlyKwh) {
    consumptionHourly = normalizeTo8760(input.consumption.hourlyKwh);
  } else if (
    input.consumption.method === "monthly" &&
    input.consumption.monthlyKwh
  ) {
    consumptionHourly = fromMonthlyTotals(
      input.consumption.monthlyKwh,
      input.consumption.sector ?? "mesken",
    );
  } else {
    consumptionHourly = syntheticConsumption(
      input.consumption.annualKwh ?? pv.annualAcKwh,
      input.consumption.sector ?? "mesken",
    );
  }

  // PV saatlik dizisini tüketimle hizala (her ikisi de 8760)
  const genHourly = normalizeTo8760(pv.hourlyAcKwh);
  consumptionHourly = normalizeTo8760(consumptionHourly);

  const match = matchGenerationConsumption(genHourly, consumptionHourly);

  // ── 7. Tarife & mahsuplaşma ─────────────────────────────────
  const tariff: TariffStructure = {
    ...TR_DEFAULT_TARIFFS[input.tariff.category],
    ...(input.tariff.timeOfUse
      ? { timeOfUse: input.tariff.timeOfUse }
      : {}),
  };
  const netMetering = computeNetMetering(
    genHourly,
    consumptionHourly,
    tariff,
    { surplusFactor: input.tariff.surplusFactor },
  );

  // ── 8. Finans ───────────────────────────────────────────────
  const capexPerKwp = input.finance.capexPerKwp ?? 21_000;
  const capex = input.finance.capex ?? Math.round(capexPerKwp * dcKwp);
  const annualOpex =
    input.finance.annualOpex ?? Math.round(capex * 0.012);
  const lifetimeYears = input.finance.lifetimeYears ?? 25;
  const discountRate = input.finance.discountRate ?? 0.2;
  const tariffEscalation = input.finance.tariffEscalation ?? 0.25;
  const opexEscalation = input.finance.opexEscalation ?? 0.25;
  const invReplShare =
    input.finance.inverterReplacementShareOfCapex ?? 0.08;
  const loanPrincipal = input.finance.loan
    ? input.finance.loan.principal ??
      Math.round(capex * (input.finance.loan.shareOfCapex ?? 0))
    : 0;

  const financeInputs = {
    capex,
    lifetimeYears,
    discountRate,
    annualEnergyKwh: pv.annualAcKwh,
    degradationRate: panel.annualDegradationPct / 100,
    energyValuePerKwh: netMetering.blendedValuePerKwh,
    tariffEscalation,
    annualOpex,
    opexEscalation,
    inverterReplacementCost: Math.round(capex * invReplShare),
    inverterReplacementYear: input.finance.inverterReplacementYear ?? 11,
    loan:
      input.finance.loan && loanPrincipal > 0
        ? {
            principal: loanPrincipal,
            annualRate: input.finance.loan.annualRate,
            termYears: input.finance.loan.termYears,
          }
        : undefined,
  };

  const finance = buildCashflow(financeInputs);
  const sensitivity = tornado(financeInputs);

  // GES vs banka mevduatı vs hiç yatırım yapmama
  const depositRate = input.finance.depositRate ?? 0.4;
  const scenarioVsDeposit = compareScenarios(financeInputs, depositRate);

  // ── 9. Çevre ────────────────────────────────────────────────
  const environment = environmentalImpact({
    annualEnergyKwh: pv.annualAcKwh,
    lifetimeYears,
    degradationRate: panel.annualDegradationPct / 100,
    emissionFactor: input.environment?.emissionFactor,
  });

  // ── 10. Mevzuat ─────────────────────────────────────────────
  const epdk = checkEpdkCompliance({
    dcKwp,
    acKw: totalAcW / 1000,
    connectionType: input.project.connectionType,
    annualConsumptionKwh:
      input.consumption.annualKwh ?? match.totalConsumption,
  });
  const yekdem = assessYekdem({
    acKw: totalAcW / 1000,
    isRooftop: input.project.connectionType !== "arazi",
  });

  return {
    project: {
      name: input.project.name,
      connectionType: input.project.connectionType,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      solarSource: solar.source,
      solarNote: solar.note,
      disclaimer:
        "Bu rapor bağlayıcı değildir. Resmi başvuru için EMO onaylı proje ve dağıtım şirketi görüşü gereklidir.",
    },
    system: {
      panel,
      inverter,
      inverterCount,
      dcKwp,
      acKw: totalAcW / 1000,
      tilt,
      azimuth,
      mountType,
      sizing,
    },
    energy: {
      annualAcKwh: pv.annualAcKwh,
      monthlyAcKwh: pv.monthlyAcKwh,
      annualPoaKwhM2: pv.annualPoaKwhM2,
      performanceRatio: pv.performanceRatio,
      specificYield: pv.specificYield,
      clippingLossKwh: pv.clippingLossKwh,
      avgCellTempC: pv.avgCellTempC,
      annualGhiKwhM2: solar.annualGhiKwhM2,
    },
    consumption: {
      method: input.consumption.method,
      sector: input.consumption.sector,
      ...match,
      netMetering,
    },
    finance: {
      // capex `...finance` (FinanceResult) içinden gelir
      capexPerKwp: Math.round(capex / dcKwp),
      annualOpex,
      discountRate,
      tariffEscalation,
      blendedValuePerKwh: netMetering.blendedValuePerKwh,
      depositRate,
      ...finance,
      sensitivity,
      scenarioVsDeposit,
    },
    environment,
    regulation: { epdk, yekdem },
  };
}

export type FeasibilityResult = Awaited<ReturnType<typeof runFeasibility>>;
