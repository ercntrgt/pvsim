/**
 * FeasibilityInput için zod doğrulama (API girişi).
 */
import { z } from "zod";

export const feasibilityInputSchema = z.object({
  project: z.object({
    name: z.string().min(1).max(120),
    connectionType: z.enum([
      "mesken_cati",
      "ticari_cati",
      "arazi",
      "tarimsal",
    ]),
  }),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitudeM: z.number().min(-50).max(4000).optional(),
    timezoneOffsetHours: z.number().min(-12).max(14).optional(),
    preferEmbedded: z.boolean().optional(),
  }),
  system: z.object({
    panelId: z.string().min(1),
    inverterId: z.string().min(1),
    targetKwp: z.number().positive().max(50_000).optional(),
    usableAreaM2: z.number().positive().max(2_000_000).optional(),
    tilt: z.union([z.number().min(0).max(90), z.literal("auto")]).optional(),
    azimuth: z.number().min(0).max(360).optional(),
    mountType: z
      .enum(["open_rack", "roof_mount", "insulated_back"])
      .optional(),
    albedo: z.number().min(0).max(1).optional(),
    horizonProfile: z.array(z.number()).length(36).optional(),
    losses: z.record(z.string(), z.number()).optional(),
  }),
  consumption: z.object({
    method: z.enum(["synthetic", "monthly", "hourly"]),
    annualKwh: z.number().positive().max(500_000_000).optional(),
    sector: z
      .enum([
        "mesken",
        "ofis",
        "fabrika",
        "avm",
        "otel",
        "okul",
        "hastane",
        "tarimsal",
      ])
      .optional(),
    monthlyKwh: z.array(z.number().nonnegative()).length(12).optional(),
    hourlyKwh: z.array(z.number()).max(9000).optional(),
  }),
  tariff: z.object({
    category: z.enum(["mesken", "ticarethane", "sanayi", "tarimsal"]),
    timeOfUse: z.enum(["single", "three"]).optional(),
    surplusFactor: z.number().min(0).max(1).optional(),
  }),
  finance: z.object({
    capex: z.number().positive().optional(),
    capexPerKwp: z.number().positive().max(200_000).optional(),
    lifetimeYears: z.number().int().min(5).max(40).optional(),
    discountRate: z.number().min(0).max(2).optional(),
    tariffEscalation: z.number().min(0).max(2).optional(),
    opexEscalation: z.number().min(0).max(2).optional(),
    annualOpex: z.number().nonnegative().optional(),
    inverterReplacementYear: z.number().int().min(1).max(40).optional(),
    inverterReplacementShareOfCapex: z.number().min(0).max(1).optional(),
    loan: z
      .object({
        principal: z.number().positive().optional(),
        shareOfCapex: z.number().min(0).max(1).optional(),
        annualRate: z.number().min(0).max(2),
        termYears: z.number().int().min(1).max(30),
      })
      .optional(),
  }),
  environment: z
    .object({ emissionFactor: z.number().min(0).max(2).optional() })
    .optional(),
});

export type FeasibilityInputParsed = z.infer<typeof feasibilityInputSchema>;
