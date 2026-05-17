/**
 * EPDK Lisanssız Üretim mevzuatı uyum kontrolleri (2026).
 *
 * Referans: Elektrik Piyasasında Lisanssız Elektrik Üretim Yönetmeliği.
 * NOT: Mevzuat değişebilir; üretilen rapor bağlayıcı değildir, resmi
 * başvuru için EMO onaylı proje ve dağıtım şirketi görüşü gerekir.
 */

export type ConnectionType = "mesken_cati" | "ticari_cati" | "arazi" | "tarimsal";

export interface EpdkComplianceInput {
  /** Kurulu DC güç, kWp. */
  dcKwp: number;
  /** Inverter AC gücü, kW. */
  acKw: number;
  connectionType: ConnectionType;
  /** Bağlantı anlaşması gücü / sözleşme gücü, kW (varsa). */
  contractedPowerKw?: number;
  /** Yıllık tüketim, kWh (mahsuplaşma mantığı için). */
  annualConsumptionKwh?: number;
}

export interface EpdkComplianceResult {
  compliant: boolean;
  /** Lisanssız üst sınır, kW (AC). */
  unlicensedLimitKw: number;
  messages: string[];
  warnings: string[];
}

/**
 * Lisanssız üretim genel üst sınırı: 5 MW (5000 kW) AC.
 * Çatı tipi tesislerde sözleşme gücü ile sınırlama uygulanır;
 * mahsuplaşmada kurulu gücün tüketimle uyumu beklenir.
 */
const UNLICENSED_LIMIT_KW = 5000;

export function checkEpdkCompliance(
  input: EpdkComplianceInput,
): EpdkComplianceResult {
  const messages: string[] = [];
  const warnings: string[] = [];
  let compliant = true;

  if (input.acKw > UNLICENSED_LIMIT_KW) {
    compliant = false;
    messages.push(
      `AC gücü ${input.acKw} kW, lisanssız üst sınırı ${UNLICENSED_LIMIT_KW} kW (5 MW) aşıyor — lisans gerekir.`,
    );
  } else {
    messages.push(
      `AC gücü ${input.acKw} kW ≤ 5 MW: lisanssız üretim kapsamında.`,
    );
  }

  // Çatı tipinde sözleşme gücü sınırı
  if (
    (input.connectionType === "mesken_cati" ||
      input.connectionType === "ticari_cati") &&
    input.contractedPowerKw
  ) {
    if (input.acKw > input.contractedPowerKw) {
      warnings.push(
        `Çatı tesisi: kurulu AC güç (${input.acKw} kW) sözleşme gücünü (${input.contractedPowerKw} kW) aşıyor — dağıtım şirketi onayı/kapasite artışı gerekebilir.`,
      );
    }
  }

  // Mahsuplaşma uyumu: kurulu güç tüketimle aşırı orantısız mı?
  if (input.annualConsumptionKwh && input.dcKwp > 0) {
    const estAnnualGen = input.dcKwp * 1500; // kaba kWh/kWp
    if (estAnnualGen > input.annualConsumptionKwh * 1.5) {
      warnings.push(
        "Tahmini üretim, yıllık tüketimin %150'sini aşıyor — fazla enerji düşük değerlenir (mahsuplaşma verimsiz). Kapasiteyi tüketime göre küçültmeyi değerlendirin.",
      );
    }
  }

  if (input.dcKwp / Math.max(input.acKw, 0.001) > 1.4) {
    warnings.push(
      `DC/AC oranı ${(input.dcKwp / input.acKw).toFixed(2)} > 1.40 — aşırı clipping; mevzuat değil ama tasarım uyarısı.`,
    );
  }

  return {
    compliant,
    unlicensedLimitKw: UNLICENSED_LIMIT_KW,
    messages,
    warnings,
  };
}
