import { describe, it, expect } from "vitest";
import { runFeasibility } from "../runFeasibility";
import type { FeasibilityInput } from "../types";

const baseInput: FeasibilityInput = {
  project: { name: "Test Ankara Çatı", connectionType: "ticari_cati" },
  location: {
    latitude: 39.93,
    longitude: 32.85,
    timezoneOffsetHours: 3,
    preferEmbedded: true, // offline deterministik
  },
  system: {
    panelId: "jinko-tiger-neo-440",
    inverterId: "huawei-sun2000-10ktl-m1",
    targetKwp: 10,
    tilt: "auto",
  },
  consumption: {
    method: "synthetic",
    annualKwh: 18_000,
    sector: "ofis",
  },
  tariff: { category: "ticarethane" },
  finance: {
    capexPerKwp: 21_000,
    discountRate: 0.18,
    tariffEscalation: 0.25,
    opexEscalation: 0.25,
  },
};

describe("runFeasibility (uçtan uca, offline)", () => {
  it("Ankara ~10 kWp çatı: tutarlı enerji + finans çıktısı", async () => {
    const r = await runFeasibility(baseInput);

    // Solar kaynak gömülü (offline)
    expect(r.meta.solarSource).toBe("embedded-tr");

    // Enerji doğrulama bandı (PV modeli ile tutarlı)
    expect(r.energy.annualAcKwh).toBeGreaterThan(13_000);
    expect(r.energy.annualAcKwh).toBeLessThan(17_000);
    expect(r.energy.performanceRatio).toBeGreaterThan(0.75);
    expect(r.energy.performanceRatio).toBeLessThan(0.85);
    expect(r.system.dcKwp).toBeGreaterThan(8);
    expect(r.system.dcKwp).toBeLessThan(13);
    expect(r.system.tilt).toBeGreaterThanOrEqual(20);
    expect(r.system.tilt).toBeLessThanOrEqual(45);

    // Eşleştirme tutarlı
    expect(r.consumption.selfConsumptionRate).toBeGreaterThan(0);
    expect(r.consumption.selfConsumptionRate).toBeLessThanOrEqual(1);
    expect(r.consumption.netMetering.blendedValuePerKwh).toBeGreaterThan(0);

    // Finans alanları mevcut ve mantıklı
    expect(r.finance.capex).toBeCloseTo(21_000 * r.system.dcKwp, -3);
    expect(r.finance.schedule).toHaveLength(25);
    expect(r.finance.lcoe).toBeGreaterThan(0);
    expect(r.finance.lcoe).toBeLessThan(10);
    expect(r.finance.npv).toBeTypeOf("number");
    expect(r.finance.sensitivity).toHaveLength(5);

    // Çevre
    expect(r.environment.annualCo2TonnesAvoided).toBeGreaterThan(0);
    expect(r.environment.lifetimeCo2TonnesAvoided).toBeGreaterThan(
      r.environment.annualCo2TonnesAvoided,
    );

    // Mevzuat: 10 kWp lisanssız uyumlu
    expect(r.regulation.epdk.compliant).toBe(true);
    expect(r.regulation.yekdem.supportYears).toBe(10);
  });

  it("yüksek öz tüketim senaryosu pozitif değer üretir", async () => {
    const r = await runFeasibility({
      ...baseInput,
      consumption: { method: "synthetic", annualKwh: 16_000, sector: "fabrika" },
    });
    // Fabrika 7/24 → öz tüketim oranı meskenden yüksek olmalı
    expect(r.consumption.selfConsumptionRate).toBeGreaterThan(0.25);
    expect(r.finance.totalRevenue).toBeGreaterThan(0);
  });

  it("kredili senaryo: özkaynak IRR ve DSCR döner", async () => {
    const r = await runFeasibility({
      ...baseInput,
      finance: {
        ...baseInput.finance,
        loan: { shareOfCapex: 0.7, annualRate: 0.45, termYears: 7 },
      },
    });
    expect(r.finance.loanSchedule).not.toBeNull();
    expect(r.finance.minDscr).not.toBeNull();
    expect(r.finance.equityCashFlows[0]).toBeLessThan(0);
  });
});
