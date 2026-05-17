"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  SunMedium,
  TrendingUp,
  Leaf,
  FileText,
  MapPin,
  LayoutGrid,
  Banknote,
  ShieldCheck,
  ArrowRight,
  Zap,
} from "lucide-react";

/* ---- mock veriler (tanıtım amaçlı, gerçek motor /simulate'te) ---- */
const CASH = [
  -218, -172, -121, -64, -1, 69, 146, 230, 322, 423, 534, 655, 788,
  933, 1092, 1265, 1454, 1660, 1885, 2131, 2399, 2691, 3010, 3357,
  3735, 4147,
].map((v, y) => ({ yil: y, kümülatif: v }));

const STATS = [
  { icon: Zap, label: "Sistem Kapasitesi", value: "10.4", unit: "kWp" },
  { icon: Banknote, label: "Kurulum Maliyeti", value: "₺218.000", unit: "" },
  { icon: TrendingUp, label: "Amortisman", value: "4.8", unit: "yıl" },
  {
    icon: Leaf,
    label: "Yıllık CO₂ Tasarrufu",
    value: "6.8 t",
    unit: "≈ 310 ağaç",
  },
];

const FEATURES = [
  {
    icon: SunMedium,
    title: "Doğru Üretim Modeli",
    body: "PVGIS saatlik TMY · Hay-Davies POA · Sandia sıcaklık · PVWatts 8760 saat. Ankara/Antalya için doğrulandı.",
  },
  {
    icon: TrendingUp,
    title: "Banka Uyumlu Finans",
    body: "25 yıl nakit akışı, NPV/IRR/LCOE, kredi amortismanı + DSCR, tornado duyarlılık, GES vs mevduat.",
  },
  {
    icon: MapPin,
    title: "Harita ile Konum",
    body: "Leaflet haritada tıkla-seç, adres ara; gerçek PVGIS ışınım verisi otomatik çekilir.",
  },
  {
    icon: LayoutGrid,
    title: "Çatı Yerleşimi",
    body: "Panel ölçülerinden otomatik dizilim: portrait/landscape, sıra arası, engeller, görsel önizleme.",
  },
  {
    icon: ShieldCheck,
    title: "Türkiye Mevzuatı",
    body: "EPDK lisanssız ≤5 MW, aylık mahsuplaşma, YEKDEM ve güncel TR tarifeleri.",
  },
  {
    icon: FileText,
    title: "PDF & Excel Rapor",
    body: "Banka uyumlu Türkçe PDF + analist Excel: özet, nakit akışı, mahsuplaşma, duyarlılık.",
  },
];

const STEPS = [
  ["Konum", "Haritadan noktayı seç"],
  ["Sistem", "Panel/inverter + çatı ölçüsü"],
  ["Tüketim & Tarife", "Profil ve TR tarife"],
  ["Rapor", "Saniyeler içinde PDF/Excel"],
];

const fade: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: "easeOut" as const,
    },
  }),
};

export default function Landing() {
  return (
    <div
      className="min-h-screen bg-[#070d0a] text-zinc-100"
      style={{ backgroundColor: "#070d0a", color: "#f4f4f5" }}
    >
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute top-10 right-0 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={fade}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              yesilsertifika.tech · Güneş Enerjisi Fizibilite
            </motion.div>
            <motion.h1
              initial="hidden"
              animate="show"
              custom={1}
              variants={fade}
              className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]"
            >
              GES yatırımını{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                bankaya hazır
              </span>{" "}
              raporla değerlendir
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="show"
              custom={2}
              variants={fade}
              className="mt-5 max-w-xl text-zinc-400 text-lg"
            >
              Konum, çatı ve panel seç; yıllık üretim, finansal getiri ve
              CO₂ tasarrufu saniyeler içinde — doğrulanmış mühendislik
              motoru, ücretsiz veri kaynakları.
            </motion.p>
            <motion.div
              initial="hidden"
              animate="show"
              custom={3}
              variants={fade}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href="/simulate"
                className="group inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-[#04130c] hover:bg-emerald-400 transition"
              >
                Hızlı Analiz Başlat
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-200 hover:border-emerald-500/60 hover:text-emerald-300 transition"
              >
                Giriş / Kayıt
              </Link>
            </motion.div>
            <motion.div
              initial="hidden"
              animate="show"
              custom={4}
              variants={fade}
              className="mt-8 flex items-center gap-3 text-xs text-zinc-500"
            >
              <Image
                src="/logo.png"
                alt="Yörünge"
                width={26}
                height={26}
                className="h-6 w-6 object-contain bg-white rounded p-0.5"
              />
              Yörünge Kurumsal Danışmanlık & Eğitim
            </motion.div>
          </div>

          {/* Animasyonlu mock dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="rounded-3xl border border-emerald-500/20 bg-[#0c1712]/80 p-5 backdrop-blur shadow-2xl shadow-emerald-900/30"
          >
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((st, i) => (
                <motion.div
                  key={st.label}
                  initial="hidden"
                  animate="show"
                  custom={i + 2}
                  variants={fade}
                  className="rounded-2xl bg-[#0f1f17] border border-zinc-800 p-4"
                >
                  <st.icon className="h-5 w-5 text-emerald-400" />
                  <div className="mt-2 text-xs text-zinc-500">
                    {st.label}
                  </div>
                  <div className="text-xl font-bold text-white">
                    {st.value}{" "}
                    <span className="text-xs font-normal text-emerald-300">
                      {st.unit}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-[#0f1f17] border border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">
                  Kümülatif Nakit Akışı
                </span>
                <span className="text-xs text-emerald-300">
                  Başabaş ≈ 4.8 yıl
                </span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={CASH}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#34d399"
                        stopOpacity={0.7}
                      />
                      <stop
                        offset="100%"
                        stopColor="#34d399"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2e26"
                  />
                  <XAxis
                    dataKey="yil"
                    stroke="#52706180"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#52706180"
                    fontSize={10}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0c1712",
                      border: "1px solid #1f3a2c",
                      borderRadius: 12,
                      color: "#e4e4e7",
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v} bin ₺`, "Kümülatif"]}
                    labelFormatter={(l) => `${l}. yıl`}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="#6ee7b7"
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="kümülatif"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#g)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fade}
          className="text-2xl md:text-3xl font-bold"
        >
          Mühendislik + Finans, tek platformda
        </motion.h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              variants={fade}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-zinc-800 bg-[#0c1712] p-6 hover:border-emerald-500/40 transition"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-[#0c1712] to-[#0a130e] p-8">
          <h2 className="text-2xl font-bold">4 adımda fizibilite</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <motion.div
                key={t}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                variants={fade}
                className="relative"
              >
                <div className="text-emerald-400 font-mono text-sm">
                  0{i + 1}
                </div>
                <div className="mt-1 font-semibold text-white">{t}</div>
                <div className="text-sm text-zinc-400">{d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fade}
          className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-8 py-12 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(52,211,153,0.25),transparent_60%)]" />
          <h2 className="relative text-3xl font-bold text-white">
            Projeni dakikalar içinde değerlendir
          </h2>
          <p className="relative mt-3 text-zinc-300">
            Ücretsiz, anahtarsız veri kaynakları · doğrulanmış hesap motoru
          </p>
          <Link
            href="/simulate"
            className="relative mt-7 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-3 font-semibold text-[#04130c] hover:bg-emerald-400 transition"
          >
            Hızlı Analiz Başlat <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
