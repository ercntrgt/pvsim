import { NextRequest, NextResponse } from "next/server";
import { feasibilityInputSchema } from "@/lib/validation";
import { runFeasibility } from "@/lib/simulation";
import { renderFeasibilityPdf } from "@/lib/report/pdfReport";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { input: FeasibilityInput }  → PDF (application/pdf)
 * Raporu deterministik tutmak için sonuç sunucuda yeniden hesaplanır.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
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
    const result = await runFeasibility(parsed.data);
    const pdf = await renderFeasibilityPdf(result);
    const name = `pvsim-${result.system.dcKwp}kWp-${result.meta.generatedAt.slice(0, 10)}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "PDF üretilemedi", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
