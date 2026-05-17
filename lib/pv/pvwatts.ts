/**
 * PVWatts benzeri saatlik üretim modeli ve 8760 saatlik simülasyon
 * orkestratörü.
 *
 * Zincir (her saat):
 *   GHI/DHI/DNI → Hay-Davies POA → IAM (beam) → Sandia hücre sıcaklığı →
 *   sıcaklık düzeltmeli DC → sistem kayıpları (derate) → inverter (clip) → AC
 */

import type { HourlyWeather } from "../solar/pvgis";
import {
  sunPosition,
  extraterrestrialHorizontal,
  eccentricityCorrection,
  dayOfYear,
} from "../solar/sunPosition";
import { poaHayDavies, isHorizonShaded } from "../solar/irradiance";
import { iamAshrae } from "../solar/airMass";
import {
  cellTemperatureSandia,
  arrayDcPower,
  type ArrayMountType,
} from "./moduleModel";
import { inverterAcPower, type InverterSpec } from "./inverterModel";
import {
  combinedDerate,
  degradationFactor,
  type LossStack,
  DEFAULT_LOSSES,
} from "./lossesModel";
import {
  performanceRatio,
  specificYield,
} from "./performanceRatio";

const SOLAR_CONSTANT = 1367; // W/m²

export interface PvSystemConfig {
  latitude: number;
  longitude: number;
  /** Yerel saat - UTC (TR = 3). */
  timezoneOffsetHours: number;
  /** Sistem DC tepe gücü, kWp. */
  dcNameplateKwp: number;
  /** Güç sıcaklık katsayısı, %/°C (negatif, örn. -0.34). */
  tempCoeffPmaxPctPerC: number;
  /** Panel eğimi, derece. */
  surfaceTilt: number;
  /** Panel azimutu (0=K, 180=G). */
  surfaceAzimuth: number;
  albedo?: number;
  mountType?: ArrayMountType;
  inverter: InverterSpec;
  losses?: Partial<LossStack>;
  /** 36 noktalı ufuk profili (derece), opsiyonel. */
  horizonProfile?: number[];
  /** Beam üzerine IAM (ASHRAE) uygula, varsayılan true. */
  applyIam?: boolean;
  /** Degradasyon için yıl (1 = ilk yıl), varsayılan 1. */
  year?: number;
  /** Yıllık degradasyon (0.005). */
  annualDegradation?: number;
}

export interface PvSimulationResult {
  /** Yıllık net AC enerji, kWh. */
  annualAcKwh: number;
  /** Aylık AC enerji (12), kWh. */
  monthlyAcKwh: number[];
  /** Saatlik AC enerji (kayıt sayısı kadar), kWh. */
  hourlyAcKwh: number[];
  /** Yıllık düzlem üstü ışınım, kWh/m². */
  annualPoaKwhM2: number;
  performanceRatio: number;
  /** Spesifik üretim, kWh/kWp/yıl. */
  specificYield: number;
  /** Yıllık clipping kaybı, kWh. */
  clippingLossKwh: number;
  /** Üretim ağırlıklı ortalama hücre sıcaklığı, °C. */
  avgCellTempC: number;
  hoursSimulated: number;
}

/**
 * Tek konfigürasyon için 8760 (veya verilen kayıt sayısı) saatlik simülasyon.
 */
export function simulatePvSystem(
  weather: HourlyWeather[],
  cfg: PvSystemConfig,
): PvSimulationResult {
  const albedo = cfg.albedo ?? 0.2;
  const mount = cfg.mountType ?? "open_rack";
  const applyIam = cfg.applyIam ?? true;
  const year = cfg.year ?? 1;
  const annualDeg = cfg.annualDegradation ?? 0.005;
  const losses: LossStack = { ...DEFAULT_LOSSES, ...(cfg.losses ?? {}) };

  const derate =
    combinedDerate(losses, /* includeLid */ year === 1) *
    degradationFactor(year, annualDeg);

  const dcNameplateW = cfg.dcNameplateKwp * 1000;
  const tz = cfg.timezoneOffsetHours;

  const monthlyAcKwh = new Array(12).fill(0);
  const hourlyAcKwh: number[] = [];
  let annualAcWh = 0;
  let annualPoaWh = 0;
  let clippingWh = 0;
  let tempWeightSum = 0;
  let tempWeightedPoa = 0;

  for (const rec of weather) {
    const date = new Date(rec.datetime);
    const pos = sunPosition(date, cfg.latitude, cfg.longitude, tz);

    let acW = 0;
    let poaW = 0;

    if (pos.elevation > 0 && rec.ghi > 0) {
      const n = dayOfYear(date);
      const dni0 = SOLAR_CONSTANT * eccentricityCorrection(n);

      const poa = poaHayDavies(
        { ghi: rec.ghi, dhi: rec.dhi, dni: rec.dni },
        pos.zenith,
        pos.azimuth,
        cfg.surfaceTilt,
        cfg.surfaceAzimuth,
        dni0,
        albedo,
      );

      // Ufuk profili gölgelemesi: direkt bileşeni sıfırla.
      const shaded =
        cfg.horizonProfile &&
        isHorizonShaded(cfg.horizonProfile, pos.azimuth, pos.elevation);

      let poaBeam = shaded ? 0 : poa.poaBeam;
      if (applyIam && !shaded) {
        poaBeam *= iamAshrae(poa.aoi);
      }
      const poaEffective =
        poaBeam + poa.poaSkyDiffuse + poa.poaGroundReflected;
      poaW = poaEffective;

      const tCell = cellTemperatureSandia(
        poaEffective,
        rec.temperature,
        rec.windSpeed,
        mount,
      );

      const dcW =
        arrayDcPower(
          dcNameplateW,
          cfg.tempCoeffPmaxPctPerC,
          poaEffective,
          tCell,
        ) * derate;

      const inv = inverterAcPower(dcW, cfg.inverter);
      acW = Math.max(0, inv.acW);
      clippingWh += inv.clippedW;

      tempWeightSum += poaEffective;
      tempWeightedPoa += tCell * poaEffective;
    }

    // 1 saatlik adım → W ≈ Wh
    const acKwh = acW / 1000;
    hourlyAcKwh.push(acKwh);
    annualAcWh += acW;
    annualPoaWh += poaW;

    // Yerel aya yaz (UTC + tz).
    const local = new Date(date.getTime() + tz * 3_600_000);
    monthlyAcKwh[local.getUTCMonth()] += acKwh;
  }

  const annualAcKwh = annualAcWh / 1000;
  const annualPoaKwhM2 = annualPoaWh / 1000;

  return {
    annualAcKwh: round(annualAcKwh),
    monthlyAcKwh: monthlyAcKwh.map(round),
    hourlyAcKwh,
    annualPoaKwhM2: round(annualPoaKwhM2),
    performanceRatio: round4(
      performanceRatio(annualAcKwh, cfg.dcNameplateKwp, annualPoaKwhM2),
    ),
    specificYield: round(specificYield(annualAcKwh, cfg.dcNameplateKwp)),
    clippingLossKwh: round(clippingWh / 1000),
    avgCellTempC:
      tempWeightSum > 0 ? round1(tempWeightedPoa / tempWeightSum) : 0,
    hoursSimulated: weather.length,
  };
}

/**
 * Yıllık enerjiyi maksimize eden optimum eğimi bulur (grid search).
 * Hesabı hafif tutmak için POA tabanlı hızlı tarama yapar.
 */
export function optimalTilt(
  weather: HourlyWeather[],
  cfg: Omit<PvSystemConfig, "surfaceTilt">,
  range: { min?: number; max?: number; step?: number } = {},
): { tilt: number; annualAcKwh: number } {
  const min = range.min ?? 0;
  const max = range.max ?? 60;
  const step = range.step ?? 2;
  let best = { tilt: min, annualAcKwh: -Infinity };
  for (let t = min; t <= max; t += step) {
    const r = simulatePvSystem(weather, { ...cfg, surfaceTilt: t });
    if (r.annualAcKwh > best.annualAcKwh) {
      best = { tilt: t, annualAcKwh: r.annualAcKwh };
    }
  }
  return best;
}

function round(n: number): number {
  return Math.round(n);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export { extraterrestrialHorizontal };
