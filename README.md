# PVSim — Güneş Enerjisi Fizibilite Simülasyon Platformu

> **Domain:** `pvsim.yesilsertifika.tech` · **Deploy:** Hostinger VPS + Coolify
> Konut/ticari/endüstriyel GES için enerji üretimi, finansal getiri
> (NPV/IRR/LCOE), geri ödeme ve CO₂ tasarrufu hesaplayıp banka uyumlu PDF
> rapor üretir. Şartname: [`pvsim-prompt.md`](./pvsim-prompt.md)

## Durum

| Katman | Durum |
|--------|-------|
| Hesap motoru (solar, PV, finans, tüketim, tarife, çevre, mevzuat) | ✅ 67 test geçer |
| Doğrulama (Ankara 10 kWp, Antalya 1 MW, NPV≈26k, IRR≈%17) | ✅ geçer |
| Katalog (36 panel, 22 inverter, TR tarife) | ✅ |
| Uçtan uca orkestratör + `/api/simulate` + `/api/report` (PDF) | ✅ |
| Web UI (landing, hızlı analiz, login, dashboard) | ✅ |
| Auth (dev credentials; Google/email env gelince) + Prisma | ✅ |
| Docker + Coolify deploy | ✅ |

## Teknoloji

Next.js 16 (App Router, standalone) · TypeScript · Tailwind v4 ·
Prisma 6 + PostgreSQL · NextAuth v5 · Recharts · @react-pdf/renderer ·
PVGIS/NASA POWER + gömülü TR iklim · Vitest.

## Geliştirme

```bash
npm install --legacy-peer-deps
cp .env.example .env            # değerleri doldur
npm run db:generate
npm test                        # 67 test (hesap motoru + doğrulama)
npm run dev                     # http://localhost:3000
```

Hesap motoru DB'siz çalışır; `/simulate` ve PDF rapor için veritabanı
gerekmez (`preferEmbedded` ile PVGIS olmadan da çalışır).

## Mimari (hesap motoru — öncelikli)

```
lib/
  solar/       sunPosition (SPA), airMass, clearSky (Hottel),
               irradiance (Hay-Davies POA), pvgis/nasaPower/trClimate resolver
  pv/          pvwatts 8760h, moduleModel (Sandia), inverterModel,
               lossesModel, performanceRatio, sizing
  consumption/ sentetik profil (8 sektör), CSV/Excel parser, matcher
  tariff/      TR tarifeleri, aylık mahsuplaşma, eskalasyon
  finance/     NPV, IRR, LCOE, payback, 25y nakit akışı, kredi/DSCR, tornado, MC
  environment/ TR şebeke CO₂
  regulation/  EPDK lisanssız ≤5MW, YEKDEM
  simulation/  runFeasibility orkestratörü (API + PDF sözleşmesi)
  report/      @react-pdf banka uyumlu rapor
```

## Doğrulama (`pvsim-prompt.md` test case'leri)

| Case | Beklenen | Sonuç |
|------|----------|-------|
| NPV: CapEx 200k, net 35k/yıl, %15, 25y | ≈ 26.000 ₺ | ✅ 26.245 (±%2) |
| IRR: yukarıdaki | ≈ %17 | ✅ ~%17.2 |
| Ankara çatı 10 kWp | 14.5–16k kWh, PR 0.78–0.82 | ✅ ~14.7k, PR 0.81 |
| Antalya arazi 1 MW | 1.70–1.85 GWh, ~1700 kWh/kWp | ✅ ~1.73 GWh |

## Coolify Deploy

1. **DNS (Hostinger):** `pvsim` A kaydı → VPS IP.
2. **Coolify → + New → Application → Public Repo** `github.com/ercntrgt/pvsim`
   - Build Pack: **Dockerfile** · Port **3000**
   - Domain: `https://pvsim.yesilsertifika.tech` (otomatik Let's Encrypt)
3. **Coolify → + New → Database → PostgreSQL 16**; internal hostname'i al.
4. Application **Environment Variables** (bkz. `.env.example`):
   `DATABASE_URL`, `NEXTAUTH_SECRET` (`openssl rand -base64 32`),
   `NEXTAUTH_URL=https://pvsim.yesilsertifika.tech`, `AUTH_TRUST_HOST=true`,
   `DEV_LOGIN_EMAIL`, `DEV_LOGIN_PASSWORD`, `PVGIS_BASE_URL`.
5. Deploy. Migrasyonlar konteyner açılışında **otomatik** uygulanır
   (`docker-entrypoint.sh` → `prisma migrate deploy`).
6. Katalogları seed et (Coolify terminal):
   ```bash
   npm run seed:all   # panel + inverter + tarife + dev kullanıcı
   ```
7. GitHub webhook ile `main`'e her push otomatik yeniden deploy.

Yerel deneme: `docker compose up --build` → http://localhost:3000

## Yasal

Üretilen rapor bağlayıcı değildir; resmi başvuru için EMO onaylı proje
gerekir. KVKK uyumlu aydınlatma metni ve saha doğrulaması tavsiye edilir.
