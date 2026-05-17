import { describe, it, expect } from "vitest";
import {
  getPanels,
  getInverters,
  getPanelById,
  getInverterById,
  getTariffs,
  catalogCounts,
} from "../catalog";
import { recommendSystem } from "../../pv/sizing";

describe("catalog", () => {
  it("≥30 panel, ≥15 inverter (MVP kabul kriteri) ve zod doğrular", () => {
    const c = catalogCounts();
    expect(c.panels).toBeGreaterThanOrEqual(30);
    expect(c.inverters).toBeGreaterThanOrEqual(15);
    expect(getPanels()[0].pmaxW).toBeGreaterThan(0);
    expect(getInverters()[0].acRatedW).toBeGreaterThan(0);
  });

  it("id ile erişim", () => {
    const p = getPanelById("jinko-tiger-neo-580");
    expect(p?.pmaxW).toBe(580);
    const inv = getInverterById("huawei-sun2000-10ktl-m1");
    expect(inv?.acRatedW).toBe(10000);
  });

  it("tarifeler doğrulanır", () => {
    const t = getTariffs();
    expect(t.tariffs.mesken.activeEnergy.single).toBeGreaterThan(0);
    expect(t.tariffs.sanayi.timeOfUse).toBe("three");
  });
});

describe("sizing", () => {
  it("10 kWp hedef için makul string yapısı + geçerli kontroller", () => {
    const panel = getPanelById("jinko-tiger-neo-440")!;
    const inverter = getInverterById("huawei-sun2000-10ktl-m1")!;
    const r = recommendSystem({
      panel,
      inverter,
      targetKwp: 10,
      minAmbientC: -10,
      maxCellC: 70,
    });
    expect(r.panelCount).toBeGreaterThan(15);
    expect(r.panelCount).toBeLessThan(30);
    expect(r.dcKwp).toBeGreaterThan(8);
    expect(r.dcKwp).toBeLessThan(13);
    expect(r.dcAcRatio).toBeGreaterThan(0.9);
    expect(r.dcAcRatio).toBeLessThan(1.5);
    // soğuk Voc inverter sınırını aşmamalı
    const vocCheck = r.checks.find((c) => c.label.includes("Voc"));
    expect(vocCheck?.ok).toBe(true);
  });

  it("çatı alanından boyutlandırma", () => {
    const panel = getPanelById("trina-vertex-s-plus-450")!;
    const inverter = getInverterById("sungrow-sg10rt")!;
    const r = recommendSystem({
      panel,
      inverter,
      usableAreaM2: 80,
    });
    expect(r.panelCount).toBeGreaterThan(0);
    expect(r.estimatedAreaM2).toBeLessThanOrEqual(80);
  });
});
