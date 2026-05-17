/**
 * Uçtan uca fizibilite simülasyonu giriş/çıkış tipleri.
 * /api/simulate ve PDF rapor bu sözleşmeyi kullanır.
 */

import type { ConsumerSector } from "../consumption/syntheticProfile";
import type { TariffCategory, TimeOfUse } from "../tariff/trTariffs";
import type { ArrayMountType } from "../pv/moduleModel";
import type { ConnectionType } from "../regulation/epdk";

export interface FeasibilityInput {
  project: {
    name: string;
    connectionType: ConnectionType;
  };
  location: {
    latitude: number;
    longitude: number;
    altitudeM?: number;
    timezoneOffsetHours?: number;
    /** PVGIS yerine gömülü TR iklim verisi kullan (offline/test). */
    preferEmbedded?: boolean;
  };
  system: {
    /** Panel katalog id'si. */
    panelId: string;
    /** Inverter katalog id'si. */
    inverterId: string;
    /** Hedef DC güç (kWp). Verilmezse usableAreaM2 ile boyutlandırılır. */
    targetKwp?: number;
    usableAreaM2?: number;
    /** Eğim derece. "auto" ise optimum bulunur. */
    tilt?: number | "auto";
    /** Azimut (0=K,180=G). Varsayılan 180. */
    azimuth?: number;
    mountType?: ArrayMountType;
    albedo?: number;
    /** 36 noktalı ufuk profili (derece). */
    horizonProfile?: number[];
    /** Kayıp override (kısmi). */
    losses?: Record<string, number>;
  };
  consumption: {
    /** "synthetic" | "monthly" | "hourly" */
    method: "synthetic" | "monthly" | "hourly";
    annualKwh?: number;
    sector?: ConsumerSector;
    monthlyKwh?: number[];
    hourlyKwh?: number[];
  };
  tariff: {
    category: TariffCategory;
    timeOfUse?: TimeOfUse;
    /** Tam tarife override (UI editöründen). */
    override?: unknown;
    surplusFactor?: number;
  };
  finance: {
    /** Toplam CapEx (₺). Verilmezse capexPerKwp ile tahmin edilir. */
    capex?: number;
    /** ₺/kWp (anahtar teslim). Varsayılan ~21.000. */
    capexPerKwp?: number;
    lifetimeYears?: number;
    discountRate?: number;
    tariffEscalation?: number;
    opexEscalation?: number;
    /** Yıllık OpEx (₺). Verilmezse CapEx'in %1.2'si. */
    annualOpex?: number;
    inverterReplacementYear?: number;
    inverterReplacementShareOfCapex?: number;
    /** Karşılaştırma için yıllık brüt mevduat faizi (0.40 = %40). */
    depositRate?: number;
    loan?: {
      principal?: number;
      /** CapEx'e oran (0-1), principal yoksa kullanılır. */
      shareOfCapex?: number;
      annualRate: number;
      termYears: number;
    };
  };
  environment?: {
    emissionFactor?: number;
  };
}
