import Link from "next/link";

const features = [
  {
    title: "Doğru Üretim Modeli",
    body: "PVGIS saatlik TMY verisi, Hay-Davies POA transpozisyonu, Sandia sıcaklık ve PVWatts modeli ile 8760 saatlik simülasyon. Türkiye için doğrulanmış (Ankara 10 kWp, Antalya 1 MW).",
  },
  {
    title: "Banka Uyumlu Finans",
    body: "25 yıllık nakit akışı, NPV / IRR / LCOE / geri ödeme, kredi amortismanı ve DSCR, tornado duyarlılık ve Monte Carlo.",
  },
  {
    title: "Türkiye Mevzuatı",
    body: "EPDK lisanssız üretim (≤5 MW), aylık mahsuplaşma, YEKDEM değerlendirmesi ve güncel TR tarifeleri.",
  },
  {
    title: "Profesyonel Rapor",
    body: "Yönetici özeti, enerji tabloları, finansal analiz ve çevresel etki içeren tek tıkla PDF fizibilite raporu.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-dark to-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-brand-soft font-medium mb-3">
            yesilsertifika.tech · Güneş Enerjisi Fizibilite Platformu
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
            GES yatırımınızı dakikalar içinde{" "}
            <span className="text-accent-sun">bankaya hazır</span> raporla
            değerlendirin
          </h1>
          <p className="mt-5 max-w-2xl text-white/85">
            Konum, çatı/arazi, panel-inverter, tüketim ve tarife girin; yıllık
            üretim, finansal getiri ve CO₂ tasarrufunu hesaplayıp PDF rapor
            üretin.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/simulate"
              className="rounded-2xl bg-accent-sun px-6 py-3 font-semibold text-brand-dark hover:brightness-95"
            >
              Hızlı Analiz Başlat
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-white/30 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Giriş / Kayıt
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <h3 className="font-semibold text-brand-dark">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-2xl bg-brand-dark px-8 py-10 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">
              Doğrulanmış hesap motoru, ücretsiz veri kaynakları
            </h2>
            <p className="mt-2 text-white/80 text-sm">
              PVGIS + NASA POWER + gömülü TR iklim verisi · 36 panel · 22
              inverter kütüphanesi
            </p>
          </div>
          <Link
            href="/simulate"
            className="self-start rounded-2xl bg-accent-sun px-6 py-3 font-semibold text-brand-dark hover:brightness-95"
          >
            Ücretsiz Dene
          </Link>
        </div>
      </section>
    </div>
  );
}
