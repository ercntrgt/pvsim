import { describe, it, expect } from "vitest";
import {
  npv,
  irr,
  lcoe,
  simplePayback,
  discountedPayback,
  loanSchedule,
  annuityPayment,
  buildCashflow,
  tornado,
  monteCarlo,
  compareScenarios,
} from "../index";
import type { FinanceInputs } from "../types";

describe("npv", () => {
  it("t0 dahil seriyi doğru iskonto eder", () => {
    // pvsim-prompt.md doğrulama case 3:
    // CapEx 200.000, yıllık net 35.000, iskonto %15, 25 yıl → NPV ≈ 26.000
    const cf = [-200_000, ...Array(25).fill(35_000)];
    const result = npv(0.15, cf);
    expect(result).toBeCloseTo(26_245, -2); // ~26.000 ± yüzlük
    expect(Math.abs(result - 26_000) / 26_000).toBeLessThan(0.02); // ±%2
  });

  it("iskonto %0 ise basit toplam", () => {
    expect(npv(0, [-100, 50, 60])).toBe(10);
  });
});

describe("irr", () => {
  it("doğrulama case 4: IRR ≈ %17", () => {
    const cf = [-200_000, ...Array(25).fill(35_000)];
    const r = irr(cf);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.16);
    expect(r!).toBeLessThan(0.18);
    expect(Math.abs(r! - 0.17)).toBeLessThan(0.01);
  });

  it("NPV(IRR) ≈ 0 sağlanır", () => {
    const cf = [-50_000, 12_000, 15_000, 18_000, 22_000, 25_000];
    const r = irr(cf)!;
    expect(npv(r, cf)).toBeCloseTo(0, 2);
  });

  it("hiç pozitif akış yoksa null", () => {
    expect(irr([-100, -50, -20])).toBeNull();
  });
});

describe("lcoe", () => {
  it("makul ₺/kWh aralığında üretir", () => {
    const value = lcoe({
      capex: 200_000,
      opexByYear: Array(25).fill(3_000),
      energyByYear: Array(25).fill(15_000),
      discountRate: 0.15,
    });
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(5); // ₺/kWh mantıklı üst sınır
  });
});

describe("payback", () => {
  it("basit geri ödeme kesirli yıl döner", () => {
    const cf = [-100, 40, 40, 40, 40];
    const p = simplePayback(cf)!;
    expect(p).toBeCloseTo(2.5, 5);
  });

  it("iskontolu geri ödeme > basit geri ödeme", () => {
    const cf = [-100_000, ...Array(25).fill(20_000)];
    const simple = simplePayback(cf)!;
    const disc = discountedPayback(cf, 0.15)!;
    expect(disc).toBeGreaterThan(simple);
  });
});

describe("loan", () => {
  it("anuite tablosu anaparayı sıfırlar", () => {
    const sched = loanSchedule({
      principal: 100_000,
      annualRate: 0.4,
      termYears: 5,
    });
    expect(sched).toHaveLength(5);
    expect(sched[4].closingBalance).toBe(0);
    const a = annuityPayment({
      principal: 100_000,
      annualRate: 0.4,
      termYears: 5,
    });
    // İlk yıl faiz = 40.000, taksit > faiz olmalı
    expect(a).toBeGreaterThan(40_000);
  });

  it("faiz %0 ise eşit anapara", () => {
    const sched = loanSchedule({
      principal: 60_000,
      annualRate: 0,
      termYears: 3,
    });
    expect(sched.map((r) => r.principal)).toEqual([20_000, 20_000, 20_000]);
  });
});

describe("buildCashflow", () => {
  const base: FinanceInputs = {
    capex: 200_000,
    lifetimeYears: 25,
    discountRate: 0.15,
    annualEnergyKwh: 15_000,
    degradationRate: 0,
    energyValuePerKwh: 200_000 / 15_000 / 25 + 0, // ayar: net ≈ 35.000/yıl
    tariffEscalation: 0,
    annualOpex: 0,
    opexEscalation: 0,
  };

  it("sabit 35.000 ₺/yıl senaryosunu doğrulama case 3/4 ile tutturur", () => {
    // energyValuePerKwh'ı net 35.000 olacak şekilde ayarla
    const inp: FinanceInputs = {
      ...base,
      energyValuePerKwh: 35_000 / 15_000,
    };
    const r = buildCashflow(inp);
    expect(Math.abs(r.npv - 26_000) / 26_000).toBeLessThan(0.03);
    expect(r.irr!).toBeGreaterThan(0.16);
    expect(r.irr!).toBeLessThan(0.18);
    expect(r.schedule).toHaveLength(25);
    expect(r.profitabilityIndex).toBeCloseTo(r.npv / 200_000 + 1, 4);
  });

  it("degradasyon toplam enerjiyi düşürür", () => {
    const noDeg = buildCashflow({ ...base, energyValuePerKwh: 2 });
    const withDeg = buildCashflow({
      ...base,
      energyValuePerKwh: 2,
      degradationRate: 0.007,
    });
    expect(withDeg.totalEnergyKwh).toBeLessThan(noDeg.totalEnergyKwh);
  });

  it("kredi varsa özkaynak IRR'ı hesaplanır ve DSCR döner", () => {
    const r = buildCashflow({
      ...base,
      energyValuePerKwh: 35_000 / 15_000,
      loan: { principal: 140_000, annualRate: 0.45, termYears: 8 },
    });
    expect(r.loanSchedule).not.toBeNull();
    expect(r.minDscr).not.toBeNull();
    expect(r.equityCashFlows[0]).toBe(-60_000); // 200k - 140k kredi
  });
});

describe("sensitivity", () => {
  const base: FinanceInputs = {
    capex: 200_000,
    lifetimeYears: 25,
    discountRate: 0.15,
    annualEnergyKwh: 15_000,
    degradationRate: 0.005,
    energyValuePerKwh: 2.5,
    tariffEscalation: 0.2,
    annualOpex: 4_000,
    opexEscalation: 0.2,
  };

  it("tornado swing'e göre azalan sıralı", () => {
    const t = tornado(base);
    expect(t).toHaveLength(5);
    for (let i = 1; i < t.length; i++) {
      expect(t[i - 1].swing).toBeGreaterThanOrEqual(t[i].swing);
    }
  });

  it("monte carlo P10 ≤ P50 ≤ P90 ve tekrarlanabilir", () => {
    const a = monteCarlo(base, 500);
    const b = monteCarlo(base, 500);
    expect(a.npv.p10).toBeLessThanOrEqual(a.npv.p50);
    expect(a.npv.p50).toBeLessThanOrEqual(a.npv.p90);
    expect(a.npv.p50).toBe(b.npv.p50); // deterministik seed
    expect(a.probabilityNpvPositive).toBeGreaterThanOrEqual(0);
    expect(a.probabilityNpvPositive).toBeLessThanOrEqual(1);
  });

  it("compareScenarios adil terminal-servet bazında", () => {
    const inp: FinanceInputs = {
      capex: 200_000,
      lifetimeYears: 25,
      discountRate: 0.15,
      annualEnergyKwh: 15_000,
      degradationRate: 0.005,
      energyValuePerKwh: 3,
      tariffEscalation: 0.25,
      annualOpex: 4_000,
      opexEscalation: 0.25,
    };
    const c = compareScenarios(inp, 0.42);
    // Her iki senaryo da pozitif servet üretir (eski hata: GES reinvest
    // edilmiyordu → milyarlarca ₺ yapay fark).
    expect(c.pvInvestmentTerminal).toBeGreaterThan(0);
    expect(c.bankDepositTerminal).toBeGreaterThan(0);
    expect(c.advantageOverDeposit).toBe(
      c.pvInvestmentTerminal - c.bankDepositTerminal,
    );
    // Aynı mertebede olmalı (mevduat GES'in ~100 katı OLMAMALI).
    expect(c.pvInvestmentTerminal).toBeGreaterThan(
      c.bankDepositTerminal * 0.1,
    );
  });
});
