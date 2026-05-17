import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { feasibilityInputSchema } from "@/lib/validation";
import { runFeasibility } from "@/lib/simulation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { input } → Excel (.xlsx). Veri analistleri için tablolar:
 * Özet, Aylık Enerji, 25y Nakit Akışı, Aylık Mahsuplaşma, Duyarlılık,
 * Sistem & Sınır Kontrolleri.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = feasibilityInputSchema.safeParse(
    (body as { input?: unknown })?.input ?? body,
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const r = await runFeasibility(parsed.data);
    const wb = XLSX.utils.book_new();

    const ozet = [
      ["PVSim Fizibilite Özeti"],
      ["Proje", r.project.name],
      ["Bağlantı", r.project.connectionType],
      ["DC kWp", r.system.dcKwp],
      ["AC kW", r.system.acKw],
      ["Panel", `${r.system.panel.brand} ${r.system.panel.model}`],
      ["Panel sayısı", r.system.sizing.panelCount],
      ["Yıllık üretim (kWh)", r.energy.annualAcKwh],
      ["PR", r.energy.performanceRatio],
      ["Spesifik üretim (kWh/kWp)", r.energy.specificYield],
      ["CapEx (₺)", r.finance.capex],
      ["NPV (₺)", r.finance.npv],
      ["IRR", r.finance.irr],
      ["Özkaynak IRR", r.finance.equityIrr],
      ["LCOE (₺/kWh)", r.finance.lcoe],
      ["Basit geri ödeme (yıl)", r.finance.simplePaybackYears],
      ["İskontolu geri ödeme (yıl)", r.finance.discountedPaybackYears],
      ["Min DSCR", r.finance.minDscr],
      ["25y önlenen CO₂ (ton)", r.environment.lifetimeCo2TonnesAvoided],
      ["Solar kaynak", r.meta.solarSource],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(ozet),
      "Özet",
    );

    const aylik = [
      ["Ay", "Üretim (kWh)"],
      ...r.energy.monthlyAcKwh.map((v, i) => [i + 1, Math.round(v)]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(aylik),
      "Aylık Enerji",
    );

    const cf = [
      [
        "Yıl",
        "Enerji kWh",
        "Gelir",
        "OpEx",
        "Tek seferlik",
        "Kredi",
        "Net",
        "Kümülatif",
        "İsk. Kümülatif",
      ],
      ...r.finance.schedule.map((y) => [
        y.year,
        y.energyKwh,
        y.revenue,
        y.opex,
        y.oneOff,
        y.loanPayment,
        y.netCashFlow,
        y.cumulativeCashFlow,
        y.cumulativeDiscountedCashFlow,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(cf),
      "Nakit Akışı 25y",
    );

    const nm = [
      [
        "Ay",
        "Öz tüketim kWh",
        "İhracat kWh",
        "İthalat kWh",
        "Öz tük. ₺",
        "Mahsup ₺",
        "Fazla satış ₺",
        "Toplam ₺",
      ],
      ...r.consumption.netMetering.monthly.map((m) => [
        m.month,
        m.selfConsumed,
        m.exported,
        m.imported,
        m.selfConsumedValue,
        m.offsetValue,
        m.surplusValue,
        m.totalValue,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(nm),
      "Mahsuplaşma",
    );

    const sens = [
      ["Değişken", "Düşük NPV", "Baz NPV", "Yüksek NPV", "Etki"],
      ...r.finance.sensitivity.map((t) => [
        t.label,
        t.lowNpv,
        t.baseNpv,
        t.highNpv,
        t.swing,
      ]),
      [],
      ["Senaryo", "25y nominal ₺"],
      ["GES (özkaynak)", r.finance.scenarioVsDeposit.pvInvestmentTerminal],
      [
        `Banka mevduatı (%${(r.finance.depositRate * 100).toFixed(0)})`,
        r.finance.scenarioVsDeposit.bankDepositTerminal,
      ],
      [
        "GES avantajı (mevduata göre)",
        r.finance.scenarioVsDeposit.advantageOverDeposit,
      ],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sens),
      "Duyarlılık & Senaryo",
    );

    const sys = [
      ["Sistem & Sınır Kontrolleri"],
      ["Panel/string", r.system.sizing.panelsPerString],
      ["String sayısı", r.system.sizing.stringCount],
      ["Inverter", `${r.system.inverterCount} × ${r.system.inverter.model}`],
      ["DC/AC", r.system.sizing.dcAcRatio],
      ["String Voc soğuk (V)", r.system.sizing.stringVocColdV],
      ["Tahmini alan (m²)", r.system.sizing.estimatedAreaM2],
      [],
      ["Kontrol", "Durum", "Detay"],
      ...r.system.sizing.checks.map((c) => [
        c.label,
        c.ok ? "OK" : "UYARI",
        c.detail,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(sys),
      "Sistem",
    );

    const buf = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    const name = `pvsim-${r.system.dcKwp}kWp-${r.meta.generatedAt.slice(
      0,
      10,
    )}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Excel üretilemedi", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
