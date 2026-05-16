# PVSim — Güneş Enerjisi Fizibilite Simülasyon Platformu

> **Domain:** `pvsim.yesilsertifika.tech` · **Deploy:** Hostinger VPS + Coolify
> Konut/ticari/endüstriyel GES için enerji üretimi, finansal getiri (NPV/IRR/LCOE),
> geri ödeme ve CO₂ tasarrufu hesaplayıp banka uyumlu PDF rapor üretir.

Şartname: [`pvsim-prompt.md`](./pvsim-prompt.md)

## Teknoloji

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma + PostgreSQL ·
NextAuth (Auth.js v5) · Zustand · Recharts · Leaflet · @react-pdf/renderer ·
PVGIS API · Vitest.

## Geliştirme

```bash
npm install --legacy-peer-deps
cp .env.example .env            # değerleri doldur
npm run db:generate
npm run dev                     # http://localhost:3000
npm test                        # hesap motoru doğrulama testleri
```

## Mimari (hesap motoru — öncelikli)

```
lib/
  solar/       PVGIS çekme, güneş pozisyonu (SPA), POA irradiance (Hay-Davies), air mass
  pv/          PVWatts üretim modeli, modül/inverter modeli, kayıp dağılımı, PR
  consumption/ CSV/Excel parse, sentetik profil, üretim-tüketim eşleştirme
  tariff/      TR tarifeleri, aylık mahsuplaşma, eskalasyon
  finance/     NPV, IRR, LCOE, payback, 25 yıl nakit akışı, kredi, duyarlılık
  environment/ TR şebeke CO₂ emisyon faktörü
  regulation/  EPDK lisanssız üretim, YEKDEM
  report/      PDF/Excel rapor üreticisi
```

## Doğrulama (pvsim-prompt.md test case'leri)

| Case | Beklenen | Durum |
|------|----------|-------|
| NPV: CapEx 200k, net 35k/yıl, %15, 25y | ≈ 26.000 ₺ | ✅ `npm test` |
| IRR: yukarıdaki | ≈ %17 | ✅ `npm test` |
| Ankara çatı 10 kWp | 14.500–16.000 kWh, PR 0.78–0.82 | 🟡 motor kuruluyor |
| Antalya arazi 1 MW | 1.70–1.85 GWh, ~1700 kWh/kWp | 🟡 motor kuruluyor |

## Deploy (Coolify)

`Dockerfile` + `docker-compose.yml` repo kökünde. `next.config.ts` →
`output: "standalone"`. Detay adımlar `pvsim-prompt.md` § Coolify Deploy.

## Yasal

Üretilen rapor bağlayıcı değildir; resmi başvuru için EMO onaylı proje gerekir.
KVKK uyumlu aydınlatma metni ve saha doğrulaması tavsiye edilir.
