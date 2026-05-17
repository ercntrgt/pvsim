import { describe, it, expect } from "vitest";
import {
  syntheticConsumption,
  fromMonthlyTotals,
} from "../consumption/syntheticProfile";
import {
  parseConsumptionCsv,
  normalizeTo8760,
} from "../consumption/profileParser";
import { matchGenerationConsumption } from "../consumption/matcher";
import {
  TR_DEFAULT_TARIFFS,
  retailEffectivePrice,
  exportUnitPrice,
  touPeriodForHour,
  baseUnitPrice,
} from "../tariff/trTariffs";
import { computeNetMetering } from "../tariff/netMetering";
import {
  escalatedValue,
  realDiscountRate,
  escalationSeries,
} from "../tariff/escalation";
import { environmentalImpact } from "../environment/co2";
import { checkEpdkCompliance } from "../regulation/epdk";
import { assessYekdem } from "../regulation/yekdem";

describe("syntheticConsumption", () => {
  it("yıllık toplamı korur, 8760 saat", () => {
    const p = syntheticConsumption(12_000, "mesken");
    expect(p.length).toBe(8760);
    const sum = p.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(12_000, 0);
  });
  it("ofis gündüz ağırlıklı, fabrika daha düz", () => {
    const ofis = syntheticConsumption(10_000, "ofis");
    const fab = syntheticConsumption(10_000, "fabrika");
    const ofisNoon = ofis[12];
    const ofisNight = ofis[3];
    expect(ofisNoon).toBeGreaterThan(ofisNight * 3);
    const fabNoon = fab[12];
    const fabNight = fab[3];
    expect(fabNoon / fabNight).toBeLessThan(2); // fabrika düz
  });
  it("fromMonthlyTotals aylık toplamı korur", () => {
    const m = [1000, 900, 800, 700, 600, 600, 700, 700, 600, 700, 800, 900];
    const p = fromMonthlyTotals(m, "mesken");
    expect(p.length).toBe(8760);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(
      m.reduce((a, b) => a + b, 0),
      0,
    );
  });
});

describe("profileParser", () => {
  it("saatlik CSV (8760) ayrıştırır", () => {
    const rows = ["tarih,kwh"];
    for (let i = 0; i < 8760; i++) {
      rows.push(`2024-01-01 ${i},1.5`);
    }
    const r = parseConsumptionCsv(rows.join("\n"));
    expect(r.resolution).toBe("hourly");
    expect(r.hourlyKwh.length).toBe(8760);
    expect(r.annualKwh).toBe(13_140); // 8760 * 1.5
  });
  it("15dk CSV 4'erli toplar", () => {
    const rows = ["zaman;deger"];
    for (let i = 0; i < 35040; i++) rows.push(`t${i};0.25`);
    const r = parseConsumptionCsv(rows.join("\n"));
    expect(r.resolution).toBe("15min");
    expect(r.hourlyKwh.length).toBe(8760);
    expect(r.hourlyKwh[0]).toBeCloseTo(1.0, 6); // 4 * 0.25
  });
  it("normalizeTo8760 doldurur/budar", () => {
    expect(normalizeTo8760([1, 2, 3]).length).toBe(8760);
    expect(normalizeTo8760(new Array(9000).fill(1)).length).toBe(8760);
  });
});

describe("matcher", () => {
  it("öz tüketim, ihracat, ithalat tutarlı", () => {
    // 4 saat: gen [0,2,3,0], cons [1,1,1,1]
    const gen = [0, 2, 3, 0];
    const cons = [1, 1, 1, 1];
    const r = matchGenerationConsumption(gen, cons);
    expect(r.totalGeneration).toBe(5);
    expect(r.totalConsumption).toBe(4);
    expect(r.selfConsumed).toBe(2); // min sums: 0+1+1+0
    expect(r.exported).toBe(3); // 0+1+2+0
    expect(r.imported).toBe(2); // 1+0+0+1
    expect(r.selfConsumptionRate).toBeCloseTo(2 / 5, 4);
    expect(r.selfSufficiency).toBeCloseTo(2 / 4, 4);
  });
});

describe("trTariffs", () => {
  it("üç zamanlı dilim sınırları", () => {
    expect(touPeriodForHour(10)).toBe("gunduz");
    expect(touPeriodForHour(19)).toBe("puant");
    expect(touPeriodForHour(2)).toBe("gece");
    expect(touPeriodForHour(23)).toBe("gece");
  });
  it("perakende efektif > vergisiz baz > sadece aktif", () => {
    const t = TR_DEFAULT_TARIFFS.mesken;
    const eff = retailEffectivePrice(t, 12);
    const base = baseUnitPrice(t, 12);
    const exp = exportUnitPrice(t, 12);
    expect(eff).toBeGreaterThan(base);
    expect(base).toBeGreaterThan(exp);
    // KDV %20 dahil olduğundan eff ≈ base*(1+fonlar)*1.2
    expect(eff / base).toBeGreaterThan(1.2);
  });
});

describe("netMetering", () => {
  it("öz tüketim tasarrufu + mahsup + fazla satış toplanır", () => {
    const n = 8760;
    // Sabit küçük üretim ve tüketim
    const gen = new Array(n).fill(1);
    const cons = new Array(n).fill(0.6);
    const r = computeNetMetering(gen, cons, TR_DEFAULT_TARIFFS.mesken);
    expect(r.annualSelfConsumedValue).toBeGreaterThan(0);
    expect(r.annualTotalValue).toBeGreaterThan(r.annualSelfConsumedValue);
    expect(r.blendedValuePerKwh).toBeGreaterThan(0);
    // blended < perakende efektif (fazla enerji düşük değerli)
    expect(r.blendedValuePerKwh).toBeLessThan(
      retailEffectivePrice(TR_DEFAULT_TARIFFS.mesken, 12),
    );
    expect(r.monthly).toHaveLength(12);
  });
});

describe("escalation", () => {
  it("eskalasyon ve reel iskonto", () => {
    expect(escalatedValue(100, 0.2, 1)).toBe(100);
    expect(escalatedValue(100, 0.2, 2)).toBeCloseTo(120, 6);
    expect(realDiscountRate(0.45, 0.35)).toBeCloseTo(
      (1.45 / 1.35) - 1,
      6,
    );
    const s = escalationSeries(100, 0.1, 3);
    expect(s[0]).toBeCloseTo(100, 6);
    expect(s[1]).toBeCloseTo(110, 6);
    expect(s[2]).toBeCloseTo(121, 6);
  });
});

describe("environment", () => {
  it("CO2 ve eşdeğerler", () => {
    const e = environmentalImpact({
      annualEnergyKwh: 15_000,
      lifetimeYears: 25,
      degradationRate: 0.005,
    });
    // 15000 * 0.45 = 6750 kg = 6.75 ton/yıl
    expect(e.annualCo2TonnesAvoided).toBeCloseTo(6.75, 1);
    expect(e.lifetimeCo2TonnesAvoided).toBeGreaterThan(150);
    expect(e.equivalentTreesPerYear).toBeGreaterThan(250);
    expect(e.equivalentCarKmPerYear).toBeGreaterThan(50_000);
  });
});

describe("regulation", () => {
  it("EPDK: 10 kWp lisanssız uyumlu, 6 MW değil", () => {
    const ok = checkEpdkCompliance({
      dcKwp: 12,
      acKw: 10,
      connectionType: "mesken_cati",
    });
    expect(ok.compliant).toBe(true);
    const big = checkEpdkCompliance({
      dcKwp: 7000,
      acKw: 6000,
      connectionType: "arazi",
    });
    expect(big.compliant).toBe(false);
  });
  it("EPDK: aşırı kapasite uyarısı", () => {
    const r = checkEpdkCompliance({
      dcKwp: 100,
      acKw: 80,
      connectionType: "ticari_cati",
      annualConsumptionKwh: 50_000, // ~150k üretim >> tüketim
    });
    expect(r.warnings.some((w) => w.includes("fazla enerji"))).toBe(true);
  });
  it("YEKDEM: lisanssız çatı mahsuplaşma notu", () => {
    const y = assessYekdem({ acKw: 10, isRooftop: true });
    expect(y.applicable).toBe(false);
    expect(y.supportYears).toBe(10);
  });
});
