# PVSim — Güneş Enerjisi Fizibilite Simülasyon Platformu

> **Hedef Domain:** `pvsim.yesilsertifika.tech`
> **Deployment:** Hostinger VPS üzerinde Coolify
> Bu prompt, Cursor/Claude/v0/Bolt gibi bir AI kod aracına olduğu gibi verilerek tam çalışan bir PV fizibilite uygulaması üretmek üzere hazırlanmıştır.

---

## 🎯 Proje Özeti

Konut, ticari ve endüstriyel ölçekteki **güneş enerjisi santralleri (GES)** için detaylı fizibilite analizi yapan bir web uygulaması geliştir. Kullanıcı; konum, çatı/arazi geometrisi, panel/inverter seçimi, tüketim profili ve elektrik tarifesi girer; uygulama **yıllık enerji üretimi, finansal getiri (NPV, IRR, LCOE), geri ödeme süresi ve CO₂ tasarrufunu** hesaplayıp **banka uyumlu PDF rapor** üretir.

Türkiye pazarına özel: **EPDK lisanssız üretim mevzuatı, mahsuplaşma, YEKDEM, çatı tipi tesisler** desteklenmeli.

Mimari kurumsal kimliği `yesilsertifika.tech` markasıyla bütünleşik olmalı (yeşil/koyu yeşil tema, sade kurumsal arayüz).

---

## 🧱 Teknoloji Yığını

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Stil:** Tailwind CSS + shadcn/ui (yeşil temalı)
- **Veritabanı:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (email magic link + Google OAuth)
- **State:** Zustand
- **Form:** react-hook-form + zod
- **Grafikler:** Recharts + Plotly.js
- **Harita:** Leaflet + react-leaflet (OpenStreetMap, ücretsiz)
- **3D (opsiyonel):** Three.js + @react-three/fiber (çatı/panel yerleşimi)
- **CSV/Excel:** papaparse + SheetJS (xlsx)
- **PDF Rapor:** `@react-pdf/renderer` veya `puppeteer` (server-side)
- **Solar API:** PVGIS REST API (ücretsiz, Avrupa+Türkiye, saatlik veri)
- **Yedek Solar Veri:** NASA POWER API
- **Validation:** zod
- **Background Jobs (opsiyonel):** BullMQ + Redis (uzun simülasyonlar için)
- **Container:** Docker + docker-compose

**Coolify uyumluluğu:**
- Monolitik Next.js + Postgres yapısı (Coolify standart şablonu)
- `Dockerfile` ve `docker-compose.yml` repo köküne konur
- Coolify "Application" tipinde Docker build ile deploy edilir
- Postgres ayrı bir Coolify "Database" service'i olarak çalışır
- Subdomain `pvsim.yesilsertifika.tech` Coolify'da otomatik Let's Encrypt SSL ile bağlanır
- DNS: Hostinger DNS panelinde `pvsim` için A record → Hostinger VPS IP'si

---

## 📂 Proje Yapısı

```
pvsim/
├── app/
│   ├── page.tsx                      # Landing (özellikler, fiyatlandırma)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                  # Proje listesi
│   │   └── projects/[id]/
│   │       ├── page.tsx              # Proje düzenleme
│   │       ├── results/page.tsx      # Sonuç paneli
│   │       └── report/page.tsx       # PDF önizleme
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── projects/route.ts
│   │   ├── projects/[id]/route.ts
│   │   ├── simulate/route.ts         # Ana simülasyon endpoint
│   │   ├── pvgis/route.ts            # PVGIS proxy
│   │   ├── consumption/parse/route.ts# CSV/Excel parse
│   │   └── report/[id]/route.ts      # PDF üret
│   └── layout.tsx
├── components/
│   ├── project/
│   │   ├── LocationPicker.tsx        # Leaflet harita + arama
│   │   ├── SystemDesigner.tsx        # Panel/inverter seçici
│   │   ├── PanelLayout.tsx           # Çatı üzerinde panel yerleşimi
│   │   ├── ShadingAnalysis.tsx       # Ufuk profili & gölge
│   │   ├── ConsumptionUpload.tsx     # CSV yükleme
│   │   ├── TariffEditor.tsx          # Elektrik tarife editörü
│   │   └── FinancialInputs.tsx       # CapEx, OpEx, finansman
│   ├── results/
│   │   ├── EnergyChart.tsx           # Aylık üretim/tüketim
│   │   ├── HourlyHeatmap.tsx         # Saatlik üretim ısı haritası
│   │   ├── CashflowChart.tsx         # Nakit akışı + breakeven
│   │   ├── SensitivityTornado.tsx    # Duyarlılık analizi
│   │   ├── KPICards.tsx              # NPV, IRR, payback, LCOE
│   │   └── EnvironmentalImpact.tsx   # CO₂, ağaç eşdeğeri
│   ├── library/
│   │   ├── PanelCatalog.tsx          # Hazır panel kütüphanesi
│   │   └── InverterCatalog.tsx
│   └── ui/                           # shadcn bileşenleri
├── lib/
│   ├── solar/
│   │   ├── pvgis.ts                  # PVGIS API wrapper
│   │   ├── nasaPower.ts              # NASA POWER yedek
│   │   ├── sunPosition.ts            # Güneş pozisyonu (SPA algoritması)
│   │   ├── irradiance.ts             # POA irradiance (Hay-Davies veya Perez)
│   │   └── airMass.ts
│   ├── pv/
│   │   ├── pvwatts.ts                # NREL PVWatts modeli
│   │   ├── moduleModel.ts            # Sıcaklık, IAM, soiling kayıpları
│   │   ├── inverterModel.ts          # Inverter eğrisi, clipping
│   │   ├── lossesModel.ts            # DC/AC kayıp dağılımı
│   │   └── performanceRatio.ts
│   ├── consumption/
│   │   ├── profileParser.ts          # 15dk/saatlik CSV parse
│   │   ├── syntheticProfile.ts       # Profil yoksa sentetik üret
│   │   └── matcher.ts                # Üretim-tüketim eşleştirme
│   ├── tariff/
│   │   ├── trTariffs.ts              # TR güncel tarifeler (mesken, ticarethane, sanayi)
│   │   ├── netMetering.ts            # Mahsuplaşma hesabı
│   │   └── escalation.ts             # Yıllık tarife artışı
│   ├── finance/
│   │   ├── npv.ts
│   │   ├── irr.ts
│   │   ├── lcoe.ts                   # Levelized Cost of Energy
│   │   ├── payback.ts                # Basit + iskonto edilmiş
│   │   ├── cashflow.ts               # 25 yıllık nakit akışı tablosu
│   │   ├── loan.ts                   # Kredi/finansman amortizasyonu
│   │   └── sensitivity.ts            # Tornado/Monte Carlo
│   ├── environment/
│   │   └── co2.ts                    # TR grid emisyon faktörü
│   ├── regulation/
│   │   ├── epdk.ts                   # Lisanssız üretim sınırları
│   │   └── yekdem.ts                 # YEKDEM/destek mekanizmaları
│   └── report/
│       └── pdfRenderer.ts            # PDF rapor üreticisi
├── prisma/
│   └── schema.prisma                 # User, Project, Panel, Inverter, Simulation
├── data/
│   ├── panels.json                   # Modül kütüphanesi (Jinko, Trina, LG, JA, Canadian...)
│   ├── inverters.json                # Inverter kütüphanesi (Huawei, SMA, Sungrow, Fronius...)
│   └── tariffs.tr.json               # Güncel TR tarifeleri
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🧮 Hesap Modülleri (Detay)

### 1. Konum & Solar Kaynak (`lib/solar/`)

- **Girdiler:** Enlem, boylam, deniz seviyesinden yükseklik, tilt, azimut (0° güney, +90° batı), albedo (0.2 varsayılan)
- **Veri kaynağı:** PVGIS API (`https://re.jrc.ec.europa.eu/api/v5_2/seriescalc`)
  - Türkiye için TMY (Typical Meteorological Year) saatlik verisi: GHI, DHI, DNI, sıcaklık, rüzgar
- **POA (Plane of Array) hesabı:** Hay-Davies modeli ile yatay irradiance'tan eğik düzleme dönüşüm
- **Optimum eğim önerisi:** Lokal optimum bulan basit grid search (yıllık enerji maks.)
- **Ufuk profili:** Kullanıcı 36 noktalı ufuk profili çizebilmeli; gölgeleme saatlik bazda uygulanır

### 2. Sistem Tasarımı (`components/project/SystemDesigner.tsx`)

**Panel Kütüphanesi (`data/panels.json`):**
- En az 50 güncel modül: Jinko Tiger Neo, Trina Vertex S+, LONGi Hi-MO, JA Solar Deep Blue, Canadian BiHiKu, Q.CELLS
- Her panel için: Pmax (Wp), Vmpp, Impp, Voc, Isc, NOCT, sıcaklık katsayıları (Pmpp/Voc/Isc), boyutlar, ağırlık, verimlilik, garantili degradasyon

**Inverter Kütüphanesi:**
- Huawei SUN2000, SMA Sunny Tripower, Sungrow SG, Fronius Symo, GoodWe
- Her inverter için: AC çıkış gücü, MPPT sayısı/aralığı, max DC giriş, verim eğrisi, Avrupa verimi

**Boyutlandırma:**
- DC/AC oranı (genelde 1.10–1.35)
- String sayısı/uzunluğu (Voc soğukta sınırı, Vmpp sıcakta sınırı)
- MPPT eşleme doğrulaması
- Otomatik öneri: "Bu sistem için 18 panel × 1 string, 1 × Huawei 10KTL"

**Çatı Yerleşimi:**
- Dikdörtgen çatı alanı + engeller (baca, havalandırma) işaretle
- Otomatik panel yerleşim algoritması (portrait/landscape karşılaştırması)
- Sıra arası mesafe = panel yüksekliği × tan(α) (α: en düşük güneş açısı, gölgelemesiz)

### 3. Enerji Üretim Modeli (`lib/pv/`)

**PVWatts benzeri model:**
```
P_ac = P_dc_stc × (G_poa / 1000) × (1 + γ_pmp × (T_cell - 25)) × η_inv × (1 - Σ losses)
```

**Kayıp dağılımı (varsayılan):**
- Soiling (kirlilik): 2%
- Shading (gölge): kullanıcı girdisi
- Snow (kar): konuma göre
- Mismatch: 2%
- DC kablo kaybı: 2%
- Inverter kaybı: verim eğrisinden
- AC kablo: 1%
- Transformer (varsa): 1%
- Availability: 99%
- LID (Light-Induced Degradation): 1.5% (ilk yıl)
- Yıllık degradasyon: 0.5–0.7% (modül data sheet'ten)

**Çıktılar:**
- Yıllık enerji (kWh/yıl)
- Aylık dağılım (12 değer)
- Saatlik profil (8760 değer) — opsiyonel detay görünüm
- Performance Ratio (PR)
- Spesifik üretim (kWh/kWp/yıl) — Türkiye için tipik 1300–1750

### 4. Tüketim Profili (`lib/consumption/`)

**Üç yöntem:**
1. **CSV/Excel yükleme:** Akıllı sayaç verisi (saatlik veya 15 dakikalık, 1 yıl)
2. **Sentetik profil:** Sektör seçimi (mesken, ofis, fabrika, AVM, otel, okul, hastane) + yıllık kWh → tipik load shape uygulanır
3. **Manuel:** Aylık kWh + günlük tipik dağılım

**Tüketim-üretim eşleştirme (matcher.ts):**
- Self-consumption rate (öz tüketim oranı): üretilen enerjinin anlık tüketilen kısmı
- Self-sufficiency / Autarky: tüketimin GES'ten karşılanan oranı
- Şebekeye satılan/şebekeden alınan enerji (kWh/ay)

### 5. Tarife & Mahsuplaşma (`lib/tariff/`)

**TR güncel tarifeler (mesken, ticarethane, sanayi):**
- Tek zamanlı, üç zamanlı (gündüz 06–17, puant 17–22, gece 22–06)
- Aktif enerji + dağıtım + iletim + sayaç + TRT payı + enerji fonu + ETV + KDV bileşenleri
- 2026 değerleri varsayılan, kullanıcı güncelleyebilmeli

**Mahsuplaşma kuralları (Türkiye, 2026):**
- Lisanssız üretim (≤5 MW) için aylık mahsuplaşma
- Şebekeye verilen fazla enerji, perakende satış birim fiyatı üzerinden (aktif enerji bileşeni) hesaplanır
- Aynı tedarikçide farklı abonelikler arası mahsuplaşma izni
- 10 yıl YEKDEM (uygulanabilirse)

### 6. Finansal Analiz (`lib/finance/`)

**Girdiler:**
- **CapEx (Yatırım maliyeti):**
  - Panel (₺/Wp)
  - Inverter (₺/kW)
  - Konstrüksiyon/montaj
  - DC/AC kablo, koruma ekipmanları
  - İşçilik
  - Bağlantı bedeli (TEDAŞ)
  - Proje + mühendislik
  - KDV
  - Otomatik tahmin: 18.000–25.000 ₺/kWp (anahtar teslim, 2026)
- **OpEx (yıllık):**
  - Bakım: 0.5–1.5% CapEx
  - Sigorta: 0.3–0.5%
  - Inverter değişim rezervi (10–12. yıl): ~10% CapEx
  - İzleme/yönetim
- **Finansman:** Özkaynak, banka kredisi (faiz, vade), KOSGEB/Eximbank teşvikleri
- **Makro:** Enflasyon, tarife artışı, iskonto oranı

**Metrikler:**
- **NPV** (Net Bugünkü Değer) — 25 yıl proje ömrü
- **IRR** (İç Verim Oranı)
- **LCOE** (₺/kWh) — bankalar için anahtar metrik
- **Basit geri ödeme** ve **iskontolu geri ödeme**
- **Profitability Index** (PI = NPV / CapEx + 1)
- **DSCR** (Debt Service Coverage Ratio) — kredi varsa

**Duyarlılık & Risk:**
- **Tornado grafiği:** Tarife artışı, CapEx, üretim, OpEx, iskonto her biri ±20% → NPV etkisi
- **Monte Carlo (opsiyonel):** 1000 iterasyon, P50/P90 NPV ve IRR dağılımı
- **Senaryo karşılaştırma:** "Bu vs. Yatırım yapma" + "Bu vs. Banka mevduatı"

### 7. Çevresel Etki (`lib/environment/`)

- TR şebeke emisyon faktörü: ~0.45 kg CO₂/kWh (2026, kullanıcı güncelleyebilir)
- Önlenen CO₂ (ton, 25 yıl)
- Eşdeğer ağaç sayısı (1 ağaç ≈ 22 kg CO₂/yıl absorbe eder)
- Eşdeğer otomobil km

### 8. Rapor (`lib/report/`)

**PDF bölümleri (banka uyumlu):**
1. Yönetici özeti (1 sayfa, anahtar KPI'lar)
2. Proje künyesi (sahibi, konum, kapasite)
3. Konum analizi (harita + solar kaynak)
4. Sistem tasarımı (panel/inverter spec sheet'leri ek)
5. Enerji üretim simülasyonu (aylık tablo + grafik)
6. Tüketim profili & öz tüketim
7. Yatırım maliyeti detayı
8. Finansal analiz (25 yıllık nakit akışı tablosu + NPV/IRR/LCOE/Payback)
9. Duyarlılık analizi
10. Çevresel etki
11. Mevzuat uyumu (EPDK lisanssız üretim teyidi)
12. Tek hat şeması (otomatik üretilmiş SVG)
13. Sonuç & öneriler

**Excel rapor:** Tüm tablolar + ham saatlik veri (data analyst'ler için)

---

## 🎨 Kullanıcı Akışı

1. **Kayıt/Giriş** (email magic link)
2. **Yeni Proje** → isim + tip seçimi (mesken çatı / ticari çatı / arazi GES)
3. **Konum** → harita üzerinde nokta seç veya adres ara
4. **Çatı/Arazi Geometrisi** → boyutlar, tilt, azimut, mevcut engeller
5. **Sistem Tasarımı** → panel/inverter seç, otomatik boyutlandırma önerisi gör
6. **Tüketim** → CSV yükle veya sentetik profil seç
7. **Tarife** → bağlı bulunan dağıtım şirketi + tarife tipi
8. **Finansal** → CapEx (otomatik tahmin), OpEx, finansman tipi
9. **Hesapla** → 5–15 saniye içinde sonuçlar
10. **Sonuç Paneli** → KPI kartları, grafikler, duyarlılık
11. **Rapor İndir** → PDF + Excel

---

## ✅ MVP Kabul Kriterleri

- [ ] Kullanıcı `pvsim.yesilsertifika.tech` adresinden siteye erişebilir
- [ ] HTTPS otomatik (Let's Encrypt via Coolify) çalışır
- [ ] Yeni kullanıcı email ile kayıt olabilir
- [ ] Bir proje 5 dakikadan kısa sürede oluşturulabilir
- [ ] PVGIS API'den 1 yıllık saatlik veri çekme süresi <5 saniye
- [ ] Tam simülasyon (8760 saat) sunucuda <10 saniye biter
- [ ] PDF rapor 30 saniye içinde üretilir, dosya <5 MB
- [ ] NPV/IRR hesabı doğrulukla bilinen test case'lere ±%2 yakın
- [ ] En az 30 panel + 15 inverter kütüphanede mevcut
- [ ] Lighthouse Performance 80+, Accessibility 90+
- [ ] Mobil uyumlu (proje görüntüleme — düzenleme tabletten yapılabilir)

---

## 🚀 Coolify Deploy Adımları

### 1. DNS Hazırlığı (Hostinger Panel)

```
Tür: A
İsim: pvsim
Değer: <Hostinger VPS IP'si>
TTL: 300
```

### 2. Repo Hazırlığı

```bash
git init
git remote add origin <your-git-server-or-github>
git push -u origin main
```

### 3. `Dockerfile` (örnek)

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.js` içinde `output: 'standalone'` olmalı.

### 4. Coolify Üzerinde

1. Coolify panelinde **+ New → Application → Public Repository** (veya private + deploy key)
2. Build Pack: **Dockerfile**
3. Port: **3000**
4. Domains: `https://pvsim.yesilsertifika.tech`
5. **+ New → Database → PostgreSQL 16** oluştur, internal hostname'i not al
6. Application Environment Variables:
   ```
   DATABASE_URL=postgresql://user:pass@postgres-service:5432/pvsim
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   NEXTAUTH_URL=https://pvsim.yesilsertifika.tech
   EMAIL_SERVER=smtp://...
   EMAIL_FROM=noreply@yesilsertifika.tech
   PVGIS_BASE_URL=https://re.jrc.ec.europa.eu/api/v5_2
   ```
7. Deploy butonuna bas. Coolify Let's Encrypt sertifikasını otomatik alır.
8. İlk deploy sonrası Coolify terminalde:
   ```bash
   npx prisma migrate deploy
   npm run seed:panels
   npm run seed:inverters
   npm run seed:tariffs
   ```

### 5. CI/CD (otomatik deploy)

- Coolify'ın GitHub webhook entegrasyonunu aç → `main`'e her push otomatik yeniden deploy

---

## 📦 Başlangıç Komutları

```bash
npx create-next-app@latest pvsim --typescript --tailwind --app --src-dir=false
cd pvsim
npm install prisma @prisma/client next-auth @auth/prisma-adapter
npm install zustand zod react-hook-form @hookform/resolvers
npm install recharts plotly.js react-plotly.js
npm install leaflet react-leaflet @types/leaflet
npm install papaparse @types/papaparse xlsx
npm install @react-pdf/renderer
npm install date-fns
npm install three @react-three/fiber @react-three/drei
npm install bullmq ioredis
npx shadcn-ui@latest init
npx prisma init
```

---

## 🧪 Doğrulama Test Case'leri

Hesaplamaların doğruluğunu kanıtlamak için bilinen örnekler:

1. **Ankara çatı GES, 10 kWp:** Beklenen yıllık üretim 14.500–16.000 kWh, PR 0.78–0.82
2. **Antalya arazi GES, 1 MW:** Beklenen 1.700.000–1.850.000 kWh/yıl, spesifik üretim ~1700 kWh/kWp
3. **NPV testi:** CapEx 200.000 ₺, yıllık net gelir 35.000 ₺, iskonto %15, 25 yıl → NPV ≈ 26.000 ₺
4. **IRR testi:** Yukarıdaki örnek → IRR ≈ %17

---

## 🎁 Bonus / v2 Özellikler

- **Bataryalı sistem (storage):** Lityum batarya boyutlandırma, peak shaving, time-of-use arbitrage
- **GIS:** Çatı eğimi/yönü için uydu görüntüsünden otomatik çıkarım (Google Solar API entegrasyonu)
- **Drone foto entegrasyonu:** Mevcut çatı fotoğrafı üzerine panel render
- **Çoklu senaryo karşılaştırma:** A vs B sistem yan yana
- **CRM:** Müşteri yönetimi (yeşilsertifika.tech için satış pipeline)
- **Teklif PDF:** Müşteriye gönderilecek profesyonel teklif şablonu
- **Toptan analiz:** Birden fazla bina/şube için toplu çalışma
- **API:** Beyaz etiketli olarak entegratörlere REST API satışı
- **Çoklu dil:** TR + EN (i18n)
- **Webhook:** Hesap tamamlandığında Slack/email/Zapier
- **Kıyaslama (benchmark):** Aynı şehirde benzer kurulumlarla karşılaştırma (anonim toplu veri)

---

## 🛡️ Yasal & Güvenlik Notları

- KVKK uyumlu kullanıcı sözleşmesi & aydınlatma metni
- Üretilen rapor bağlayıcı değildir (resmi başvuru için EMO onaylı proje gerekir)
- Saha ölçümü ve gölge analizi için profesyonel doğrulama tavsiye edilir
- API anahtarları yalnızca server-side, environment variable'larda
- Rate limiting: kullanıcı başına saatlik 50 simülasyon (PVGIS hassas)
- Prisma seed dosyası kaynak referansları belgelemeli (panel/inverter datasheet linkleri)

---

## 🎨 Tasarım Kuralları (yesilsertifika.tech bütünlüğü)

- **Birincil renk:** Koyu yeşil `#0B6E4F` veya `#1B4332`
- **Vurgu:** Soft yeşil `#52B788`, sarı vurgu `#FFB627` (güneş)
- **Tipografi:** Inter (UI) + JetBrains Mono (sayılar/tablolar)
- **Bileşenler:** shadcn/ui (Card, Sheet, Tabs, Dialog) — yuvarlatılmış köşeler (rounded-2xl)
- **İkonografi:** Lucide icons
- **Boş durumlar:** İllüstrasyonlar (unDraw `solar_panels`, `eco`, `analytics`)
- **Tablo:** TanStack Table (sortable, filterable, paginated)
- **Dark mode:** Var (default light)

---

## 📜 İlk Sprint (1-2 hafta)

1. Next.js + Prisma + NextAuth iskeleti
2. PVGIS API entegrasyonu + saatlik veri çekme & cache
3. Basit PVWatts üretim modeli
4. Tüketim CSV yükleme + matcher
5. Aylık tarife mahsuplaşması
6. NPV/IRR/Payback hesabı
7. KPI kartları + 2 grafik (aylık enerji + yıllık nakit akışı)
8. PDF rapor (basit şablon)
9. Dockerfile + Coolify deploy
10. `pvsim.yesilsertifika.tech` canlıya alma

---

**Başla:** Yukarıdaki spesifikasyonu takip ederek MVP'yi sıfırdan inşa et. İlk commitleri ASAP `main` branch'ine at, Coolify webhook'u canlı tut, her PR'da `pvsim-staging.yesilsertifika.tech` preview environment'ı tetiklensin. Önceliğin **doğru üretim modeli + doğru finansal hesap + temiz PDF rapor**. Süslemeyi sonraya bırak.
