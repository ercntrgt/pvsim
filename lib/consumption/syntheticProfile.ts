/**
 * Sentetik tüketim profili — sektör tipine göre tipik yük şekli (load shape)
 * uygulanarak yıllık kWh'den 8760 saatlik profil üretir.
 *
 * Profiller normalize edilmiş saatlik ağırlıklardır; toplamları yıllık
 * tüketime ölçeklenir. Hafta içi/sonu ve mevsimsel modülasyon içerir.
 */

export type ConsumerSector =
  | "mesken" // konut
  | "ofis"
  | "fabrika" // 3 vardiya / sürekli
  | "avm"
  | "otel"
  | "okul"
  | "hastane"
  | "tarimsal"; // sulama (mevsimsel)

/** 24 saatlik tipik hafta içi şekil (göreli, normalize edilir). */
const WEEKDAY_SHAPE: Record<ConsumerSector, number[]> = {
  // gece düşük, sabah + akşam pik (akşam baskın)
  mesken: [
    0.4, 0.35, 0.3, 0.3, 0.35, 0.5, 0.8, 1.0, 0.9, 0.7, 0.6, 0.6, 0.65,
    0.6, 0.55, 0.6, 0.8, 1.1, 1.4, 1.5, 1.4, 1.1, 0.8, 0.55,
  ],
  // mesai saatleri baskın 08-18
  ofis: [
    0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.4, 0.7, 1.2, 1.4, 1.45, 1.4, 1.2,
    1.4, 1.45, 1.4, 1.2, 0.8, 0.45, 0.3, 0.25, 0.22, 0.2, 0.2,
  ],
  // sürekli üretim, hafif gündüz artışı
  fabrika: [
    0.85, 0.85, 0.85, 0.85, 0.85, 0.9, 1.0, 1.1, 1.15, 1.2, 1.2, 1.2,
    1.15, 1.2, 1.2, 1.15, 1.1, 1.0, 0.95, 0.9, 0.9, 0.88, 0.86, 0.85,
  ],
  // sabah-akşam uzun, hafta sonu yüksek
  avm: [
    0.25, 0.22, 0.2, 0.2, 0.2, 0.25, 0.35, 0.5, 0.8, 1.1, 1.3, 1.4,
    1.45, 1.45, 1.4, 1.4, 1.45, 1.5, 1.5, 1.4, 1.1, 0.7, 0.4, 0.3,
  ],
  // sabah ve akşam pik (misafir)
  otel: [
    0.55, 0.5, 0.45, 0.45, 0.45, 0.55, 0.8, 1.1, 1.05, 0.85, 0.75, 0.8,
    0.85, 0.8, 0.75, 0.8, 0.9, 1.1, 1.35, 1.4, 1.3, 1.05, 0.85, 0.65,
  ],
  // okul saatleri, hafta sonu çok düşük
  okul: [
    0.15, 0.15, 0.15, 0.15, 0.15, 0.2, 0.4, 0.8, 1.4, 1.5, 1.5, 1.45,
    1.3, 1.4, 1.4, 1.2, 0.8, 0.4, 0.25, 0.2, 0.18, 0.16, 0.15, 0.15,
  ],
  // 7/24 yüksek taban
  hastane: [
    0.8, 0.78, 0.76, 0.76, 0.78, 0.85, 0.95, 1.1, 1.2, 1.25, 1.25, 1.2,
    1.15, 1.2, 1.2, 1.15, 1.1, 1.05, 1.0, 0.95, 0.92, 0.88, 0.85, 0.82,
  ],
  // gündüz sulama, yaz baskın (mevsimsellik aşağıda)
  tarimsal: [
    0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 0.9, 1.2, 1.4, 1.5, 1.5, 1.4, 1.3,
    1.4, 1.4, 1.3, 1.0, 0.7, 0.4, 0.2, 0.12, 0.1, 0.1, 0.1,
  ],
};

/** Hafta sonu / hafta içi göreli toplam (1 = aynı). */
const WEEKEND_FACTOR: Record<ConsumerSector, number> = {
  mesken: 1.1,
  ofis: 0.35,
  fabrika: 0.95,
  avm: 1.2,
  otel: 1.15,
  okul: 0.15,
  hastane: 0.98,
  tarimsal: 1.0,
};

/** Aylık mevsimsel çarpan (1-12). */
const MONTHLY_FACTOR: Record<ConsumerSector, number[]> = {
  // kış ısıtma + yaz soğutma
  mesken: [1.2, 1.15, 1.0, 0.85, 0.8, 0.95, 1.15, 1.15, 0.9, 0.85, 1.0, 1.2],
  ofis: [1.1, 1.05, 0.95, 0.9, 0.95, 1.1, 1.2, 1.2, 1.0, 0.9, 0.95, 1.1],
  fabrika: [1.0, 1.0, 1.0, 1.0, 1.0, 1.02, 1.05, 1.05, 1.0, 1.0, 1.0, 1.0],
  avm: [1.0, 0.95, 0.95, 0.95, 1.0, 1.15, 1.25, 1.25, 1.05, 0.95, 1.0, 1.1],
  otel: [0.7, 0.7, 0.8, 0.95, 1.1, 1.3, 1.5, 1.5, 1.2, 0.95, 0.75, 0.85],
  okul: [1.1, 1.1, 1.05, 1.0, 1.0, 0.6, 0.2, 0.3, 1.0, 1.1, 1.1, 1.05],
  hastane: [1.05, 1.05, 1.0, 0.97, 0.98, 1.05, 1.12, 1.12, 1.0, 0.97, 1.0, 1.05],
  tarimsal: [0.1, 0.1, 0.3, 0.7, 1.3, 1.8, 2.0, 1.9, 1.2, 0.5, 0.15, 0.1],
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Yıllık kWh + sektör → 8760 saatlik tüketim (kWh) dizisi.
 * 2023 takvimi (1 Ocak = Pazar) referans alınır; hafta içi/sonu ayrımı.
 */
export function syntheticConsumption(
  annualKwh: number,
  sector: ConsumerSector,
): number[] {
  const shape = WEEKDAY_SHAPE[sector];
  const weekendF = WEEKEND_FACTOR[sector];
  const monthF = MONTHLY_FACTOR[sector];

  const raw: number[] = [];
  let total = 0;
  // 2023-01-01 Pazar (getUTCDay: 0=Pazar)
  const start = Date.UTC(2023, 0, 1);
  for (let month = 0; month < 12; month++) {
    for (let dom = 1; dom <= DAYS_IN_MONTH[month]; dom++) {
      const d = new Date(Date.UTC(2023, month, dom));
      const dow = d.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const dayScale = monthF[month] * (isWeekend ? weekendF : 1);
      for (let h = 0; h < 24; h++) {
        const v = shape[h] * dayScale;
        raw.push(v);
        total += v;
      }
    }
  }
  void start;
  const scale = total > 0 ? annualKwh / total : 0;
  return raw.map((v) => v * scale);
}

/** Aylık kWh + günlük tipik dağılım → 8760 saatlik (manuel yöntem). */
export function fromMonthlyTotals(
  monthlyKwh: number[],
  sector: ConsumerSector = "mesken",
): number[] {
  const shape = WEEKDAY_SHAPE[sector];
  const shapeSum = shape.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  for (let month = 0; month < 12; month++) {
    const days = DAYS_IN_MONTH[month];
    const perDay = (monthlyKwh[month] ?? 0) / days;
    for (let dom = 0; dom < days; dom++) {
      for (let h = 0; h < 24; h++) {
        out.push((shape[h] / shapeSum) * perDay);
      }
    }
  }
  return out;
}
