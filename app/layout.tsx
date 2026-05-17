import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, Sun } from "lucide-react";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PVSim — Güneş Enerjisi Fizibilite Platformu",
  description:
    "Konut, ticari ve endüstriyel GES için enerji üretimi, NPV/IRR/LCOE ve banka uyumlu PDF fizibilite raporu. yesilsertifika.tech",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-card">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold"
            >
              <Image
                src="/logo.png"
                alt="Yörünge"
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain"
              />
              <span className="leading-tight">
                <span className="block text-brand-dark text-base">
                  PV<span className="text-brand">Sim</span>
                </span>
                <span className="block text-[10px] font-normal text-muted -mt-0.5">
                  yesilsertifika.tech
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/simulate" className="hover:text-brand">
                Hızlı Analiz
              </Link>
              <Link href="/dashboard" className="hover:text-brand">
                Projelerim
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
              >
                Giriş
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-brand-dark text-zinc-200">
          <div className="mx-auto max-w-6xl px-4 py-12 grid gap-10 md:grid-cols-3">
            {/* Marka */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/95">
                  <Image
                    src="/logo.png"
                    alt="Yörünge"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </span>
                <div>
                  <div className="font-semibold text-white text-lg leading-tight">
                    PV<span className="text-brand-soft">Sim</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    yesilsertifika.tech
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-xs">
                Güneş enerjisi fizibilite simülasyon platformu —
                doğrulanmış mühendislik motoru, banka uyumlu raporlar.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-soft">
                <Sun className="h-3.5 w-3.5" />
                Yörünge Kurumsal Danışmanlık &amp; Eğitim
              </div>
            </div>

            {/* İletişim */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                İletişim
              </h3>
              <div className="mt-4">
                <div className="text-white font-semibold">
                  Ercan TURGUT
                </div>
                <div className="text-sm text-zinc-400">
                  Mekatronik Yüksek Mühendisi
                </div>
                <div className="mt-4 space-y-2.5 text-sm">
                  <a
                    href="tel:+905320159816"
                    className="group flex items-center gap-2.5 text-zinc-300 hover:text-brand-soft transition"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-brand-soft/15 transition">
                      <Phone className="h-4 w-4" />
                    </span>
                    0 532 015 98 16
                  </a>
                  <a
                    href="mailto:ercan@yorungekurumsal.com"
                    className="group flex items-center gap-2.5 text-zinc-300 hover:text-brand-soft transition"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-brand-soft/15 transition">
                      <Mail className="h-4 w-4" />
                    </span>
                    ercan@yorungekurumsal.com
                  </a>
                </div>
              </div>
            </div>

            {/* Bağlantılar */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Platform
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link
                    href="/simulate"
                    className="text-zinc-300 hover:text-brand-soft transition"
                  >
                    Hızlı Fizibilite Analizi
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-zinc-300 hover:text-brand-soft transition"
                  >
                    Projelerim
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-zinc-300 hover:text-brand-soft transition"
                  >
                    Giriş / Kayıt
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-500">
              <span>
                © {new Date().getFullYear()} Yörünge Kurumsal Danışmanlık
                &amp; Eğitim · Tüm hakları saklıdır.
              </span>
              <span>
                Üretilen rapor bağlayıcı değildir; resmi başvuru için EMO
                onaylı proje gereklidir.
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
