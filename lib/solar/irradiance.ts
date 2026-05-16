/**
 * Düzlem üstü ışınım (Plane of Array, POA) hesabı.
 *
 * Yatay GHI/DHI/DNI değerlerini eğik panel düzlemine Hay-Davies anizotropik
 * modeli ile taşır. Sadece GHI varsa Erbs korelasyonu ile difüz ayrıştırır.
 *
 * Açı konvansiyonu: surfaceAzimuth 0=Kuzey, 180=Güney (TR'de ideal ~180).
 */

const DEG = Math.PI / 180;

export interface IrradianceComponents {
  /** Global yatay ışınım, W/m². */
  ghi: number;
  /** Difüz yatay ışınım, W/m². */
  dhi: number;
  /** Direkt normal ışınım, W/m². */
  dni: number;
}

export interface PoaResult {
  /** Toplam düzlem üstü ışınım, W/m². */
  poaGlobal: number;
  poaBeam: number;
  poaSkyDiffuse: number;
  poaGroundReflected: number;
  /** Gelme açısı (AOI), derece. */
  aoi: number;
}

/** Güneş ışını ile panel normali arasındaki gelme açısı (derece). */
export function angleOfIncidence(
  sunZenithDeg: number,
  sunAzimuthDeg: number,
  surfaceTiltDeg: number,
  surfaceAzimuthDeg: number,
): number {
  const z = sunZenithDeg * DEG;
  const az = sunAzimuthDeg * DEG;
  const t = surfaceTiltDeg * DEG;
  const sAz = surfaceAzimuthDeg * DEG;
  const cosAoi =
    Math.cos(z) * Math.cos(t) +
    Math.sin(z) * Math.sin(t) * Math.cos(az - sAz);
  return Math.acos(Math.min(1, Math.max(-1, cosAoi))) / DEG;
}

/**
 * Erbs (1982) difüz fraksiyon korelasyonu — sadece GHI biliniyorsa
 * DHI ve DNI'yi tahmin eder. kt: berraklık indeksi.
 */
export function erbsDecomposition(
  ghi: number,
  extraterrestrialHorizontal: number,
  sunZenithDeg: number,
): { dhi: number; dni: number } {
  if (ghi <= 0 || extraterrestrialHorizontal <= 0) {
    return { dhi: 0, dni: 0 };
  }
  const kt = Math.min(1, ghi / extraterrestrialHorizontal);
  let df: number;
  if (kt <= 0.22) df = 1 - 0.09 * kt;
  else if (kt <= 0.8)
    df =
      0.9511 -
      0.1604 * kt +
      4.388 * kt ** 2 -
      16.638 * kt ** 3 +
      12.336 * kt ** 4;
  else df = 0.165;
  const dhi = ghi * df;
  const cosZ = Math.cos(sunZenithDeg * DEG);
  const dni = cosZ > 0.01 ? (ghi - dhi) / cosZ : 0;
  return { dhi, dni: Math.max(0, dni) };
}

/**
 * Hay-Davies (1980) anizotropik transpozisyon.
 *
 * @param albedo zemin yansıtması (varsayılan 0.2)
 */
export function poaHayDavies(
  irr: IrradianceComponents,
  sunZenithDeg: number,
  sunAzimuthDeg: number,
  surfaceTiltDeg: number,
  surfaceAzimuthDeg: number,
  extraterrestrialNormal: number,
  albedo = 0.2,
): PoaResult {
  const { ghi, dhi, dni } = irr;
  const aoi = angleOfIncidence(
    sunZenithDeg,
    sunAzimuthDeg,
    surfaceTiltDeg,
    surfaceAzimuthDeg,
  );
  const cosAoi = Math.max(0, Math.cos(aoi * DEG));
  const cosZ = Math.max(0, Math.cos(sunZenithDeg * DEG));
  const tilt = surfaceTiltDeg * DEG;

  // Direkt bileşen
  const poaBeam = dni * cosAoi;

  // Anizotropi indeksi (sirkümsolar fraksiyon)
  const ai =
    extraterrestrialNormal > 0
      ? Math.min(1, dni / extraterrestrialNormal)
      : 0;
  // Rb: direkt geometrik oran (clamp ile düşük güneşte stabil)
  const rb = cosZ > 0.01 ? cosAoi / cosZ : 0;

  const skyIsotropic = dhi * (1 - ai) * ((1 + Math.cos(tilt)) / 2);
  const skyCircumsolar = dhi * ai * rb;
  const poaSkyDiffuse = Math.max(0, skyIsotropic + skyCircumsolar);

  const poaGroundReflected =
    ghi * albedo * ((1 - Math.cos(tilt)) / 2);

  const poaGlobal = poaBeam + poaSkyDiffuse + poaGroundReflected;
  return {
    poaGlobal,
    poaBeam,
    poaSkyDiffuse,
    poaGroundReflected,
    aoi,
  };
}

/**
 * Yıllık enerjiyi maksimize eden optimum eğimi grid search ile bulur.
 * `annualPoaForTilt`: verilen tilt için yıllık toplam POA (kWh/m²) döndüren
 * geri çağrı (genelde 8760 saatlik döngü).
 */
export function findOptimalTilt(
  annualPoaForTilt: (tiltDeg: number) => number,
  minTilt = 0,
  maxTilt = 60,
  step = 1,
): { optimalTilt: number; annualPoa: number } {
  let bestTilt = minTilt;
  let bestPoa = -Infinity;
  for (let t = minTilt; t <= maxTilt; t += step) {
    const p = annualPoaForTilt(t);
    if (p > bestPoa) {
      bestPoa = p;
      bestTilt = t;
    }
  }
  return { optimalTilt: bestTilt, annualPoa: bestPoa };
}

/**
 * 36 noktalı ufuk profili (her 10°'de bir yükseklik açısı, derece).
 * Güneş azimutuna karşılık gelen ufuk yüksekliği güneş yüksekliğinden
 * büyükse o saat direkt ışınım gölgelenir (true döner).
 */
export function isHorizonShaded(
  horizonProfile: number[],
  sunAzimuthDeg: number,
  sunElevationDeg: number,
): boolean {
  if (!horizonProfile || horizonProfile.length === 0) return false;
  const n = horizonProfile.length;
  const bucketSize = 360 / n;
  const idx =
    ((Math.round(sunAzimuthDeg / bucketSize) % n) + n) % n;
  return sunElevationDeg < horizonProfile[idx];
}
