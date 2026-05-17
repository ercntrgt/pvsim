/**
 * Çatı/arazi panel yerleşim algoritması.
 *
 * Dikdörtgen kullanılabilir alana panelleri grid olarak yerleştirir;
 * portrait/landscape karşılaştırması yapar, en çok panel sığan yönü seçer.
 *
 * İki montaj tipi:
 *  - "flush"  : eğimli çatıya paralel (sıra arası boşluk yok)
 *  - "tilted" : düz çatı/arazide tilt ayaklı (sıra arası gölgelemesiz mesafe)
 *
 * Sıra arası (tilted):  D = h·cos β + h·sin β / tan α
 *   h = panelin eğim yönündeki boyu, β = tilt, α = en düşük güneş açısı
 *   (kış gündönümü öğle: α = 90 − enlem − 23.45, ≥ ~7° clamp).
 * Şartnamedeki sade kural (h·tan α) bunun yaklaşık halidir.
 */

export type PanelOrientation = "portrait" | "landscape" | "auto";
export type RoofMount = "flush" | "tilted";

export interface RoofObstacle {
  /** Engel genişliği (m). */
  widthM: number;
  /** Engel derinliği (m). */
  depthM: number;
  /** Adet (baca/havalandırma sayısı), varsayılan 1. */
  count?: number;
}

export interface RoofLayoutInput {
  /** Kullanılabilir çatı genişliği (m) — X ekseni. */
  roofWidthM: number;
  /** Kullanılabilir çatı derinliği/uzunluğu (m) — Y ekseni. */
  roofLengthM: number;
  /** Panel uzun kenar (mm). */
  panelLengthMm: number;
  /** Panel kısa kenar (mm). */
  panelWidthMm: number;
  /** Panel STC gücü (Wp) — kWp tahmini için. */
  panelPmaxW: number;
  orientation?: PanelOrientation;
  mount?: RoofMount;
  /** Tilt açısı (derece) — tilted montajda sıra arası için. */
  tiltDeg?: number;
  /** Enlem (derece) — tilted montajda min güneş açısı için. */
  latitudeDeg?: number;
  /** Kenar boşluğu / setback (m), her kenardan, varsayılan 0.3. */
  setbackM?: number;
  /** Paneller arası montaj boşluğu (m), varsayılan 0.02. */
  panelGapM?: number;
  obstacles?: RoofObstacle[];
}

export interface RoofLayoutResult {
  orientation: "portrait" | "landscape";
  mount: RoofMount;
  panelsPerRow: number;
  rows: number;
  totalPanels: number;
  estimatedKwp: number;
  usedAreaM2: number;
  roofAreaM2: number;
  /** Zemin kaplama oranı (GCR ≈ panel alanı / ayrılan alan). */
  groundCoverageRatio: number;
  rowPitchM: number;
  obstacleLossPanels: number;
  note: string;
}

function minSunElevationDeg(latitudeDeg: number): number {
  // Kış gündönümü öğle güneş yüksekliği
  return Math.max(7, 90 - Math.abs(latitudeDeg) - 23.45);
}

function layoutForOrientation(
  input: RoofLayoutInput,
  orientation: "portrait" | "landscape",
): RoofLayoutResult {
  const setback = input.setbackM ?? 0.3;
  const gap = input.panelGapM ?? 0.02;
  const mount: RoofMount = input.mount ?? "flush";
  const pl = input.panelLengthMm / 1000; // uzun kenar (m)
  const pw = input.panelWidthMm / 1000; // kısa kenar (m)

  // portrait: panel uzun kenarı derinlik (Y) boyunca
  // landscape: panel uzun kenarı genişlik (X) boyunca
  const cellW = orientation === "portrait" ? pw : pl; // X yönü panel boyu
  const cellH = orientation === "portrait" ? pl : pw; // Y yönü panel boyu

  const usableW = Math.max(0, input.roofWidthM - 2 * setback);
  const usableL = Math.max(0, input.roofLengthM - 2 * setback);

  const panelsPerRow = Math.floor(
    (usableW + gap) / (cellW + gap),
  );

  // Y yönünde sıra adımı
  let rowPitch: number;
  if (mount === "tilted") {
    const tilt = ((input.tiltDeg ?? 20) * Math.PI) / 180;
    const alpha =
      (minSunElevationDeg(input.latitudeDeg ?? 39) * Math.PI) / 180;
    rowPitch =
      cellH * Math.cos(tilt) +
      (cellH * Math.sin(tilt)) / Math.tan(alpha);
  } else {
    rowPitch = cellH + gap;
  }
  const rows =
    rowPitch > 0 ? Math.floor((usableL + gap) / rowPitch) : 0;

  let totalPanels = Math.max(0, panelsPerRow) * Math.max(0, rows);

  // Engeller: konum verilmediği için alan/yaklaşık panel düşümü
  const panelArea = pl * pw;
  let obstaclePanels = 0;
  for (const o of input.obstacles ?? []) {
    const area = o.widthM * o.depthM * (o.count ?? 1);
    obstaclePanels += Math.ceil(area / panelArea);
  }
  totalPanels = Math.max(0, totalPanels - obstaclePanels);

  const roofArea = input.roofWidthM * input.roofLengthM;
  const usedArea = totalPanels * panelArea;

  return {
    orientation,
    mount,
    panelsPerRow: Math.max(0, panelsPerRow),
    rows: Math.max(0, rows),
    totalPanels,
    estimatedKwp:
      Math.round(((totalPanels * input.panelPmaxW) / 1000) * 100) / 100,
    usedAreaM2: Math.round(usedArea * 10) / 10,
    roofAreaM2: Math.round(roofArea * 10) / 10,
    groundCoverageRatio:
      roofArea > 0 ? Math.round((usedArea / roofArea) * 100) / 100 : 0,
    rowPitchM: Math.round(rowPitch * 100) / 100,
    obstacleLossPanels: obstaclePanels,
    note:
      mount === "tilted"
        ? `Düz çatı/arazi: sıra arası ${rowPitch.toFixed(
            2,
          )} m (kış gündönümü gölgelemesiz, ${minSunElevationDeg(
            input.latitudeDeg ?? 39,
          ).toFixed(0)}° güneş)`
        : "Eğimli çatıya paralel montaj (sıra boşluğu yok)",
  };
}

/** En çok panel sığan yerleşimi döndürür (orientation "auto" ise karşılaştırır). */
export function computeRoofLayout(
  input: RoofLayoutInput,
): RoofLayoutResult {
  const want = input.orientation ?? "auto";
  if (want !== "auto") return layoutForOrientation(input, want);
  const p = layoutForOrientation(input, "portrait");
  const l = layoutForOrientation(input, "landscape");
  return l.totalPanels > p.totalPanels ? l : p;
}
