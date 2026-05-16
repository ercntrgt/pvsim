/**
 * Türkiye gömülü iklim verisi — PVGIS erişilemediğinde yedek, ayrıca
 * deterministik offline doğrulama testleri için kullanılır.
 *
 * Aylık ortalama günlük global yatay ışınım (kWh/m²/gün) ve aylık ortalama
 * sıcaklık (°C). Değerler PVGIS / Meteonorm / GEPA tipik mertebelerindedir
 * (fizibilite MVP için yeterli; resmi rapor PVGIS canlı veri kullanır).
 */

import type { HourlyWeather } from "./pvgis";
import { sunPosition, dayOfYear, extraterrestrialHorizontal } from "./sunPosition";
import { erbsDecomposition } from "./irradiance";

export interface ClimateSite {
  name: string;
  lat: number;
  lon: number;
  /** 12 aylık ortalama günlük GHI, kWh/m²/gün. */
  ghiDaily: number[];
  /** 12 aylık ortalama sıcaklık, °C. */
  tempMonthly: number[];
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const TR_SITES: ClimateSite[] = [
  {
    name: "Ankara",
    lat: 39.93,
    lon: 32.85,
    ghiDaily: [1.95, 2.75, 3.95, 5.05, 6.1, 6.85, 7.05, 6.35, 5.15, 3.55, 2.3, 1.7],
    tempMonthly: [0.3, 2.1, 6.0, 11.2, 16.0, 20.2, 23.6, 23.5, 18.7, 12.9, 6.8, 2.1],
  },
  {
    name: "Antalya",
    lat: 36.9,
    lon: 30.7,
    ghiDaily: [2.55, 3.35, 4.65, 5.75, 6.85, 7.65, 7.75, 7.05, 5.85, 4.35, 3.05, 2.3],
    tempMonthly: [10.0, 10.6, 13.0, 16.3, 20.7, 25.3, 28.4, 28.2, 25.0, 20.4, 15.4, 11.6],
  },
  {
    name: "İstanbul",
    lat: 41.0,
    lon: 28.97,
    ghiDaily: [1.55, 2.25, 3.45, 4.65, 5.95, 6.55, 6.65, 5.85, 4.55, 3.05, 1.85, 1.35],
    tempMonthly: [6.0, 6.1, 7.8, 12.0, 16.7, 21.4, 23.8, 23.8, 20.2, 16.0, 11.8, 8.4],
  },
  {
    name: "İzmir",
    lat: 38.42,
    lon: 27.14,
    ghiDaily: [1.95, 2.75, 4.05, 5.35, 6.65, 7.45, 7.55, 6.85, 5.45, 3.75, 2.35, 1.7],
    tempMonthly: [8.8, 9.5, 11.9, 15.8, 20.7, 25.6, 28.0, 27.6, 23.7, 19.0, 14.0, 10.5],
  },
  {
    name: "Türkiye Ort.",
    lat: 39.0,
    lon: 35.0,
    ghiDaily: [1.85, 2.6, 3.85, 5.0, 6.05, 6.8, 7.0, 6.3, 5.05, 3.45, 2.2, 1.6],
    tempMonthly: [3.5, 4.8, 8.5, 13.0, 17.8, 22.0, 25.2, 25.0, 20.5, 14.5, 8.5, 4.8],
  },
];

/** Verilen koordinata en yakın gömülü iklim sitesini döndürür. */
export function nearestSite(lat: number, lon: number): ClimateSite {
  let best = TR_SITES[TR_SITES.length - 1];
  let bestD = Infinity;
  for (const s of TR_SITES) {
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Aylık GHI'den yıllık toplam (kWh/m²/yıl). */
export function annualGhi(site: ClimateSite): number {
  return site.ghiDaily.reduce(
    (acc, g, m) => acc + g * DAYS_IN_MONTH[m],
    0,
  );
}

/**
 * Gömülü aylık veriden deterministik 8760 saatlik sentetik TMY üretir.
 *
 * Yöntem: her saat için açık-hava benzeri şekil = max(0, sin(elevation)) ^ 1.15
 * ağırlığı; günün toplamı, ait olduğu ayın ortalama günlük GHI'sine
 * ölçeklenir. DHI/DNI Erbs ile ayrıştırılır. Sıcaklık = aylık ortalama +
 * günlük ±4.5°C sinüzoidal salınım. PVGIS yoksa gerçekçi yedek sağlar.
 */
export function syntheticTmy(
  lat: number,
  lon: number,
  timezoneOffsetHours = 3,
): HourlyWeather[] {
  return syntheticTmyFromSite(
    nearestSite(lat, lon),
    lat,
    lon,
    timezoneOffsetHours,
  );
}

/**
 * `syntheticTmy` ile aynı algoritma; aylık GHI/sıcaklık verisi açıkça
 * `site` ile verilir (NASA POWER iklimatolojisini sürmek için kullanılır).
 * Güneş geometrisi gerçek lat/lon ile, ışınım büyüklüğü site ile ölçeklenir.
 */
export function syntheticTmyFromSite(
  site: ClimateSite,
  lat: number,
  lon: number,
  timezoneOffsetHours = 3,
): HourlyWeather[] {
  const out: HourlyWeather[] = [];

  // Önce gün gün açık-hava ağırlıklarını topla, sonra ölçekle.
  const baseYear = 2023;
  let dayIndex = 0;
  for (let month = 0; month < 12; month++) {
    for (let dom = 1; dom <= DAYS_IN_MONTH[month]; dom++) {
      const weights: number[] = [];
      let weightSum = 0;
      for (let h = 0; h < 24; h++) {
        const date = new Date(
          Date.UTC(baseYear, month, dom, h - timezoneOffsetHours, 30),
        );
        const pos = sunPosition(date, lat, lon, timezoneOffsetHours);
        const w =
          pos.elevation > 0
            ? Math.pow(Math.sin((pos.elevation * Math.PI) / 180), 1.15)
            : 0;
        weights.push(w);
        weightSum += w;
      }
      // Günlük hedef GHI (Wh/m²) = ay ortalaması × 1000
      const dailyTargetWh = site.ghiDaily[month] * 1000;
      for (let h = 0; h < 24; h++) {
        const date = new Date(
          Date.UTC(baseYear, month, dom, h - timezoneOffsetHours, 30),
        );
        const ghi =
          weightSum > 0 ? (weights[h] / weightSum) * dailyTargetWh : 0;
        const pos = sunPosition(date, lat, lon, timezoneOffsetHours);
        const eth = extraterrestrialHorizontal(
          date,
          lat,
          lon,
          timezoneOffsetHours,
        );
        const { dhi, dni } = erbsDecomposition(ghi, eth, pos.zenith);
        const diurnal =
          4.5 * Math.sin(((h - 9) / 24) * 2 * Math.PI); // tepe ~15:00
        out.push({
          datetime: `${baseYear}-${String(month + 1).padStart(
            2,
            "0",
          )}-${String(dom).padStart(2, "0")}T${String(h).padStart(2, "0")}:00`,
          month: month + 1,
          hour: h,
          ghi: Math.max(0, ghi),
          dni: Math.max(0, dni),
          dhi: Math.max(0, dhi),
          temperature: site.tempMonthly[month] + diurnal,
          windSpeed: 1.5,
        });
      }
      dayIndex++;
    }
  }
  void dayIndex;
  return out;
}
