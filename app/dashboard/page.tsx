import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getProjects(userId: string) {
  try {
    return await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        simulations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  } catch {
    return null; // DB erişilemiyor (lokal/geçici)
  }
}

export default async function DashboardPage() {
  const session = await auth().catch(() => null);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-dark">Projelerim</h1>
        <p className="mt-2 text-muted">
          Projelerinizi kaydetmek için giriş yapın.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl bg-brand px-5 py-3 font-semibold text-white"
          >
            Giriş Yap
          </Link>
          <Link
            href="/simulate"
            className="rounded-2xl border px-5 py-3 font-semibold text-brand-dark"
          >
            Kayıtsız Hızlı Analiz
          </Link>
        </div>
      </div>
    );
  }

  const userId = (session.user as { id: string }).id;
  const projects = await getProjects(userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-dark">Projelerim</h1>
        <Link
          href="/simulate"
          className="rounded-2xl bg-brand px-4 py-2 font-semibold text-white"
        >
          + Yeni Analiz
        </Link>
      </div>

      {projects === null && (
        <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Veritabanına şu an erişilemiyor. Hızlı analiz ve PDF rapor
          özellikleri DB olmadan da çalışır.
        </p>
      )}

      {projects && projects.length === 0 && (
        <p className="mt-8 text-muted">
          Henüz proje yok. <Link href="/simulate" className="text-brand">
            İlk analizinizi
          </Link>{" "}
          oluşturun.
        </p>
      )}

      {projects && projects.length > 0 && (
        <div className="mt-6 grid gap-3">
          {projects.map((p) => {
            const sim = p.simulations[0];
            return (
              <div
                key={p.id}
                className="rounded-2xl border bg-card p-5 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-brand-dark">
                    {p.name}
                  </div>
                  <div className="text-xs text-muted">
                    {p.connectionType} · {p.latitude.toFixed(2)},{" "}
                    {p.longitude.toFixed(2)}
                  </div>
                </div>
                {sim && (
                  <div className="text-right text-sm num">
                    <div className="text-brand-dark font-semibold">
                      {Math.round(sim.annualKwh).toLocaleString("tr-TR")}{" "}
                      kWh/yıl
                    </div>
                    <div className="text-muted">
                      NPV {Math.round(sim.npv).toLocaleString("tr-TR")} ₺
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
