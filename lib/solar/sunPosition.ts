/**
 * Güneş pozisyonu hesabı.
 *
 * NOAA / PSA tabanlı astronomik formüller; PV fizibilitesi için yeterli
 * doğrulukta (~0.01°–0.1°). Tüm açılar derece, zaman UTC kabul edilir;
 * yerel saate çevrim için `timezoneOffsetHours` kullanılır.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface SunPosition {
  /** Güneş yükseklik açısı (ufuktan), derece. Negatif = gece. */
  elevation: number;
  /** Zenit açısı (90 - elevation), derece. */
  zenith: number;
  /** Azimut, derece. 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı. */
  azimuth: number;
  /** Saat açısı, derece (öğlen = 0, sabah negatif). */
  hourAngle: number;
  /** Güneş deklinasyonu, derece. */
  declination: number;
}

/** Yılın günü (1–365/366). */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

/** Spencer (1971) Fourier serisi ile güneş deklinasyonu (derece). */
export function declination(n: number): number {
  const b = ((2 * Math.PI) / 365) * (n - 1);
  const d =
    0.006918 -
    0.399912 * Math.cos(b) +
    0.070257 * Math.sin(b) -
    0.006758 * Math.cos(2 * b) +
    0.000907 * Math.sin(2 * b) -
    0.002697 * Math.cos(3 * b) +
    0.00148 * Math.sin(3 * b);
  return d * RAD;
}

/** Zaman denklemi (dakika). */
export function equationOfTime(n: number): number {
  const b = ((2 * Math.PI) / 365) * (n - 1);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(b) -
      0.032077 * Math.sin(b) -
      0.014615 * Math.cos(2 * b) -
      0.04089 * Math.sin(2 * b))
  );
}

/** Dünya-Güneş mesafesi düzeltmeli güneş sabiti çarpanı (E0). */
export function eccentricityCorrection(n: number): number {
  const b = ((2 * Math.PI) / 365) * (n - 1);
  return (
    1.00011 +
    0.034221 * Math.cos(b) +
    0.00128 * Math.sin(b) +
    0.000719 * Math.cos(2 * b) +
    0.000077 * Math.sin(2 * b)
  );
}

/** Yatay düzlemde anlık atmosfer dışı (extraterrestrial) ışınım, W/m². */
export function extraterrestrialHorizontal(
  date: Date,
  latitude: number,
  longitude: number,
  timezoneOffsetHours: number,
): number {
  const Gsc = 1367; // güneş sabiti W/m²
  const n = dayOfYear(date);
  const pos = sunPosition(date, latitude, longitude, timezoneOffsetHours);
  const cosZ = Math.cos(pos.zenith * DEG);
  if (cosZ <= 0) return 0;
  return Gsc * eccentricityCorrection(n) * cosZ;
}

/**
 * Verilen UTC tarih için güneş pozisyonu.
 *
 * @param date  JS Date (UTC zaman değeri esas alınır)
 * @param latitude  enlem, derece (kuzey +)
 * @param longitude boylam, derece (doğu +)
 * @param timezoneOffsetHours  yerel saat - UTC (TR için +3)
 */
export function sunPosition(
  date: Date,
  latitude: number,
  longitude: number,
  timezoneOffsetHours: number,
): SunPosition {
  const n = dayOfYear(date);
  const decl = declination(n);
  const eot = equationOfTime(n);

  // Yerel görünür güneş zamanı (saat).
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const localStandard = utcHours + timezoneOffsetHours;
  // Boylam düzeltmesi: zaman dilimi orta boylamı = 15 * tz
  const lstm = 15 * timezoneOffsetHours;
  const solarTime = localStandard + (4 * (longitude - lstm) + eot) / 60;
  const hourAngle = 15 * (solarTime - 12); // derece

  const latR = latitude * DEG;
  const declR = decl * DEG;
  const haR = hourAngle * DEG;

  const sinElev =
    Math.sin(latR) * Math.sin(declR) +
    Math.cos(latR) * Math.cos(declR) * Math.cos(haR);
  const elevation = Math.asin(Math.min(1, Math.max(-1, sinElev))) * RAD;
  const zenith = 90 - elevation;

  // Azimut (kuzeyden saat yönü, 0=K, 180=G).
  const zenR = zenith * DEG;
  let cosAz =
    (Math.sin(declR) - Math.sin(latR) * Math.cos(zenR)) /
    (Math.cos(latR) * Math.sin(zenR));
  cosAz = Math.min(1, Math.max(-1, cosAz));
  let azimuth = Math.acos(cosAz) * RAD; // kuzeyden ölçülen, 0..180
  if (hourAngle > 0) azimuth = 360 - azimuth; // öğleden sonra batı tarafı

  return {
    elevation,
    zenith,
    azimuth,
    hourAngle,
    declination: decl,
  };
}

/** Gün doğumu/batımı saat açısı (derece). Kutup gün/gecesinde ±180/0. */
export function sunriseHourAngle(latitude: number, decl: number): number {
  const x = -Math.tan(latitude * DEG) * Math.tan(decl * DEG);
  if (x <= -1) return 180; // sürekli gündüz
  if (x >= 1) return 0; // sürekli gece
  return Math.acos(x) * RAD;
}
