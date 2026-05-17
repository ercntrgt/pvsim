/**
 * Inverter modeli: kısmi yük verim eğrisi + AC gücü kırpma (clipping).
 *
 * PVWatts inverter modeli kullanılır:
 *   ζ  = P_dc / P_dc0      (P_dc0 = P_ac0 / η_nom)
 *   η  = (η_nom/η_ref)·(−0.0162·ζ − 0.0059/ζ + 0.9858)
 *   P_ac = min(η·P_dc, P_ac0)
 */

export interface InverterSpec {
  /** Nominal AC çıkış gücü, W (P_ac0). */
  acRatedW: number;
  /** Nominal (CEC/EU) verim, 0-1 (örn. 0.975). */
  nominalEfficiency: number;
  /** Gece/standby tüketimi, W (opsiyonel, varsayılan 0). */
  nightTareW?: number;
}

const ETA_REF = 0.9637; // PVWatts referans

/** Kısmi yük inverter verimi (0-1). */
export function inverterEfficiency(
  pdcW: number,
  inv: InverterSpec,
): number {
  if (pdcW <= 0) return 0;
  const pdc0 = inv.acRatedW / inv.nominalEfficiency;
  const zeta = pdcW / pdc0;
  if (zeta <= 0) return 0;
  const etaCurve =
    (inv.nominalEfficiency / ETA_REF) *
    (-0.0162 * zeta - 0.0059 / zeta + 0.9858);
  return Math.min(inv.nominalEfficiency * 1.02, Math.max(0, etaCurve));
}

export interface InverterOutput {
  acW: number;
  /** Kırpılan (clip) güç, W. */
  clippedW: number;
  efficiency: number;
}

/** DC girişten AC çıkışa; nominal AC üstünü kırpar. */
export function inverterAcPower(
  pdcW: number,
  inv: InverterSpec,
): InverterOutput {
  const tare = inv.nightTareW ?? 0;
  if (pdcW <= 0) {
    return { acW: -tare, clippedW: 0, efficiency: 0 };
  }
  const eta = inverterEfficiency(pdcW, inv);
  const raw = eta * pdcW;
  const acW = Math.min(raw, inv.acRatedW);
  return {
    acW,
    clippedW: Math.max(0, raw - inv.acRatedW),
    efficiency: eta,
  };
}

/**
 * DC/AC boyutlandırma oranı ve doğrulama.
 * Tipik aralık 1.10–1.35; dışında uyarı döner.
 */
export function dcAcRatio(
  dcNameplateW: number,
  inverterAcW: number,
): { ratio: number; ok: boolean; warning?: string } {
  const ratio = dcNameplateW / inverterAcW;
  if (ratio < 1.0) {
    return {
      ratio,
      ok: false,
      warning: "Inverter aşırı boyutlu (DC/AC < 1.0) — verimsiz",
    };
  }
  if (ratio > 1.4) {
    return {
      ratio,
      ok: false,
      warning: `DC/AC ${ratio.toFixed(2)} yüksek — aşırı clipping kaybı`,
    };
  }
  return { ratio, ok: true };
}
