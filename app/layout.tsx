import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
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
        <footer className="border-t bg-card">
          <div className="mx-auto max-w-6xl px-4 py-6 flex items-center gap-3 text-xs text-muted">
            <Image
              src="/logo.png"
              alt="Yörünge"
              width={28}
              height={28}
              className="h-7 w-7 object-contain opacity-80"
            />
            <span>
              PVSim · yesilsertifika.tech — Üretilen rapor bağlayıcı
              değildir; resmi başvuru için EMO onaylı proje gereklidir.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
