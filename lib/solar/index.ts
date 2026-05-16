import type { HourlyWeather } from "./pvgis";
import { fetchPvgisTmy } from "./pvgis";
import { fetchNasaPowerHourly } from "./nasaPower";
import { syntheticTmy, nearestSite, annualGhi } from "./trClimate";

export * from "./sunPosition";
export * from "./airMass";
export * from "./irradiance";
export * from "./pvgis";
export * from "./nasaPower";
export * from "./trClimate";

export type SolarSource = "pvgis" | "nasa-power" | "embedded-tr";

export interface SolarResource {
  source: SolarSource;
  hourly: HourlyWeather[];
  annualGhiKwhM2: number;
  note?: string;
}

/**
 * Solar kaynak çözümleyici (dayanıklılık zinciri):
 *   1) PVGIS TMY (resmi, tercih edilen)
 *   2) NASA POWER iklimatolojisi (yedek)
 *   3) Gömülü TR iklim verisi (her zaman çalışır, offline)
 *
 * `preferEmbedded=true` testlerde/offline modda doğrudan 3'ü kullanır.
 */
export async function resolveSolarResource(opts: {
  latitude: number;
  longitude: number;
  timezoneOffsetHours?: number;
  preferEmbedded?: boolean;
}): Promise<SolarResource> {
  const tz = opts.timezoneOffsetHours ?? 3;

  if (opts.preferEmbedded) {
    const hourly = syntheticTmy(opts.latitude, opts.longitude, tz);
    return {
      source: "embedded-tr",
      hourly,
      annualGhiKwhM2: sumGhi(hourly),
      note: `Gömülü TR iklim (${nearestSite(opts.latitude, opts.longitude).name})`,
    };
  }

  try {
    const hourly = await fetchPvgisTmy({
      latitude: opts.latitude,
      longitude: opts.longitude,
    });
    return { source: "pvgis", hourly, annualGhiKwhM2: sumGhi(hourly) };
  } catch (e) {
    // PVGIS başarısız → NASA POWER
    try {
      const hourly = await fetchNasaPowerHourly({
        latitude: opts.latitude,
        longitude: opts.longitude,
        timezoneOffsetHours: tz,
      });
      return {
        source: "nasa-power",
        hourly,
        annualGhiKwhM2: sumGhi(hourly),
        note: `PVGIS erişilemedi (${(e as Error).message}); NASA POWER kullanıldı`,
      };
    } catch (e2) {
      // NASA da başarısız → gömülü TR
      const hourly = syntheticTmy(opts.latitude, opts.longitude, tz);
      return {
        source: "embedded-tr",
        hourly,
        annualGhiKwhM2: sumGhi(hourly),
        note: `Canlı kaynaklar erişilemedi (${(e2 as Error).message}); gömülü TR iklim verisi`,
      };
    }
  }
}

function sumGhi(hourly: HourlyWeather[]): number {
  return Math.round(hourly.reduce((acc, h) => acc + h.ghi, 0) / 1000);
}

export { annualGhi };
