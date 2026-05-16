/**
 * Seviyelendirilmiş Enerji Maliyeti (Levelized Cost of Energy).
 *
 *   LCOE = ( CapEx + Σ_{t=1}^{N} OpEx_t / (1+r)^t )
 *          ───────────────────────────────────────
 *          (        Σ_{t=1}^{N} E_t / (1+r)^t       )
 *
 * Üretilen enerji de iskonto edilir (yaygın IEA/NREL konvansiyonu): bankalar
 * için anahtar metrik. ₺/kWh döner.
 */
export function lcoe(params: {
  capex: number;
  /** Yıllık işletme gideri dizisi (1..N), ₺. */
  opexByYear: number[];
  /** Yıllık üretilen enerji dizisi (1..N, degradasyonlu), kWh. */
  energyByYear: number[];
  /** İskonto oranı. */
  discountRate: number;
}): number {
  const { capex, opexByYear, energyByYear, discountRate } = params;
  const n = Math.min(opexByYear.length, energyByYear.length);

  let costPv = capex;
  let energyPv = 0;
  for (let i = 0; i < n; i++) {
    const t = i + 1;
    const df = Math.pow(1 + discountRate, t);
    costPv += opexByYear[i] / df;
    energyPv += energyByYear[i] / df;
  }
  if (energyPv <= 0) return Infinity;
  return costPv / energyPv;
}
