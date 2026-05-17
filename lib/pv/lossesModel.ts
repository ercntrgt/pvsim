/**
 * DC/AC kayıp dağılımı.
 *
 * pvsim-prompt.md § 3 varsayılanlarını izler. Kayıplar çarpımsal birleştirilir:
 *   derate = Π (1 - lᵢ)
 * Inverter ve sıcaklık kaybı BURADA yer almaz — onlar ayrı modellenir
 * (inverterModel / moduleModel).
 */

export interface LossStack {
  /** Kirlilik, varsayılan 0.02. */
  soiling: number;
  /** Gölgeleme (kullanıcı/ufuk profili), varsayılan 0. */
  shading: number;
  /** Kar, konuma göre, varsayılan 0. */
  snow: number;
  /** Modül uyumsuzluğu (mismatch), varsayılan 0.02. */
  mismatch: number;
  /** DC kablo kaybı, varsayılan 0.02. */
  dcWiring: number;
  /** AC kablo kaybı, varsayılan 0.01. */
  acWiring: number;
  /** Trafo (varsa), varsayılan 0. */
  transformer: number;
  /** Kullanılabilirlik kaybı (1 - availability), varsayılan 0.01. */
  availability: number;
  /** LID ilk yıl, varsayılan 0.015. */
  lid: number;
  /** Nameplate sapması, varsayılan 0.01. */
  nameplate: number;
}

export const DEFAULT_LOSSES: LossStack = {
  soiling: 0.02,
  shading: 0,
  snow: 0,
  mismatch: 0.02,
  dcWiring: 0.02,
  acWiring: 0.01,
  transformer: 0,
  availability: 0.01,
  lid: 0.015,
  nameplate: 0.01,
};

/**
 * Tüm kayıpların birleşik derate faktörü (0-1).
 * @param includeLid LID yalnızca 1. yıl uygulanır.
 */
export function combinedDerate(
  losses: LossStack,
  includeLid = true,
): number {
  const items = [
    losses.soiling,
    losses.shading,
    losses.snow,
    losses.mismatch,
    losses.dcWiring,
    losses.acWiring,
    losses.transformer,
    losses.availability,
    losses.nameplate,
    includeLid ? losses.lid : 0,
  ];
  return items.reduce((acc, l) => acc * (1 - clamp01(l)), 1);
}

/** Toplam kayıp yüzdesi (raporlama için). */
export function totalLossPercent(
  losses: LossStack,
  includeLid = true,
): number {
  return (1 - combinedDerate(losses, includeLid)) * 100;
}

/**
 * t. yıl degradasyon faktörü.
 *   1. yıl: (1 - lid bileşeni zaten derate içinde) — burada yalnızca yıllık
 *   degradasyon uygulanır: f(t) = (1 - d)^(t-1)
 */
export function degradationFactor(year: number, annualDegradation: number): number {
  return Math.pow(1 - annualDegradation, Math.max(0, year - 1));
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
