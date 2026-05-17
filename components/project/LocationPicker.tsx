"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Leaflet `window` kullanır → SSR kapalı dinamik import.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl bg-brand-dark/5 grid place-items-center text-sm text-muted"
      style={{ height: 320 }}
    >
      Harita yükleniyor…
    </div>
  ),
});

type SearchResult = {
  label: string;
  latitude: number;
  longitude: number;
};

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lon: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adres arama (debounce, Nominatim proxy)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `/api/geocode?q=${encodeURIComponent(query.trim())}`,
        );
        const j = await r.json();
        setResults(j.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Seçili koordinat için yer adı (reverse geocode)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/geocode?lat=${latitude}&lon=${longitude}`,
        );
        const j = await r.json();
        if (!cancelled) setPlaceLabel(j.label ?? null);
      } catch {
        if (!cancelled) setPlaceLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  function pick(r: SearchResult) {
    onChange(r.latitude, r.longitude);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const field =
    "rounded-lg border bg-card px-3 py-2 text-sm w-full";

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted block">
        Konum (haritada tıklayın, işaretçiyi sürükleyin veya arayın)
      </label>

      <div className="relative">
        <input
          className={field}
          placeholder="Adres / şehir ara (ör. Antalya, Konyaaltı)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-muted">
            aranıyor…
          </span>
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full max-h-56 overflow-auto rounded-lg border bg-card shadow-lg text-sm">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="block w-full text-left px-3 py-2 hover:bg-brand/10"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LeafletMap
        latitude={latitude}
        longitude={longitude}
        onChange={onChange}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="num">
          Enlem:{" "}
          <b className="text-brand-dark">{latitude.toFixed(5)}</b>
        </span>
        <span className="num">
          Boylam:{" "}
          <b className="text-brand-dark">{longitude.toFixed(5)}</b>
        </span>
        {placeLabel && (
          <span className="truncate max-w-full">📍 {placeLabel}</span>
        )}
      </div>

      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Koordinatı elle gir</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.00001"
            className={field}
            value={latitude}
            onChange={(e) =>
              onChange(Number(e.target.value) || 0, longitude)
            }
          />
          <input
            type="number"
            step="0.00001"
            className={field}
            value={longitude}
            onChange={(e) =>
              onChange(latitude, Number(e.target.value) || 0)
            }
          />
        </div>
      </details>
    </div>
  );
}
