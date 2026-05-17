/**
 * Ekipman & tarife kataloğu — JSON verisini zod ile doğrulayıp tipli
 * nesneler olarak sunar. Hem seed scriptinde hem API'de kullanılır.
 */

import { z } from "zod";
import panelsJson from "../../data/panels.json";
import invertersJson from "../../data/inverters.json";
import tariffsJson from "../../data/tariffs.tr.json";

export const PanelSchema = z.object({
  id: z.string(),
  brand: z.string(),
  model: z.string(),
  cellTech: z.string(),
  pmaxW: z.number().positive(),
  vmppV: z.number().positive(),
  imppA: z.number().positive(),
  vocV: z.number().positive(),
  iscA: z.number().positive(),
  noctC: z.number(),
  tempCoeffPmaxPctPerC: z.number(),
  tempCoeffVocPctPerC: z.number(),
  tempCoeffIscPctPerC: z.number(),
  efficiency: z.number().min(0).max(1),
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  weightKg: z.number().positive(),
  annualDegradationPct: z.number().min(0).max(2),
  datasheet: z.string(),
});
export type Panel = z.infer<typeof PanelSchema>;

export const InverterSchema = z.object({
  id: z.string(),
  brand: z.string(),
  model: z.string(),
  acRatedW: z.number().positive(),
  maxDcW: z.number().positive(),
  mpptCount: z.number().int().positive(),
  mpptVMinV: z.number().positive(),
  mpptVMaxV: z.number().positive(),
  maxInputCurrentA: z.number().positive(),
  nominalEfficiency: z.number().min(0.9).max(1),
  euroEfficiency: z.number().min(0.9).max(1),
  phase: z.enum(["single", "three"]),
  datasheet: z.string(),
});
export type Inverter = z.infer<typeof InverterSchema>;

const TariffEntrySchema = z.object({
  category: z.enum(["mesken", "ticarethane", "sanayi", "tarimsal"]),
  timeOfUse: z.enum(["single", "three"]),
  activeEnergy: z.object({
    single: z.number(),
    gunduz: z.number(),
    puant: z.number(),
    gece: z.number(),
  }),
  distribution: z.number(),
  taxes: z.object({
    energyFund: z.number(),
    trtShare: z.number(),
    municipalTax: z.number(),
    vat: z.number(),
  }),
  year: z.number(),
});

const TariffsFileSchema = z.object({
  year: z.number(),
  currency: z.string(),
  note: z.string(),
  source: z.string(),
  tariffs: z.record(z.string(), TariffEntrySchema),
});

let _panels: Panel[] | null = null;
let _inverters: Inverter[] | null = null;

export function getPanels(): Panel[] {
  if (!_panels) _panels = z.array(PanelSchema).parse(panelsJson);
  return _panels;
}

export function getInverters(): Inverter[] {
  if (!_inverters)
    _inverters = z.array(InverterSchema).parse(invertersJson);
  return _inverters;
}

export function getPanelById(id: string): Panel | undefined {
  return getPanels().find((p) => p.id === id);
}

export function getInverterById(id: string): Inverter | undefined {
  return getInverters().find((i) => i.id === id);
}

export function getTariffs() {
  return TariffsFileSchema.parse(tariffsJson);
}

export const catalogCounts = () => ({
  panels: getPanels().length,
  inverters: getInverters().length,
});
