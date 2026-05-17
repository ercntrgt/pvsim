/**
 * Akıllı sayaç tüketim verisi ayrıştırıcı.
 *
 * CSV veya Excel'den saatlik / 15 dakikalık (1 yıl) tüketim verisini okuyup
 * 8760 saatlik kWh dizisine normalize eder. Sütun adları esnek tanınır
 * (tarih/zaman + kWh/tüketim/değer). 15 dk veriler 4'erli toplanır.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedProfile {
  /** Saatlik kWh, ≤8784 (genelde 8760). */
  hourlyKwh: number[];
  /** Tespit edilen çözünürlük. */
  resolution: "hourly" | "15min" | "unknown";
  annualKwh: number;
  rowsParsed: number;
  warnings: string[];
}

const TIME_KEYS = [
  "tarih",
  "zaman",
  "datetime",
  "date",
  "time",
  "timestamp",
  "saat",
  "tarihsaat",
];
const VALUE_KEYS = [
  "kwh",
  "tuketim",
  "tüketim",
  "deger",
  "değer",
  "value",
  "consumption",
  "aktif",
  "enerji",
  "energy",
];

function pickColumn(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().replace(/[\s_-]/g, ""));
  for (let i = 0; i < norm.length; i++) {
    if (candidates.some((c) => norm[i].includes(c.replace(/[\s_-]/g, "")))) {
      return i;
    }
  }
  return -1;
}

function rowsToProfile(
  rows: string[][],
  warnings: string[],
): ParsedProfile {
  if (rows.length < 2) {
    return {
      hourlyKwh: [],
      resolution: "unknown",
      annualKwh: 0,
      rowsParsed: 0,
      warnings: ["Veri boş veya tek satır"],
    };
  }
  const header = rows[0];
  let valueIdx = pickColumn(header, VALUE_KEYS);
  const timeIdx = pickColumn(header, TIME_KEYS);
  if (valueIdx < 0) {
    // Başlık yoksa: son sayısal sütunu değer kabul et
    valueIdx = header.length - 1;
    warnings.push(
      "Değer sütunu başlığı tanınamadı; son sütun kullanıldı",
    );
  }

  const values: number[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cell = rows[r][valueIdx];
    if (cell === undefined || cell === "") continue;
    const num = Number(String(cell).replace(",", "."));
    if (Number.isFinite(num)) values.push(num);
  }
  if (values.length === 0) {
    return {
      hourlyKwh: [],
      resolution: "unknown",
      annualKwh: 0,
      rowsParsed: 0,
      warnings: [...warnings, "Sayısal değer bulunamadı"],
    };
  }

  // Çözünürlük tespiti: kayıt sayısına göre
  let resolution: ParsedProfile["resolution"] = "unknown";
  let hourlyKwh: number[];
  if (values.length >= 34000) {
    resolution = "15min";
    hourlyKwh = [];
    for (let i = 0; i < values.length; i += 4) {
      hourlyKwh.push(
        values.slice(i, i + 4).reduce((a, b) => a + b, 0),
      );
    }
  } else if (values.length >= 8000 && values.length <= 9000) {
    resolution = "hourly";
    hourlyKwh = values;
  } else {
    resolution = "unknown";
    hourlyKwh = values;
    warnings.push(
      `Beklenmeyen kayıt sayısı (${values.length}); saatlik varsayıldı`,
    );
  }
  void timeIdx;
  const annualKwh = hourlyKwh.reduce((a, b) => a + b, 0);
  return {
    hourlyKwh,
    resolution,
    annualKwh: Math.round(annualKwh),
    rowsParsed: values.length,
    warnings,
  };
}

/** CSV metnini ayrıştırır. */
export function parseConsumptionCsv(csv: string): ParsedProfile {
  const warnings: string[] = [];
  const res = Papa.parse<string[]>(csv.trim(), {
    skipEmptyLines: true,
  });
  if (res.errors.length > 0) {
    warnings.push(`CSV uyarısı: ${res.errors[0].message}`);
  }
  return rowsToProfile(res.data as string[][], warnings);
}

/** Excel (xlsx/xls) buffer'ını ayrıştırır (ilk sayfa). */
export function parseConsumptionExcel(
  buffer: ArrayBuffer | Uint8Array,
): ParsedProfile {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
  }) as string[][];
  return rowsToProfile(rows, []);
}

/** 8760'a tamamla/buda (eksikse 0 doldur, fazlaysa kes). */
export function normalizeTo8760(hourlyKwh: number[]): number[] {
  if (hourlyKwh.length === 8760) return hourlyKwh;
  if (hourlyKwh.length > 8760) return hourlyKwh.slice(0, 8760);
  return [...hourlyKwh, ...new Array(8760 - hourlyKwh.length).fill(0)];
}
