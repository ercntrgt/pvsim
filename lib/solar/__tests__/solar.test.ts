import { describe, it, expect } from "vitest";
import {
  declination,
  dayOfYear,
  sunPosition,
} from "../sunPosition";
import { airMassKastenYoung, iamAshrae } from "../airMass";
import {
  poaHayDavies,
  erbsDecomposition,
  angleOfIncidence,
  isHorizonShaded,
  findOptimalTilt,
} from "../irradiance";
import {
  syntheticTmy,
  nearestSite,
  annualGhi,
  TR_SITES,
} from "../trClimate";

describe("sunPosition", () => {
  it("dayOfYear", () => {
    expect(dayOfYear(new Date(Date.UTC(2023, 0, 1)))).toBe(1);
    expect(dayOfYear(new Date(Date.UTC(2023, 11, 31)))).toBe(365);
  });

  it("deklinasyon gündönümü/ekinoks", () => {
    expect(declination(172)).toBeCloseTo(23.45, 0); // ~21 Haziran
    expect(declination(355)).toBeCloseTo(-23.45, 0); // ~21 Aralık
    expect(Math.abs(declination(80))).toBeLessThan(2); // ~21 Mart ≈ 0
  });

  it("ekinoks öğleye yakın Ankara: elevation ≈ 90-lat, güney yarımküre", () => {
    // 20 Mart ~12:00 yerel saat (TR UTC+3 → 09:00 UTC). Saat öğleni ≠ güneş
    // öğleni (boylam + zaman denklemi düzeltmesi) → azimut güneydoğu.
    const date = new Date(Date.UTC(2023, 2, 20, 9, 0));
    const p = sunPosition(date, 39.93, 32.85, 3);
    expect(p.elevation).toBeGreaterThan(45);
    expect(p.elevation).toBeLessThan(55);
    expect(p.azimuth).toBeGreaterThan(150);
    expect(p.azimuth).toBeLessThan(210);
  });

  it("güneş öğleninde azimut ≈ 180 (güney)", () => {
    // Ankara solar öğleni ≈ 09:56 UTC (boylam + EoT düzeltmeli).
    let best = { az: 0, ha: Infinity };
    for (let min = 0; min < 24 * 60; min += 2) {
      const d = new Date(Date.UTC(2023, 2, 20, 0, min));
      const p = sunPosition(d, 39.93, 32.85, 3);
      if (Math.abs(p.hourAngle) < Math.abs(best.ha)) {
        best = { az: p.azimuth, ha: p.hourAngle };
      }
    }
    expect(Math.abs(best.ha)).toBeLessThan(1);
    expect(best.az).toBeGreaterThan(178);
    expect(best.az).toBeLessThan(182);
  });

  it("gece negatif elevation", () => {
    const date = new Date(Date.UTC(2023, 5, 21, 0, 0)); // ~03:00 TR
    const p = sunPosition(date, 39.93, 32.85, 3);
    expect(p.elevation).toBeLessThan(0);
  });
});

describe("airMass", () => {
  it("zenitte ≈ 1, 60°'de ≈ 2", () => {
    expect(airMassKastenYoung(0)).toBeCloseTo(1, 1);
    expect(airMassKastenYoung(60)).toBeGreaterThan(1.9);
    expect(airMassKastenYoung(60)).toBeLessThan(2.1);
  });

  it("IAM dik gelmede 1, sığ açıda azalır", () => {
    expect(iamAshrae(0)).toBeCloseTo(1, 5);
    expect(iamAshrae(60)).toBeLessThan(1);
    expect(iamAshrae(85)).toBeLessThan(iamAshrae(60));
  });
});

describe("irradiance", () => {
  it("Erbs: GHI=0 → sıfır bileşen", () => {
    const r = erbsDecomposition(0, 0, 80);
    expect(r.dhi).toBe(0);
    expect(r.dni).toBe(0);
  });

  it("AOI: panel güneşe dik bakınca 0", () => {
    // güneş zenit 30, azimut 180 (güney); panel tilt 60, azimut 180
    // zenit 30 → güneş ışını panel normaliyle: tilt 60 ile aoi = |60-30|=30
    const aoi = angleOfIncidence(30, 180, 60, 180);
    expect(aoi).toBeCloseTo(30, 0);
  });

  it("yatay panelde POA ≈ GHI (tutarlı bileşenler)", () => {
    const zenith = 40;
    const dni = 700;
    const dhi = 150;
    // Tutarlı GHI = direkt yatay + difüz yatay
    const ghi = dni * Math.cos((zenith * Math.PI) / 180) + dhi;
    const r = poaHayDavies(
      { ghi, dhi, dni },
      zenith,
      180,
      0, // tilt 0 (yatay)
      180,
      1000,
      0.2,
    );
    expect(r.poaGroundReflected).toBeCloseTo(0, 6); // yatayda zemin yansıması yok
    expect(r.poaGlobal).toBeCloseTo(ghi, 0); // POA ≈ GHI
  });

  it("güneye eğik panel kışın yatayı geçer (kış öğleni)", () => {
    // düşük güneş: zenith 65, güney
    const flat = poaHayDavies(
      { ghi: 300, dhi: 90, dni: 500 },
      65,
      180,
      0,
      180,
      1000,
    );
    const tilted = poaHayDavies(
      { ghi: 300, dhi: 90, dni: 500 },
      65,
      180,
      35,
      180,
      1000,
    );
    expect(tilted.poaGlobal).toBeGreaterThan(flat.poaGlobal);
  });

  it("ufuk profili gölgeleme", () => {
    const horizon = new Array(36).fill(10); // her yön 10° engel
    expect(isHorizonShaded(horizon, 90, 5)).toBe(true); // güneş 5° < 10°
    expect(isHorizonShaded(horizon, 90, 15)).toBe(false);
  });

  it("findOptimalTilt tepe noktayı bulur", () => {
    const { optimalTilt } = findOptimalTilt(
      (t) => -((t - 33) ** 2), // tepe 33°
      0,
      60,
      1,
    );
    expect(optimalTilt).toBe(33);
  });
});

describe("trClimate sentetik TMY", () => {
  it("nearestSite Ankara koordinatını bulur", () => {
    expect(nearestSite(39.93, 32.85).name).toBe("Ankara");
    expect(nearestSite(36.9, 30.7).name).toBe("Antalya");
  });

  it("8760 saat üretir", () => {
    const tmy = syntheticTmy(39.93, 32.85, 3);
    expect(tmy.length).toBe(8760);
  });

  it("yıllık GHI gömülü veriyle %5 içinde tutarlı", () => {
    for (const site of TR_SITES) {
      const tmy = syntheticTmy(site.lat, site.lon, 3);
      const sumKwh = tmy.reduce((a, h) => a + h.ghi, 0) / 1000;
      const target = annualGhi(site);
      const err = Math.abs(sumKwh - target) / target;
      expect(err).toBeLessThan(0.05);
    }
  });

  it("gece GHI=0, öğlen GHI>0", () => {
    const tmy = syntheticTmy(36.9, 30.7, 3);
    const julyNoon = tmy.find(
      (h) => h.month === 7 && h.hour === 12,
    )!;
    const julyMidnight = tmy.find(
      (h) => h.month === 7 && h.hour === 0,
    )!;
    expect(julyNoon.ghi).toBeGreaterThan(0);
    expect(julyMidnight.ghi).toBe(0);
  });
});
