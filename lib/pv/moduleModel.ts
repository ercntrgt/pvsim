/**
 * Fotovoltaik modül modeli: hücre sıcaklığı ve sıcaklık düzeltmeli DC güç.
 */

export type ArrayMountType =
  | "open_rack" // arazi / açık konstrüksiyon (en serin)
  | "roof_mount" // çatı üstü (ara)
  | "insulated_back"; // yalıtımlı arka (en sıcak)

/** Sandia modül sıcaklık modeli katsayıları (PVWatts varsayılanları). */
const SANDIA_COEFF: Record<
  ArrayMountType,
  { a: number; b: number; deltaT: number }
> = {
  open_rack: { a: -3.56, b: -0.075, deltaT: 3 },
  roof_mount: { a: -2.98, b: -0.0471, deltaT: 1 },
  insulated_back: { a: -2.81, b: -0.0455, deltaT: 0 },
};

/**
 * Sandia hücre sıcaklığı (°C).
 *   T_mod = T_amb + POA · e^(a + b·WS)
 *   T_cell = T_mod + (POA/1000)·ΔT
 */
export function cellTemperatureSandia(
  poaWm2: number,
  ambientC: number,
  windMs: number,
  mount: ArrayMountType = "open_rack",
): number {
  const { a, b, deltaT } = SANDIA_COEFF[mount];
  const tModule = ambientC + poaWm2 * Math.exp(a + b * windMs);
  return tModule + (poaWm2 / 1000) * deltaT;
}

/**
 * NOCT tabanlı basit hücre sıcaklığı (datasheet NOCT ile).
 *   T_cell = T_amb + (NOCT - 20)/800 · POA
 */
export function cellTemperatureNoct(
  poaWm2: number,
  ambientC: number,
  noctC: number,
): number {
  return ambientC + ((noctC - 20) / 800) * poaWm2;
}

export interface PvModuleSpec {
  /** STC tepe gücü, Wp. */
  pmaxW: number;
  /** Güç sıcaklık katsayısı, %/°C (negatif, örn. -0.35). */
  tempCoeffPmaxPctPerC: number;
  /** NOCT, °C (varsayılan 45). */
  noctC?: number;
  /** Modül verimi (0-1), opsiyonel bilgi. */
  efficiency?: number;
}

/**
 * Tek modülün anlık DC çıkış gücü (W).
 *
 *   P_dc = P_stc · (POA/1000) · (1 + γ·(T_cell - 25))
 *
 * γ = tempCoeffPmaxPctPerC / 100 (1/°C).
 */
export function moduleDcPower(
  module: PvModuleSpec,
  poaWm2: number,
  cellTempC: number,
): number {
  if (poaWm2 <= 0) return 0;
  const gamma = module.tempCoeffPmaxPctPerC / 100;
  const p =
    module.pmaxW * (poaWm2 / 1000) * (1 + gamma * (cellTempC - 25));
  return Math.max(0, p);
}

/**
 * Dizi (array) toplam DC gücü (W).
 * `dcNameplateW`: sistemin STC toplam DC gücü (kWp·1000).
 */
export function arrayDcPower(
  dcNameplateW: number,
  tempCoeffPctPerC: number,
  poaWm2: number,
  cellTempC: number,
): number {
  if (poaWm2 <= 0) return 0;
  const gamma = tempCoeffPctPerC / 100;
  return Math.max(
    0,
    dcNameplateW * (poaWm2 / 1000) * (1 + gamma * (cellTempC - 25)),
  );
}
