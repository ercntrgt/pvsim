/**
 * PVGIS REST API sarmalayıcı (ücretsiz, Avrupa + Türkiye).
 *
 * Birincil kaynak: TMY (Typical Meteorological Year) saatlik verisi —
 * GHI, DNI, DHI, 2m sıcaklık, 10m rüzgar. 8760 kayıt.
 *
 * Endpoint: {PVGIS_BASE_URL}/tmy   (varsayılan v5_2)
 * Şartname `seriescalc`'tan da bahseder; aynı sarmalayıcı onu da destekler.
 */

export interface HourlyWeather {
  /** ISO benzeri "YYYY-MM-DDTHH:00" (UTC). */
  datetime: string;
  month: number; // 1-12
  hour: number; // 0-23
  /** Global yatay ışınım, W/m². */
  ghi: number;
  /** Direkt normal ışınım, W/m². */
  dni: number;
  /** Difüz yatay ışınım, W/m². */
  dhi: number;
  /** 2m hava sıcaklığı, °C. */
  temperature: number;
  /** 10m rüzgar hızı, m/s. */
  windSpeed: number;
}

export interface PvgisFetchOptions {
  latitude: number;
  longitude: number;
  /** Varsayılan: process.env.PVGIS_BASE_URL veya v5_2 resmi URL. */
  baseUrl?: string;
  /** Saniye cinsinden timeout (varsayılan 15s — MVP kabul kriteri <5s hedef). */
  timeoutSec?: number;
}

const DEFAULT_BASE =
  process.env.PVGIS_BASE_URL || "https://re.jrc.ec.europa.eu/api/v5_2";

interface PvgisTmyRow {
  // PVGIS v5.2 TMY anahtarı "time(UTC)"; bazı sürümlerde "time".
  "time(UTC)"?: string;
  time?: string; // "20070101:0010"
  T2m: number;
  RH: number;
  "G(h)": number;
  "Gb(n)": number;
  "Gd(h)": number;
  "IR(h)": number;
  WS10m: number;
  WD10m: number;
  SP: number;
}

/** PVGIS TMY JSON gövdesini normalize edilmiş saatlik diziye çevirir. */
export function parsePvgisTmy(json: unknown): HourlyWeather[] {
  const rows = (json as { outputs?: { tmy_hourly?: PvgisTmyRow[] } })?.outputs
    ?.tmy_hourly;
  if (!Array.isArray(rows)) {
    throw new Error("PVGIS TMY yanıtı beklenen formatta değil (tmy_hourly yok)");
  }
  const out: HourlyWeather[] = [];
  for (const r of rows) {
    // PVGIS v5.2 anahtarı "time(UTC)"; eski/varyant: "time".
    const rawTime = r["time(UTC)"] ?? r.time;
    if (typeof rawTime !== "string" || !rawTime.includes(":")) continue;
    // "20070101:0010" → yıl ay gün : saat dk
    const [datePart, timePart] = rawTime.split(":");
    if (!datePart || datePart.length < 8 || !timePart) continue;
    const month = Number(datePart.slice(4, 6));
    const day = datePart.slice(6, 8);
    const hour = Number(timePart.slice(0, 2));
    // PVGIS TMY zaman damgaları UTC'dir → açıkça Z ekle.
    out.push({
      datetime: `${datePart.slice(0, 4)}-${datePart.slice(
        4,
        6,
      )}-${day}T${String(hour).padStart(2, "0")}:00:00Z`,
      month,
      hour,
      ghi: Number(r["G(h)"] ?? 0),
      dni: Number(r["Gb(n)"] ?? 0),
      dhi: Number(r["Gd(h)"] ?? 0),
      temperature: Number(r.T2m ?? 15),
      windSpeed: Number(r.WS10m ?? 1),
    });
  }
  if (out.length < 8000) {
    throw new Error(
      `PVGIS TMY ayrıştırma yetersiz: ${out.length} geçerli saat`,
    );
  }
  return out;
}

function withTimeout(timeoutSec: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutSec * 1000);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

/**
 * PVGIS TMY saatlik verisini çeker (8760 kayıt).
 * Ağ hatası / format hatası durumunda Error fırlatır — çağıran NASA POWER
 * veya gömülü TR iklim verisine düşmelidir.
 */
export async function fetchPvgisTmy(
  opts: PvgisFetchOptions,
): Promise<HourlyWeather[]> {
  const base = opts.baseUrl || DEFAULT_BASE;
  const url =
    `${base}/tmy?lat=${opts.latitude}&lon=${opts.longitude}` +
    `&outputformat=json&browser=0`;
  const { signal, clear } = withTimeout(opts.timeoutSec ?? 15);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`PVGIS HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = parsePvgisTmy(json);
    if (data.length < 8000) {
      throw new Error(`PVGIS eksik veri: ${data.length} saat`);
    }
    return data;
  } finally {
    clear();
  }
}

/**
 * seriescalc endpoint'i (belirli yıl aralığı, opsiyonel PV hesabı kapalı).
 * Bizim modelimizi beslemek için radyasyon bileşenleri (components=1) ile
 * çağrılır. TMY tercih edilir; bu metot ileri kullanım içindir.
 */
export async function fetchPvgisSeriesCalc(
  opts: PvgisFetchOptions & { startYear?: number; endYear?: number },
): Promise<HourlyWeather[]> {
  const base = opts.baseUrl || DEFAULT_BASE;
  const url =
    `${base}/seriescalc?lat=${opts.latitude}&lon=${opts.longitude}` +
    `&outputformat=json&pvcalculation=0&components=1&browser=0` +
    (opts.startYear ? `&startyear=${opts.startYear}` : "") +
    (opts.endYear ? `&endyear=${opts.endYear}` : "");
  const { signal, clear } = withTimeout(opts.timeoutSec ?? 20);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`PVGIS seriescalc HTTP ${res.status}`);
    const json = (await res.json()) as {
      outputs?: { hourly?: Record<string, number | string>[] };
    };
    const rows = json?.outputs?.hourly;
    if (!Array.isArray(rows)) {
      throw new Error("PVGIS seriescalc beklenen formatta değil");
    }
    return rows.map((r) => {
      const time = String(r.time); // "20200101:0010"
      const month = Number(time.slice(4, 6));
      const hour = Number(time.slice(9, 11));
      const beam = Number(r["Gb(i)"] ?? 0);
      const diff = Number(r["Gd(i)"] ?? 0);
      const refl = Number(r["Gr(i)"] ?? 0);
      return {
        datetime: `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(
          6,
          8,
        )}T${String(hour).padStart(2, "0")}:00:00Z`,
        month,
        hour,
        ghi: beam + diff + refl,
        dni: beam,
        dhi: diff,
        temperature: Number(r.T2m ?? 15),
        windSpeed: Number(r.WS10m ?? 1),
      };
    });
  } finally {
    clear();
  }
}
