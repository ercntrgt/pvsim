"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Opt = { id: string; label: string };

const MONTHS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const tl = (n: number, d = 0) =>
  n?.toLocaleString("tr-TR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }) ?? "—";

export default function SimulateClient({
  panels,
  inverters,
}: {
  panels: Opt[];
  inverters: Opt[];
}) {
  const [form, setForm] = useState({
    name: "Yeni GES Projesi",
    connectionType: "ticari_cati",
    latitude: 39.93,
    longitude: 32.85,
    panelId: panels[0]?.id ?? "",
    inverterId:
      inverters.find((i) => i.label.includes("10.0"))?.id ??
      inverters[0]?.id ??
      "",
    targetKwp: 10,
    sector: "ofis",
    annualKwh: 18000,
    tariffCategory: "ticarethane",
    capexPerKwp: 21000,
    discountRate: 18,
    tariffEscalation: 25,
    preferEmbedded: true,
  });
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const set = (k: string, v: string | number | boolean) =>
    setForm((s) => ({ ...s, [k]: v }));

  function buildInput() {
    return {
      project: { name: form.name, connectionType: form.connectionType },
      location: {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        timezoneOffsetHours: 3,
        preferEmbedded: form.preferEmbedded,
      },
      system: {
        panelId: form.panelId,
        inverterId: form.inverterId,
        targetKwp: Number(form.targetKwp),
        tilt: "auto",
      },
      consumption: {
        method: "synthetic",
        annualKwh: Number(form.annualKwh),
        sector: form.sector,
      },
      tariff: { category: form.tariffCategory },
      finance: {
        capexPerKwp: Number(form.capexPerKwp),
        discountRate: Number(form.discountRate) / 100,
        tariffEscalation: Number(form.tariffEscalation) / 100,
        opexEscalation: Number(form.tariffEscalation) / 100,
      },
    };
  }

  async function run() {
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput()),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Hata");
      setRes(j.result);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const r = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildInput() }),
      });
      if (!r.ok) throw new Error("PDF üretilemedi");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pvsim-rapor.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPdfLoading(false);
    }
  }

  const field = "rounded-lg border bg-card px-3 py-2 text-sm w-full";
  const lbl = "text-xs font-medium text-muted mb-1 block";

  return (
    <div className="mt-6 grid lg:grid-cols-[340px_1fr] gap-6">
      {/* Form */}
      <div className="rounded-2xl border bg-card p-5 space-y-3 h-fit">
        <div>
          <label className={lbl}>Proje Adı</label>
          <input
            className={field}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div>
          <label className={lbl}>Bağlantı Tipi</label>
          <select
            className={field}
            value={form.connectionType}
            onChange={(e) => set("connectionType", e.target.value)}
          >
            <option value="mesken_cati">Mesken Çatı</option>
            <option value="ticari_cati">Ticari Çatı</option>
            <option value="arazi">Arazi GES</option>
            <option value="tarimsal">Tarımsal</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Enlem</label>
            <input
              type="number"
              step="0.01"
              className={field}
              value={form.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>Boylam</label>
            <input
              type="number"
              step="0.01"
              className={field}
              value={form.longitude}
              onChange={(e) => set("longitude", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={lbl}>Panel</label>
          <select
            className={field}
            value={form.panelId}
            onChange={(e) => set("panelId", e.target.value)}
          >
            {panels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Inverter</label>
          <select
            className={field}
            value={form.inverterId}
            onChange={(e) => set("inverterId", e.target.value)}
          >
            {inverters.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Hedef Güç (kWp)</label>
            <input
              type="number"
              className={field}
              value={form.targetKwp}
              onChange={(e) => set("targetKwp", e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>Yıllık Tüketim (kWh)</label>
            <input
              type="number"
              className={field}
              value={form.annualKwh}
              onChange={(e) => set("annualKwh", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Sektör</label>
            <select
              className={field}
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
            >
              {[
                "mesken",
                "ofis",
                "fabrika",
                "avm",
                "otel",
                "okul",
                "hastane",
                "tarimsal",
              ].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Tarife</label>
            <select
              className={field}
              value={form.tariffCategory}
              onChange={(e) => set("tariffCategory", e.target.value)}
            >
              {["mesken", "ticarethane", "sanayi", "tarimsal"].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={lbl}>CapEx ₺/kWp</label>
            <input
              type="number"
              className={field}
              value={form.capexPerKwp}
              onChange={(e) => set("capexPerKwp", e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>İskonto %</label>
            <input
              type="number"
              className={field}
              value={form.discountRate}
              onChange={(e) => set("discountRate", e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>Tarife Artış %</label>
            <input
              type="number"
              className={field}
              value={form.tariffEscalation}
              onChange={(e) => set("tariffEscalation", e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={form.preferEmbedded}
            onChange={(e) => set("preferEmbedded", e.target.checked)}
          />
          Gömülü TR iklim verisi kullan (PVGIS yerine, hızlı/offline)
        </label>
        <button
          onClick={run}
          disabled={loading}
          className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Hesaplanıyor…" : "Hesapla"}
        </button>
        {err && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
            {err}
          </p>
        )}
      </div>

      {/* Sonuçlar */}
      <div className="space-y-5">
        {!res && !loading && (
          <div className="rounded-2xl border bg-card p-10 text-center text-muted">
            Sonuçlar burada görünecek. Girdileri doldurup{" "}
            <b>Hesapla</b>’ya basın.
          </div>
        )}
        {res && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                [
                  "Yıllık Üretim",
                  `${tl(res.energy.annualAcKwh)} kWh`,
                ],
                ["PR", res.energy.performanceRatio.toFixed(2)],
                [
                  "Spesifik Üretim",
                  `${tl(res.energy.specificYield)} kWh/kWp`,
                ],
                ["NPV", `${tl(res.finance.npv)} ₺`],
                [
                  "IRR",
                  res.finance.irr != null
                    ? `%${(res.finance.irr * 100).toFixed(1)}`
                    : "—",
                ],
                ["LCOE", `${res.finance.lcoe.toFixed(2)} ₺/kWh`],
                [
                  "Geri Ödeme",
                  res.finance.simplePaybackYears != null
                    ? `${res.finance.simplePaybackYears.toFixed(1)} yıl`
                    : "—",
                ],
                [
                  "CO₂ (25y)",
                  `${tl(res.environment.lifetimeCo2TonnesAvoided, 1)} t`,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-2xl border bg-card p-4"
                >
                  <div className="text-xs text-muted">{k}</div>
                  <div className="num text-xl font-semibold text-brand-dark">
                    {v}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-brand-dark mb-3">
                Aylık Üretim (kWh)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={res.energy.monthlyAcKwh.map(
                    (v: number, i: number) => ({
                      ay: MONTHS[i],
                      kWh: Math.round(v),
                    }),
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" />
                  <XAxis dataKey="ay" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="kWh" fill="#0B6E4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-brand-dark mb-3">
                Kümülatif İskontolu Nakit Akışı (₺)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={res.finance.schedule.map(
                    (y: {
                      year: number;
                      cumulativeDiscountedCashFlow: number;
                    }) => ({
                      yil: y.year,
                      kümülatif: Math.round(
                        y.cumulativeDiscountedCashFlow - res.finance.capex,
                      ),
                    }),
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2ece7" />
                  <XAxis dataKey="yil" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="kümülatif"
                    stroke="#FFB627"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border bg-card p-5 text-sm">
              <h3 className="font-semibold text-brand-dark mb-2">
                Mevzuat & Kaynak
              </h3>
              <p className="text-muted">
                Solar veri: {res.meta.solarSource}
                {res.meta.solarNote ? ` — ${res.meta.solarNote}` : ""}
              </p>
              {res.regulation.epdk.messages.map(
                (m: string, i: number) => (
                  <p key={i}>• {m}</p>
                ),
              )}
              {res.regulation.epdk.warnings.map(
                (m: string, i: number) => (
                  <p key={`w${i}`} className="text-amber-700">
                    ⚠ {m}
                  </p>
                ),
              )}
            </div>

            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="rounded-2xl bg-brand-dark px-5 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pdfLoading ? "PDF hazırlanıyor…" : "PDF Rapor İndir"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
