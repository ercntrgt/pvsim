import { getPanels, getInverters } from "@/lib/data/catalog";
import SimulateClient from "@/components/SimulateClient";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  const panels = getPanels().map((p) => ({
    id: p.id,
    label: `${p.brand} ${p.model} (${p.pmaxW} Wp)`,
    pmaxW: p.pmaxW,
    lengthMm: p.lengthMm,
    widthMm: p.widthMm,
  }));
  const inverters = getInverters().map((i) => ({
    id: i.id,
    label: `${i.brand} ${i.model} (${(i.acRatedW / 1000).toFixed(1)} kW)`,
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-dark">
        Hızlı Fizibilite Analizi
      </h1>
      <p className="text-sm text-muted mt-1">
        Girdileri doldurun, saniyeler içinde enerji + finansal sonuç ve PDF
        rapor alın.
      </p>
      <SimulateClient panels={panels} inverters={inverters} />
    </div>
  );
}
