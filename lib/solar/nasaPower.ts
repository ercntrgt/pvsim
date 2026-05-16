/**
 * NASA POWER API yedek solar veri kaynağı.
 *
 * PVGIS erişilemediğinde aylık iklimatoloji (GHI + sıcaklık) çekilir ve
 * `syntheticTmy` ile saatlik seriye dönüştürülür.
 *
 * Endpoint: power.larc.nasa.gov/api/temporal/climatology/point
 */

import type { HourlyWeather } from "./pvgis";
import type { ClimateSite } from "./trClimate";
import { syntheticTmyFromSite } from "./trClimate";

const DEFAULT_BASE =
  process.env.NASA_POWER_BASE_URL || "https://power.larc.nasa.gov/api";

interface NasaClimatologyResponse {
  properties?: {
    parameter?: {
      ALLSKY_SFC_SW_DWN?: Record<string, number>; // kWh/m²/gün, aylık
      T2M?: Record<string, number>; // °C, aylık
    };
  };
}

const MONTH_KEYS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** NASA POWER climatology JSON'undan ClimateSite üretir. */
export function parseNasaClimatology(
  json: unknown,
  lat: number,
  lon: number,
): ClimateSite {
  const p = (json as NasaClimatologyResponse)?.properties?.parameter;
  const ghi = p?.ALLSKY_SFC_SW_DWN;
  const temp = p?.T2M;
  if (!ghi || !temp) {
    throw new Error("NASA POWER yanıtı beklenen formatta değil");
  }
  return {
    name: `NASA(${lat.toFixed(2)},${lon.toFixed(2)})`,
    lat,
    lon,
    ghiDaily: MONTH_KEYS.map((k) => ghi[k] ?? 0),
    tempMonthly: MONTH_KEYS.map((k) => temp[k] ?? 15),
  };
}

/**
 * NASA POWER aylık iklimatolojisini çekip saatlik sentetik seriye çevirir.
 * Hata durumunda Error fırlatır — çağıran gömülü TR verisine düşmelidir.
 */
export async function fetchNasaPowerHourly(opts: {
  latitude: number;
  longitude: number;
  baseUrl?: string;
  timeoutSec?: number;
  timezoneOffsetHours?: number;
}): Promise<HourlyWeather[]> {
  const base = opts.baseUrl || DEFAULT_BASE;
  const url =
    `${base}/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,T2M` +
    `&community=RE&longitude=${opts.longitude}&latitude=${opts.latitude}` +
    `&format=JSON`;
  const ctrl = new AbortController();
  const id = setTimeout(
    () => ctrl.abort(),
    (opts.timeoutSec ?? 15) * 1000,
  );
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);
    const json = await res.json();
    const site = parseNasaClimatology(json, opts.latitude, opts.longitude);
    // NASA aylık GHI/sıcaklık verisini doğrudan sentetik üreticiye sür.
    return syntheticTmyFromSite(
      site,
      opts.latitude,
      opts.longitude,
      opts.timezoneOffsetHours ?? 3,
    );
  } finally {
    clearTimeout(id);
  }
}
