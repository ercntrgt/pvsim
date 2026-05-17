/**
 * YEKDEM / destek mekanizması (bilgilendirme amaçlı).
 *
 * Lisanssız çatı/küçük GES için tipik senaryo mahsuplaşmadır; YEKDEM
 * (Yenilenebilir Enerji Kaynakları Destekleme Mekanizması) daha çok
 * lisanslı/YEKA projelerinde uygulanır. Burada fizibilite raporunda
 * gösterilecek özet bilgi ve opsiyonel sabit alım fiyatı modeli sunulur.
 */

export interface YekdemInfo {
  applicable: boolean;
  /** Varsa USD/MWh cinsinden gösterge tarife (lisanssız için genelde yok). */
  indicativeUsdPerMwh?: number;
  /** Destek süresi (yıl). */
  supportYears: number;
  note: string;
}

/**
 * Lisanssız ≤5 MW tesis için YEKDEM uygulanabilirliği.
 * 2021 sonrası YEK Destekleme: lisanssızda mahsuplaşma esastır;
 * fazla enerji görevli tedarik şirketince düşük bedelle alınır.
 */
export function assessYekdem(params: {
  acKw: number;
  isRooftop: boolean;
}): YekdemInfo {
  if (params.acKw <= 5000) {
    return {
      applicable: false,
      supportYears: 10,
      note: params.isRooftop
        ? "Çatı/lisanssız tesis: mahsuplaşma esas; ay sonu net fazla görevli tedarik şirketince düşük birim fiyattan alınır. Klasik YEKDEM sabit alım garantisi uygulanmaz."
        : "Lisanssız ≤5 MW: mahsuplaşma + net fazla satışı. Sabit YEKDEM tarifesi yerine yıllık belirlenen birim fiyat uygulanır.",
    };
  }
  return {
    applicable: true,
    supportYears: 10,
    note: "Lisanslı/YEKA kapsamı: YEKDEM veya YEKA ihale fiyatı uygulanabilir (proje bazlı değerlendirilmeli).",
  };
}
