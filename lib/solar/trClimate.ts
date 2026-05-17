/**
 * Türkiye gömülü iklim verisi — PVGIS erişilemediğinde yedek, ayrıca
 * deterministik offline doğrulama testleri için kullanılır.
 *
 * Aylık ortalama günlük global yatay ışınım (kWh/m²/gün) ve aylık ortalama
 * sıcaklık (°C). Değerler PVGIS / Meteonorm / GEPA tipik mertebelerindedir
 * (fizibilite MVP için yeterli; resmi rapor PVGIS canlı veri kullanır).
 */

import type { HourlyWeather } from "./pvgis";
import { sunPosition, eccentricityCorrection, dayOfYear } from "./sunPosition";
import { clearSkyHottel } from "./clearSky";

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

interface ClearSkyIrradianceHour {
  date: Date;
  zenith: number;
  /** Yılın günü (eccentricity için). */
  n: number;
  ghi: number;
  dni: number;
  dhi: number;
}

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
    // ~1900 kWh/m²/yıl (GEPA/PVGIS — Antalya TR'nin en yüksek ışınımlı
    // illerinden; konservatif değil, belgelenmiş tipik mertebeler).
    ghiDaily: [2.6, 3.4, 4.75, 5.85, 7.0, 7.8, 7.9, 7.2, 5.95, 4.45, 3.1, 2.35],
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
  altitudeM = 0,
): HourlyWeather[] {
  const out: HourlyWeather[] = [];
  const baseYear = 2023;

  for (let month = 0; month < 12; month++) {
    const nDays = DAYS_IN_MONTH[month];

    // 1) Her gün için saatlik açık-hava ışınımını ve günlük bulutluluk
    //    çarpanını hesapla. Bulutluluk deterministik LCG ile günden güne
    //    değişir (açık ve kapalı günler karışımı) — gerçek TMY'nin beam/
    //    difüz dağılımını yakalamak için kritik.
    const dayClearHourly: ClearSkyIrradianceHour[][] = [];
    const dayCloudMul: number[] = [];
    let seed =
      (Math.floor((lat + 90) * 1000) * 73856093) ^
      (Math.floor((lon + 180) * 1000) * 19349663) ^
      ((month + 1) * 83492791);
    const lcg = () => {
      seed = (1664525 * (seed >>> 0) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let dom = 1; dom <= nDays; dom++) {
      const hourly: ClearSkyIrradianceHour[] = [];
      for (let h = 0; h < 24; h++) {
        const date = new Date(
          Date.UTC(baseYear, month, dom, h - timezoneOffsetHours, 30),
        );
        const pos = sunPosition(date, lat, lon, timezoneOffsetHours);
        const n = dayOfYear(date);
        const cs =
          pos.elevation > 0
            ? clearSkyHottel(
                pos.zenith,
                altitudeM,
                eccentricityCorrection(n),
              )
            : { ghi: 0, dni: 0, dhi: 0 };
        hourly.push({ date, zenith: pos.zenith, n, ...cs });
      }
      dayClearHourly.push(hourly);
      // Türkiye güneşli: çarpan [0.20,1.0], ortalama ≈ 0.70, açığa eğik.
      const u = lcg();
      dayCloudMul.push(0.2 + 0.8 * Math.pow(u, 0.6));
    }

    // 2) Ayı, ortalama günlük GHI gömülü hedefe eşit olacak şekilde ölçekle
    //    (aylık toplam tam korunur, gün-içi beam/difüz oranı gerçekçi kalır).
    const targetDailyWh = site.ghiDaily[month] * 1000;
    let rawDailyMean = 0;
    for (let d = 0; d < nDays; d++) {
      const dailyClearGhi = dayClearHourly[d].reduce(
        (a, x) => a + x.ghi,
        0,
      );
      rawDailyMean += dailyClearGhi * dayCloudMul[d];
    }
    rawDailyMean /= nDays;
    const monthScale =
      rawDailyMean > 0 ? targetDailyWh / rawDailyMean : 0;

    // 3) Saatlik kayıtları üret. Difüz oran açık-hava ayrımına SABİTLENİR;
    //    bulutlulukla artar (Erbs round-trip yapılmaz — aksi halde ölçekli
    //    GHI'de kt düşer ve transpozisyon gerçekçi olmaz).
    for (let d = 0; d < nDays; d++) {
      const factor = dayCloudMul[d] * monthScale;
      const cloudiness = Math.min(1, Math.max(0, 1 - dayCloudMul[d]));
      for (let h = 0; h < 24; h++) {
        const c = dayClearHourly[d][h];
        const ghi = Math.max(0, c.ghi * factor);
        let dhi = 0;
        let dni = 0;
        if (ghi > 0 && c.ghi > 0) {
          const clearDf = Math.min(0.5, Math.max(0.1, c.dhi / c.ghi));
          const df = Math.min(
            0.92,
            clearDf + cloudiness * (0.85 - clearDf),
          );
          dhi = ghi * df;
          const cosZ = Math.max(
            0.02,
            Math.cos((c.zenith * Math.PI) / 180),
          );
          dni = Math.max(0, (ghi - dhi) / cosZ);
        }
        const diurnal = 4.5 * Math.sin(((h - 9) / 24) * 2 * Math.PI);
        out.push({
          datetime: c.date.toISOString(),
          month: month + 1,
          hour: h,
          ghi,
          dni: Math.max(0, dni),
          dhi: Math.max(0, dhi),
          temperature: site.tempMonthly[month] + diurnal,
          windSpeed: 1.5,
        });
      }
    }
  }
  return out;
}
