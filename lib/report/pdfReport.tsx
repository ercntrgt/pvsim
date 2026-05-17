/**
 * Banka uyumlu PDF fizibilite raporu (@react-pdf/renderer).
 *
 * pvsim-prompt.md § Rapor bölümlerini izler: yönetici özeti, proje künyesi,
 * konum/solar, sistem, enerji, tüketim, finans (25y nakit akışı), duyarlılık,
 * çevre, mevzuat, sonuç.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { FeasibilityResult } from "../simulation";

const BRAND = "#0B6E4F";
const DARK = "#1B4332";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: "#14241d", fontFamily: "Helvetica" },
  h1: { fontSize: 18, color: DARK, fontFamily: "Helvetica-Bold" },
  h2: {
    fontSize: 12,
    color: BRAND,
    marginTop: 16,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
    borderBottom: `1 solid ${BRAND}`,
    paddingBottom: 3,
  },
  sub: { color: "#5b6f66", fontSize: 9 },
  row: { flexDirection: "row" },
  kpiBox: {
    flex: 1,
    margin: 3,
    padding: 8,
    backgroundColor: "#f0f7f3",
    borderRadius: 4,
  },
  kpiLabel: { fontSize: 7, color: "#5b6f66" },
  kpiVal: { fontSize: 13, color: DARK, fontFamily: "Helvetica-Bold" },
  th: {
    flexDirection: "row",
    backgroundColor: DARK,
    color: "white",
    fontFamily: "Helvetica-Bold",
  },
  td: { flexDirection: "row", borderBottom: "0.5 solid #e2ece7" },
  cell: { padding: 3, fontSize: 7.5 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#9aa8a1",
    textAlign: "center",
  },
});

const fmt = (n: number, d = 0) =>
  n.toLocaleString("tr-TR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpiBox}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiVal}>{value}</Text>
    </View>
  );
}

function Cell({
  children,
  w,
  header,
}: {
  children: React.ReactNode;
  w: string;
  header?: boolean;
}) {
  return (
    <Text style={[s.cell, { width: w }, header ? { color: "white" } : {}]}>
      {children}
    </Text>
  );
}

export function FeasibilityReport({ r }: { r: FeasibilityResult }) {
  const f = r.finance;
  const months = [
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
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Güneş Enerjisi Fizibilite Raporu</Text>
        <Text style={s.sub}>
          {r.system.dcKwp} kWp · {r.system.panel.brand}{" "}
          {r.system.panel.model} · {r.meta.generatedAt.slice(0, 10)} ·
          PVSim / yesilsertifika.tech
        </Text>

        <Text style={s.h2}>1. Yönetici Özeti</Text>
        <View style={s.row}>
          <KPI
            label="Yıllık Üretim"
            value={`${fmt(r.energy.annualAcKwh)} kWh`}
          />
          <KPI label="PR" value={r.energy.performanceRatio.toFixed(2)} />
          <KPI
            label="Spesifik Üretim"
            value={`${fmt(r.energy.specificYield)} kWh/kWp`}
          />
        </View>
        <View style={s.row}>
          <KPI label="NPV" value={`${fmt(f.npv)} ₺`} />
          <KPI
            label="IRR"
            value={f.irr != null ? `%${(f.irr * 100).toFixed(1)}` : "—"}
          />
          <KPI label="LCOE" value={`${f.lcoe.toFixed(2)} ₺/kWh`} />
        </View>
        <View style={s.row}>
          <KPI
            label="Basit Geri Ödeme"
            value={
              f.simplePaybackYears != null
                ? `${f.simplePaybackYears.toFixed(1)} yıl`
                : "—"
            }
          />
          <KPI label="CapEx" value={`${fmt(f.capex)} ₺`} />
          <KPI
            label="Önlenen CO₂ (25y)"
            value={`${fmt(r.environment.lifetimeCo2TonnesAvoided, 1)} t`}
          />
        </View>

        <Text style={s.h2}>2. Proje & Konum</Text>
        <Text>
          Bağlantı tipi: {r.system.mountType} · Eğim {r.system.tilt}° /
          Azimut {r.system.azimuth}° · DC {r.system.dcKwp} kWp / AC{" "}
          {r.system.acKw} kW (DC/AC{" "}
          {(r.system.dcKwp / r.system.acKw).toFixed(2)})
        </Text>
        <Text style={s.sub}>
          Solar veri kaynağı: {r.meta.solarSource} · Yıllık GHI{" "}
          {fmt(r.energy.annualGhiKwhM2)} kWh/m² · POA{" "}
          {fmt(r.energy.annualPoaKwhM2)} kWh/m² · Ort. hücre sıc.{" "}
          {r.energy.avgCellTempC}°C
        </Text>

        <Text style={s.h2}>3. Sistem</Text>
        <Text>
          {r.system.sizing.recommendation}
        </Text>

        <Text style={s.h2}>4. Aylık Enerji Üretimi (kWh)</Text>
        <View style={s.th}>
          {months.map((m) => (
            <Cell key={m} w="8.33%" header>
              {m}
            </Cell>
          ))}
        </View>
        <View style={s.td}>
          {r.energy.monthlyAcKwh.map((v, i) => (
            <Cell key={i} w="8.33%">
              {fmt(v)}
            </Cell>
          ))}
        </View>

        <Text style={s.h2}>5. Tüketim & Öz Tüketim</Text>
        <Text>
          Tüketim {fmt(r.consumption.totalConsumption)} kWh · Öz tüketim
          oranı %{(r.consumption.selfConsumptionRate * 100).toFixed(0)} ·
          Öz yeterlilik %
          {(r.consumption.selfSufficiency * 100).toFixed(0)} · Şebekeye
          verilen {fmt(r.consumption.exported)} kWh · Harmanlanmış değer{" "}
          {f.blendedValuePerKwh.toFixed(3)} ₺/kWh
        </Text>

        <Text style={s.footer}>
          PVSim · {r.meta.disclaimer}
        </Text>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>6. 25 Yıllık Nakit Akışı (₺)</Text>
        <View style={s.th}>
          <Cell w="8%" header>
            Yıl
          </Cell>
          <Cell w="14%" header>
            Enerji kWh
          </Cell>
          <Cell w="16%" header>
            Gelir
          </Cell>
          <Cell w="14%" header>
            OpEx
          </Cell>
          <Cell w="16%" header>
            Net
          </Cell>
          <Cell w="16%" header>
            Kümülatif
          </Cell>
          <Cell w="16%" header>
            İsk. Kümülatif
          </Cell>
        </View>
        {f.schedule
          .filter((_, i) => i < 25)
          .map((y) => (
            <View style={s.td} key={y.year}>
              <Cell w="8%">{y.year}</Cell>
              <Cell w="14%">{fmt(y.energyKwh)}</Cell>
              <Cell w="16%">{fmt(y.revenue)}</Cell>
              <Cell w="14%">{fmt(y.opex)}</Cell>
              <Cell w="16%">{fmt(y.netCashFlow)}</Cell>
              <Cell w="16%">{fmt(y.cumulativeCashFlow)}</Cell>
              <Cell w="16%">{fmt(y.cumulativeDiscountedCashFlow)}</Cell>
            </View>
          ))}

        <Text style={s.h2}>7. Duyarlılık (Tornado, NPV ±%20)</Text>
        {f.sensitivity.map((t) => (
          <Text key={t.variable} style={{ marginBottom: 2 }}>
            {t.label}: {fmt(t.lowNpv)} ₺ ↔ {fmt(t.highNpv)} ₺ (etki{" "}
            {fmt(t.swing)} ₺)
          </Text>
        ))}

        <Text style={s.h2}>8. Çevresel Etki</Text>
        <Text>
          Yıllık önlenen CO₂ {fmt(r.environment.annualCo2TonnesAvoided, 1)}{" "}
          ton · 25 yıl {fmt(r.environment.lifetimeCo2TonnesAvoided, 1)} ton ·
          Eşdeğer {fmt(r.environment.equivalentTreesPerYear)} ağaç/yıl ·{" "}
          {fmt(r.environment.equivalentCarKmPerYear)} oto-km/yıl
        </Text>

        <Text style={s.h2}>9. Mevzuat Uyumu</Text>
        {r.regulation.epdk.messages.map((m, i) => (
          <Text key={i}>• {m}</Text>
        ))}
        {r.regulation.epdk.warnings.map((m, i) => (
          <Text key={`w${i}`} style={{ color: "#b45309" }}>
            ⚠ {m}
          </Text>
        ))}
        <Text style={s.sub}>YEKDEM: {r.regulation.yekdem.note}</Text>

        <Text style={s.footer}>
          PVSim · {r.meta.disclaimer}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderFeasibilityPdf(
  r: FeasibilityResult,
): Promise<Buffer> {
  return renderToBuffer(<FeasibilityReport r={r} />);
}
