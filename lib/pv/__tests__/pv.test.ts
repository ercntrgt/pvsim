import { describe, it, expect } from "vitest";
import {
  cellTemperatureSandia,
  cellTemperatureNoct,
  arrayDcPower,
} from "../moduleModel";
import {
  inverterAcPower,
  inverterEfficiency,
  dcAcRatio,
} from "../inverterModel";
import {
  combinedDerate,
  totalLossPercent,
  degradationFactor,
  DEFAULT_LOSSES,
} from "../lossesModel";
import { performanceRatio, specificYield } from "../performanceRatio";
import { simulatePvSystem, optimalTilt } from "../pvwatts";
import { syntheticTmy } from "../../solar/trClimate";

describe("moduleModel", () => {
  it("Sandia: yüksek POA hücreyi ısıtır, açık konstrüksiyon en serin", () => {
    const open = cellTemperatureSandia(1000, 25, 1, "open_rack");
    const roof = cellTemperatureSandia(1000, 25, 1, "roof_mount");
    expect(open).toBeGreaterThan(40);
    expect(roof).toBeGreaterThan(open); // çatı daha sıcak
  });

  it("NOCT modeli STC'de makul", () => {
    expect(cellTemperatureNoct(800, 20, 45)).toBeCloseTo(45, 0);
  });

  it("DC güç sıcakta düşer (negatif katsayı)", () => {
    const cold = arrayDcPower(10000, -0.34, 1000, 25);
    const hot = arrayDcPower(10000, -0.34, 1000, 55);
    expect(cold).toBeCloseTo(10000, 0);
    expect(hot).toBeLessThan(cold);
    // -0.34%/°C × 30°C ≈ -%10.2
    expect(hot / cold).toBeCloseTo(1 - 0.34 / 100 * 30, 2);
  });
});

describe("inverterModel", () => {
  const inv = { acRatedW: 8000, nominalEfficiency: 0.975 };
  it("kısmi yük verimi nominal civarında", () => {
    const e = inverterEfficiency(6000, inv);
    expect(e).toBeGreaterThan(0.9);
    expect(e).toBeLessThan(0.99);
  });
  it("nominal AC üstünü kırpar", () => {
    const o = inverterAcPower(12000, inv);
    expect(o.acW).toBeCloseTo(8000, 0);
    expect(o.clippedW).toBeGreaterThan(0);
  });
  it("DC/AC oranı doğrulaması", () => {
    expect(dcAcRatio(10000, 8000).ok).toBe(true);
    expect(dcAcRatio(15000, 8000).ok).toBe(false); // 1.875 çok yüksek
  });
});

describe("lossesModel", () => {
  it("varsayılan kayıp derate ~0.90 (LID dahil)", () => {
    const d = combinedDerate(DEFAULT_LOSSES, true);
    expect(d).toBeGreaterThan(0.88);
    expect(d).toBeLessThan(0.92);
    expect(totalLossPercent(DEFAULT_LOSSES, true)).toBeGreaterThan(8);
  });
  it("degradasyon: 1. yıl 1.0, 11. yıl < 1", () => {
    expect(degradationFactor(1, 0.005)).toBe(1);
    expect(degradationFactor(11, 0.005)).toBeLessThan(1);
    expect(degradationFactor(11, 0.005)).toBeCloseTo(0.95, 2);
  });
});

describe("performanceRatio", () => {
  it("PR = Yf / Yr", () => {
    // 15000 kWh, 10 kWp, POA 1875 kWh/m² → PR 0.8
    expect(performanceRatio(15000, 10, 1875)).toBeCloseTo(0.8, 2);
    expect(specificYield(15000, 10)).toBe(1500);
  });
});

// ── pvsim-prompt.md doğrulama test case'leri ──────────────────────────
describe("DOĞRULAMA: Ankara çatı GES 10 kWp", () => {
  const weather = syntheticTmy(39.93, 32.85, 3);
  const baseCfg = {
    latitude: 39.93,
    longitude: 32.85,
    timezoneOffsetHours: 3,
    dcNameplateKwp: 10,
    tempCoeffPmaxPctPerC: -0.34,
    surfaceAzimuth: 180,
    mountType: "roof_mount" as const,
    inverter: { acRatedW: 8500, nominalEfficiency: 0.975 },
    year: 1,
  };

  it("optimum eğim ~30-40°", () => {
    const { tilt } = optimalTilt(weather, baseCfg, {
      min: 10,
      max: 50,
      step: 5,
    });
    expect(tilt).toBeGreaterThanOrEqual(25);
    expect(tilt).toBeLessThanOrEqual(45);
  });

  it("yıllık üretim 14.500–16.000 kWh, PR 0.78–0.82", () => {
    const r = simulatePvSystem(weather, { ...baseCfg, surfaceTilt: 35 });
    expect(r.annualAcKwh).toBeGreaterThanOrEqual(14_500);
    expect(r.annualAcKwh).toBeLessThanOrEqual(16_000);
    expect(r.performanceRatio).toBeGreaterThanOrEqual(0.78);
    expect(r.performanceRatio).toBeLessThanOrEqual(0.82);
  });
});

describe("DOĞRULAMA: Antalya arazi GES 1 MW", () => {
  const weather = syntheticTmy(36.9, 30.7, 3);
  const cfg = {
    latitude: 36.9,
    longitude: 30.7,
    timezoneOffsetHours: 3,
    dcNameplateKwp: 1000,
    tempCoeffPmaxPctPerC: -0.34,
    surfaceTilt: 30,
    surfaceAzimuth: 180,
    mountType: "open_rack" as const,
    inverter: { acRatedW: 850_000, nominalEfficiency: 0.985 },
    losses: { transformer: 0.01 },
    year: 1,
  };

  it("yıllık 1.70–1.85 GWh, spesifik üretim ~1700 kWh/kWp", () => {
    const r = simulatePvSystem(weather, cfg);
    expect(r.annualAcKwh).toBeGreaterThanOrEqual(1_700_000);
    expect(r.annualAcKwh).toBeLessThanOrEqual(1_850_000);
    expect(r.specificYield).toBeGreaterThanOrEqual(1650);
    expect(r.specificYield).toBeLessThanOrEqual(1850);
  });
});
