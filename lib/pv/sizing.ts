/**
 * Otomatik sistem boyutlandırma & string doğrulama.
 *
 * Hedef kWp veya çatı alanından panel sayısı, string yapısı, DC/AC oranı
 * ve gerilim sınırı kontrollerini üretir (SystemDesigner önerisi).
 */

import type { Panel, Inverter } from "../data/catalog";

export interface SizingInput {
  panel: Panel;
  inverter: Inverter;
  /** Hedef DC güç (kWp). roofAreaM2 verilirse opsiyonel. */
  targetKwp?: number;
  /** Kullanılabilir çatı/arazi alanı (m²) — hedef yerine alan bazlı. */
  usableAreaM2?: number;
  /** Alan kullanım faktörü (sıra arası vb.), varsayılan 0.62 çatı. */
  areaUtilization?: number;
  /** Konum minimum hava sıcaklığı (°C) — Voc soğuk sınırı. */
  minAmbientC?: number;
  /** Maksimum hücre sıcaklığı (°C) — Vmpp sıcak sınırı. */
  maxCellC?: number;
}

export interface SizingCheck {
  ok: boolean;
  label: string;
  detail: string;
}

export interface SizingResult {
  panelCount: number;
  panelsPerString: number;
  stringCount: number;
  dcKwp: number;
  acKw: number;
  dcAcRatio: number;
  /** Soğukta string açık devre gerilimi (V). */
  stringVocColdV: number;
  /** Sıcakta string Vmpp (V). */
  stringVmppHotV: number;
  estimatedAreaM2: number;
  checks: SizingCheck[];
  recommendation: string;
}

export function recommendSystem(input: SizingInput): SizingResult {
  const { panel, inverter } = input;
  const areaUtil = input.areaUtilization ?? 0.62;
  const minAmb = input.minAmbientC ?? -10;
  const maxCell = input.maxCellC ?? 70;

  // 1) Hedef panel sayısı
  let targetPanels: number;
  const panelAreaM2 = (panel.lengthMm * panel.widthMm) / 1_000_000;
  if (input.targetKwp && input.targetKwp > 0) {
    targetPanels = Math.max(
      1,
      Math.round((input.targetKwp * 1000) / panel.pmaxW),
    );
  } else if (input.usableAreaM2 && input.usableAreaM2 > 0) {
    targetPanels = Math.max(
      1,
      Math.floor((input.usableAreaM2 * areaUtil) / panelAreaM2),
    );
  } else {
    targetPanels = Math.round((inverter.acRatedW * 1.15) / panel.pmaxW);
  }

  // 2) String başına panel: soğukta Voc sınırı (inverter mppt/DC max)
  const vocCold = (count: number) =>
    count *
    panel.vocV *
    (1 + (panel.tempCoeffVocPctPerC / 100) * (minAmb - 25));
  const vmppHot = (count: number) =>
    count *
    panel.vmppV *
    (1 + (panel.tempCoeffVocPctPerC / 100) * (maxCell - 25));

  const maxStringV = inverter.mpptVMaxV;
  let panelsPerString = Math.max(
    1,
    Math.floor(maxStringV / vocCold(1)),
  );
  // Vmpp sıcakta MPPT alt sınırının altına düşmesin
  while (
    panelsPerString > 1 &&
    vmppHot(panelsPerString) < inverter.mpptVMinV
  ) {
    panelsPerString--;
  }

  // 3) String sayısı (panel sayısını stringe tam böl)
  let stringCount = Math.max(
    1,
    Math.round(targetPanels / panelsPerString),
  );
  let panelCount = stringCount * panelsPerString;

  // DC/AC hedef ~1.15–1.25; clipping aşırıysa string sayısını ayarla
  const acKw = inverter.acRatedW / 1000;
  const adjustRatio = () =>
    (panelCount * panel.pmaxW) / 1000 / acKw;
  while (adjustRatio() > 1.35 && stringCount > 1) {
    stringCount--;
    panelCount = stringCount * panelsPerString;
  }

  const dcKwp = (panelCount * panel.pmaxW) / 1000;
  const dcAcRatio = dcKwp / acKw;
  const vCold = vocCold(panelsPerString);
  const vHot = vmppHot(panelsPerString);

  const checks: SizingCheck[] = [
    {
      ok: vCold <= maxStringV,
      label: "String Voc (soğuk)",
      detail: `${vCold.toFixed(0)} V ${
        vCold <= maxStringV ? "≤" : ">"
      } inverter max ${maxStringV} V`,
    },
    {
      ok: vHot >= inverter.mpptVMinV,
      label: "String Vmpp (sıcak)",
      detail: `${vHot.toFixed(0)} V ${
        vHot >= inverter.mpptVMinV ? "≥" : "<"
      } MPPT min ${inverter.mpptVMinV} V`,
    },
    {
      ok: dcAcRatio >= 1.05 && dcAcRatio <= 1.35,
      label: "DC/AC oranı",
      detail: `${dcAcRatio.toFixed(2)} (ideal 1.10–1.30)`,
    },
    {
      ok: dcKwp * 1000 <= inverter.maxDcW * 1.05,
      label: "Inverter DC kapasitesi",
      detail: `${dcKwp.toFixed(1)} kWp / ${(
        inverter.maxDcW / 1000
      ).toFixed(1)} kWp max`,
    },
    {
      ok: panel.imppA <= inverter.maxInputCurrentA,
      label: "MPPT giriş akımı",
      detail: `panel Impp ${panel.imppA} A / max ${inverter.maxInputCurrentA} A`,
    },
  ];

  const allOk = checks.every((c) => c.ok);
  return {
    panelCount,
    panelsPerString,
    stringCount,
    dcKwp: round1(dcKwp),
    acKw,
    dcAcRatio: round2(dcAcRatio),
    stringVocColdV: round1(vCold),
    stringVmppHotV: round1(vHot),
    estimatedAreaM2: round1(panelCount * panelAreaM2),
    checks,
    recommendation: `${panelCount} × ${panel.brand} ${panel.model} (${panelsPerString} panel/string, ${stringCount} string) + ${
      Math.max(1, Math.round(dcKwp / (inverter.acRatedW / 1000) / 1.2))
    } × ${inverter.brand} ${inverter.model}${
      allOk ? "" : " — UYARI: bazı sınır kontrolleri başarısız"
    }`,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
