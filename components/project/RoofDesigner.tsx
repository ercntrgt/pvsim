"use client";

import { useMemo, useState } from "react";
import {
  computeRoofLayout,
  type RoofMount,
  type PanelOrientation,
} from "@/lib/pv/roofLayout";

type PanelDims = { pmaxW: number; lengthMm: number; widthMm: number };

export default function RoofDesigner({
  panel,
  latitude,
  onApply,
}: {
  panel: PanelDims;
  latitude: number;
  onApply: (estimatedKwp: number) => void;
}) {
  const [roofWidthM, setW] = useState(12);
  const [roofLengthM, setL] = useState(8);
  const [mount, setMount] = useState<RoofMount>("flush");
  const [orientation, setOrientation] =
    useState<PanelOrientation>("auto");
  const [tiltDeg, setTilt] = useState(20);
  const [setbackM, setSetback] = useState(0.3);
  const [obs, setObs] = useState<
    { widthM: number; depthM: number; count: number }[]
  >([]);

  const layout = useMemo(
    () =>
      computeRoofLayout({
        roofWidthM,
        roofLengthM,
        panelLengthMm: panel.lengthMm,
        panelWidthMm: panel.widthMm,
        panelPmaxW: panel.pmaxW,
        orientation,
        mount,
        tiltDeg,
        latitudeDeg: latitude,
        setbackM,
        obstacles: obs,
      }),
    [
      roofWidthM,
      roofLengthM,
      panel,
      orientation,
      mount,
      tiltDeg,
      latitude,
      setbackM,
      obs,
    ],
  );

  // SVG ölçek
  const VW = 360;
  const scale = VW / Math.max(roofWidthM, 1);
  const VH = Math.max(60, roofLengthM * scale);
  const cellW =
    (layout.orientation === "portrait"
      ? panel.widthMm
      : panel.lengthMm) / 1000;
  const cellH =
    (layout.orientation === "portrait"
      ? panel.lengthMm
      : panel.widthMm) / 1000;
  const cells: { x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.panelsPerRow; c++) {
      cells.push({
        x: (setbackM + c * (cellW + 0.02)) * scale,
        y:
          (setbackM + r * (layout.rowPitchM || cellH + 0.02)) * scale,
        w: cellW * scale,
        h: cellH * scale,
      });
    }
  }

  const field = "rounded-lg border bg-card px-3 py-2 text-sm w-full";
  const lbl = "text-xs font-medium text-muted mb-1 block";

  return (
    <div className="space-y-3">
      <label className={lbl}>Çatı / arazi ölçüsü (m)</label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[11px] text-muted">Genişlik</span>
          <input
            type="number"
            className={field}
            value={roofWidthM}
            onChange={(e) => setW(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <span className="text-[11px] text-muted">Derinlik/uzunluk</span>
          <input
            type="number"
            className={field}
            value={roofLengthM}
            onChange={(e) => setL(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[11px] text-muted">Montaj</span>
          <select
            className={field}
            value={mount}
            onChange={(e) => setMount(e.target.value as RoofMount)}
          >
            <option value="flush">Eğimli çatıya paralel</option>
            <option value="tilted">Düz çatı / arazi (tilt ayaklı)</option>
          </select>
        </div>
        <div>
          <span className="text-[11px] text-muted">Yön</span>
          <select
            className={field}
            value={orientation}
            onChange={(e) =>
              setOrientation(e.target.value as PanelOrientation)
            }
          >
            <option value="auto">Otomatik (en çok panel)</option>
            <option value="portrait">Dikey (portrait)</option>
            <option value="landscape">Yatay (landscape)</option>
          </select>
        </div>
      </div>

      {mount === "tilted" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-muted">Tilt (°)</span>
            <input
              type="number"
              className={field}
              value={tiltDeg}
              onChange={(e) => setTilt(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <span className="text-[11px] text-muted">Kenar boşluğu (m)</span>
            <input
              type="number"
              step="0.1"
              className={field}
              value={setbackM}
              onChange={(e) => setSetback(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      )}

      {/* Engeller */}
      <div>
        <div className="flex items-center justify-between">
          <span className={lbl}>Engeller (baca, havalandırma)</span>
          <button
            type="button"
            onClick={() =>
              setObs((o) => [...o, { widthM: 1, depthM: 1, count: 1 }])
            }
            className="text-xs text-brand hover:underline"
          >
            + engel ekle
          </button>
        </div>
        {obs.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-1 text-[11px] text-muted">
            <span>Genişlik (m)</span>
            <span>Derinlik (m)</span>
            <span>Adet</span>
            <span />
          </div>
        )}
        {obs.map((o, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-1">
            <input
              type="number"
              step="0.1"
              className={field}
              value={o.widthM}
              onChange={(e) =>
                setObs((arr) =>
                  arr.map((x, j) =>
                    j === i ? { ...x, widthM: Number(e.target.value) } : x,
                  ),
                )
              }
              placeholder="ör. 1.5"
            />
            <input
              type="number"
              step="0.1"
              className={field}
              value={o.depthM}
              onChange={(e) =>
                setObs((arr) =>
                  arr.map((x, j) =>
                    j === i ? { ...x, depthM: Number(e.target.value) } : x,
                  ),
                )
              }
              placeholder="ör. 1.5"
            />
            <input
              type="number"
              className={field}
              value={o.count}
              onChange={(e) =>
                setObs((arr) =>
                  arr.map((x, j) =>
                    j === i ? { ...x, count: Number(e.target.value) } : x,
                  ),
                )
              }
              placeholder="adet"
            />
            <button
              type="button"
              onClick={() =>
                setObs((arr) => arr.filter((_, j) => j !== i))
              }
              className="text-xs text-red-600"
            >
              sil
            </button>
          </div>
        ))}
      </div>

      {/* SVG önizleme */}
      <div className="rounded-xl border bg-card p-3 overflow-auto">
        <svg
          width={VW}
          height={VH}
          viewBox={`0 0 ${VW} ${VH}`}
          className="max-w-full"
        >
          <rect
            x={0}
            y={0}
            width={VW}
            height={VH}
            fill="#eef5f1"
            stroke="#1B4332"
          />
          {cells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={Math.max(1, c.w - 1)}
              height={Math.max(1, c.h - 1)}
              fill="#0B6E4F"
              opacity={0.85}
            />
          ))}
        </svg>
      </div>

      <div className="rounded-xl bg-brand/5 p-3 text-sm space-y-1">
        <div>
          <b className="num text-brand-dark">{layout.totalPanels}</b>{" "}
          panel · {layout.panelsPerRow} panel × {layout.rows} sıra ·{" "}
          <b className="num">{layout.estimatedKwp} kWp</b>
        </div>
        <div className="text-xs text-muted">
          Yön: {layout.orientation} · Kaplama %
          {(layout.groundCoverageRatio * 100).toFixed(0)} ·{" "}
          {layout.note}
          {layout.obstacleLossPanels > 0 &&
            ` · engel kaybı ${layout.obstacleLossPanels} panel`}
        </div>
      </div>

      <details className="rounded-xl border bg-card p-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-brand-dark">
          Hesap nasıl yapılıyor? (panel ölçüleri)
        </summary>
        <div className="mt-2 space-y-1 leading-relaxed">
          <p>
            Seçili panel:{" "}
            <b className="text-brand-dark">
              {(panel.lengthMm / 1000).toFixed(3)} m ×{" "}
              {(panel.widthMm / 1000).toFixed(3)} m
            </b>{" "}
            ({panel.pmaxW} Wp · {((panel.lengthMm * panel.widthMm) /
              1_000_000).toFixed(2)}{" "}
            m²/panel).
          </p>
          <p>
            <b>1.</b> Kullanılabilir alan = çatı ölçüsü − her kenardan{" "}
            {setbackM} m boşluk.
          </p>
          <p>
            <b>2.</b> Panel yönüne göre hücre boyutu: <i>dikey</i>’de
            genişlik = panel kısa kenarı, <i>yatay</i>’da panel uzun
            kenarı. Bir sıraya{" "}
            <b className="text-brand-dark">{layout.panelsPerRow}</b> panel
            sığıyor (panel + 2 cm montaj boşluğu).
          </p>
          <p>
            <b>3.</b> Sıra adımı:{" "}
            {mount === "tilted"
              ? `tilt ayaklı → D = h·cosβ + h·sinβ/tanα = ${layout.rowPitchM} m (kış gündönümü gölgelemesiz). ${layout.rows} sıra sığıyor.`
              : `eğimli çatıya paralel → boşluksuz, ${layout.rows} sıra.`}
          </p>
          <p>
            <b>4.</b> Toplam = {layout.panelsPerRow} ×{" "}
            {layout.rows}
            {layout.obstacleLossPanels > 0
              ? ` − ${layout.obstacleLossPanels} (engel alanı / panel alanı)`
              : ""}{" "}
            = <b className="text-brand-dark">{layout.totalPanels} panel</b> →{" "}
            {layout.totalPanels} × {panel.pmaxW} Wp ={" "}
            <b className="text-brand-dark">{layout.estimatedKwp} kWp</b>.
          </p>
          <p>
            <b>auto</b> yönünde dikey/yatay ayrı hesaplanır, en çok panel
            sığan seçilir. Engeller bilinen konumsuz olduğundan toplam alan
            / panel alanı kadar panel düşülür (yaklaşık).
          </p>
        </div>
      </details>

      <button
        type="button"
        onClick={() => onApply(layout.estimatedKwp)}
        disabled={layout.estimatedKwp <= 0}
        className="w-full rounded-xl bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        Bu yerleşimi kullan ({layout.estimatedKwp} kWp)
      </button>
    </div>
  );
}
