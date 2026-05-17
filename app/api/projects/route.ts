import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { feasibilityInputSchema } from "@/lib/validation";
import { runFeasibility } from "@/lib/simulation";

export const runtime = "nodejs";

/** Kullanıcının projelerini listele. */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json(
      { error: "Veritabanı erişilemiyor" },
      { status: 503 },
    );
  }
}

/** Proje oluştur + ilk simülasyonu kaydet. */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user)
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  const parsed = feasibilityInputSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Doğrulama hatası", issues: parsed.error.issues },
      { status: 422 },
    );

  try {
    const result = await runFeasibility(parsed.data);
    const project = await prisma.project.create({
      data: {
        userId,
        name: parsed.data.project.name,
        connectionType: parsed.data.project.connectionType,
        latitude: parsed.data.location.latitude,
        longitude: parsed.data.location.longitude,
        inputs: parsed.data as unknown as Prisma.InputJsonValue,
        simulations: {
          create: {
            annualKwh: result.energy.annualAcKwh,
            npv: result.finance.npv,
            irr: result.finance.irr ?? null,
            lcoe: result.finance.lcoe,
            paybackYrs: result.finance.simplePaybackYears ?? null,
            co2Tonnes: result.environment.lifetimeCo2TonnesAvoided,
            result: result as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: { simulations: true },
    });
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Kayıt başarısız", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
