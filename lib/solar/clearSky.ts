/**
 * Açık-hava (clear-sky) ışınım modeli — Hottel (1976) ışın geçirgenliği +
 * Liu-Jordan difüz korelasyonu (Duffie & Beckman, Solar Engineering of
 * Thermal Processes).
 *
 * Gerçekçi ışın baskın (beam-dominant) açık-hava profili üretir; sentetik
 * TMY üreticisi bunu aylık GHI'ye kalibre eder. Doğru beam/difüz ayrımı
 * eğik düzlem (POA) transpozisyonunun gerçekçi olması için kritiktir.
 */

const DEG = Math.PI / 180;

export interface ClearSkyIrradiance {
  /** Açık-hava global yatay, W/m². */
  ghi: number;
  /** Açık-hava direkt normal (DNI), W/m². */
  dni: number;
  /** Açık-hava difüz yatay (DHI), W/m². */
  dhi: number;
}

/**
 * Hottel + Liu-Jordan açık-hava ışınımı.
 *
 * @param zenithDeg güneş zenit açısı (derece)
 * @param altitudeM rakım (m, ≤ 2.5 km için geçerli; clamp'lenir)
 * @param eccentricity Dünya-Güneş mesafe düzeltmesi E0 (≈1)
 * @param climate r-faktör seti (yaz ortalama varsayılan)
 */
export function clearSkyHottel(
  zenithDeg: number,
  altitudeM: number,
  eccentricity = 1,
  climate: "tropical" | "midlatitude_summer" | "midlatitude_winter" = "midlatitude_summer",
): ClearSkyIrradiance {
  const cosZ = Math.cos(zenithDeg * DEG);
  if (cosZ <= 0) return { ghi: 0, dni: 0, dhi: 0 };

  const A = Math.min(altitudeM, 2500) / 1000; // km
  const a0s = 0.4237 - 0.00821 * Math.pow(6 - A, 2);
  const a1s = 0.5055 + 0.00595 * Math.pow(6.5 - A, 2);
  const ks = 0.2711 + 0.01858 * Math.pow(2.5 - A, 2);

  // İklim düzeltme faktörleri (Duffie & Beckman Tablo 2.8.1)
  const R: Record<string, [number, number, number]> = {
    tropical: [0.95, 0.98, 1.02],
    midlatitude_summer: [0.97, 0.99, 1.02],
    midlatitude_winter: [1.03, 1.01, 1.0],
  };
  const [r0, r1, rk] = R[climate];
  const a0 = r0 * a0s;
  const a1 = r1 * a1s;
  const k = rk * ks;

  const G0n = 1367 * eccentricity; // atmosfer dışı normal
  const tauB = a0 + a1 * Math.exp(-k / cosZ); // ışın geçirgenliği
  const tauD = 0.271 - 0.294 * tauB; // Liu-Jordan difüz geçirgenliği

  const dni = Math.max(0, G0n * tauB);
  const dhi = Math.max(0, G0n * cosZ * tauD);
  const ghi = dni * cosZ + dhi;
  return { ghi, dni, dhi };
}
