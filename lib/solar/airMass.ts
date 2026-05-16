/**
 * Hava kütlesi (Air Mass) ve buna bağlı spektral / IAM düzeltmeleri.
 */

/**
 * Kasten & Young (1989) bağıl optik hava kütlesi.
 * @param zenithDeg güneş zenit açısı (derece)
 */
export function airMassKastenYoung(zenithDeg: number): number {
  if (zenithDeg >= 90) return 38; // ufukta üst sınır
  const z = zenithDeg;
  return (
    1 /
    (Math.cos((z * Math.PI) / 180) +
      0.50572 * Math.pow(96.07995 - z, -1.6364))
  );
}

/**
 * Yüksekliğe göre düzeltilmiş (basınç) mutlak hava kütlesi.
 * @param altitudeM deniz seviyesinden yükseklik (m)
 */
export function absoluteAirMass(zenithDeg: number, altitudeM: number): number {
  const am = airMassKastenYoung(zenithDeg);
  const pressureRatio = Math.exp(-0.0001184 * altitudeM);
  return am * pressureRatio;
}

/**
 * Spektral düzeltme için basit polinom (PVWatts/Sandia benzeri, c-Si).
 * AM=1.5 civarında ≈ 1.0. Fizibilite için ikinci derece etki.
 */
export function spectralFactor(airMass: number): number {
  const a = [0.935823, 0.054289, -0.008677, 0.000527, -0.000011];
  const am = Math.min(Math.max(airMass, 0.5), 10);
  let f = 0;
  for (let i = 0; i < a.length; i++) f += a[i] * Math.pow(am, i);
  return Math.min(Math.max(f, 0.8), 1.05);
}

/**
 * Açıya bağlı yansıma kaybı — IAM (Incidence Angle Modifier),
 * ASHRAE modeli: IAM = 1 - b0·(1/cosθ - 1).
 * @param aoiDeg gelme açısı (derece), b0 tipik 0.05
 */
export function iamAshrae(aoiDeg: number, b0 = 0.05): number {
  if (aoiDeg >= 90) return 0;
  const cosA = Math.cos((aoiDeg * Math.PI) / 180);
  if (cosA <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - b0 * (1 / cosA - 1)));
}
