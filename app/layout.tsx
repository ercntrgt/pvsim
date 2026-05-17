import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
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
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white">
                ☀
              </span>
              <span className="text-brand-dark">
                PV<span className="text-brand">Sim</span>
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
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted">
            PVSim · yesilsertifika.tech — Üretilen rapor bağlayıcı değildir;
            resmi başvuru için EMO onaylı proje gereklidir.
          </div>
        </footer>
      </body>
    </html>
  );
}
