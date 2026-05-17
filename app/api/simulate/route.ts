import { NextRequest, NextResponse } from "next/server";
import { feasibilityInputSchema } from "@/lib/validation";
import { runFeasibility } from "@/lib/simulation";
import { rateLimit } from "@/lib/rateLimit";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Kimlik / IP anahtarı ile rate limit (PVGIS hassas)
  const session = await auth().catch(() => null);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  const key =
    (session?.user as { id?: string } | undefined)?.id ?? `ip:${ip}`;
  const rl = rateLimit(key);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Saatlik simülasyon limiti aşıldı. Lütfen sonra deneyin." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz JSON gövdesi" },
      { status: 400 },
    );
  }

  const parsed = feasibilityInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const started = Date.now();
    const result = await runFeasibility(parsed.data);
    return NextResponse.json(
      { ok: true, ms: Date.now() - started, result },
      { headers: { "X-RateLimit-Remaining": String(rl.remaining) } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Simülasyon hatası", detail: (e as Error).message },
      { status: 500 },
    );
  }
}
