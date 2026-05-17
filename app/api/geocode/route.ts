import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Nominatim (OpenStreetMap) geocode proxy — ücretsiz, anahtarsız.
 *
 * Sunucu tarafı proxy: Nominatim kullanım politikası gereği tanımlayıcı
 * User-Agent gönderir, basit in-memory cache ile istek sayısını düşürür.
 *
 *   GET /api/geocode?q=Antalya            → adres → koordinat (forward)
 *   GET /api/geocode?lat=36.9&lon=30.7    → koordinat → adres (reverse)
 */

const UA = "PVSim/1.0 (pvsim.yesilsertifika.tech; feasibility tool)";
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 1000 * 60 * 60; // 1 saat

async function nominatim(url: string) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "tr" },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q");
  const lat = sp.get("lat");
  const lon = sp.get("lon");

  try {
    if (q && q.trim().length >= 2) {
      const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2` +
        `&limit=6&accept-language=tr&countrycodes=tr&q=${encodeURIComponent(
          q.trim(),
        )}`;
      const raw = (await nominatim(url)) as Array<{
        display_name: string;
        lat: string;
        lon: string;
      }>;
      return NextResponse.json({
        results: raw.map((r) => ({
          label: r.display_name,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
        })),
      });
    }

    if (lat && lon) {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&accept-language=tr&lat=${encodeURIComponent(
          lat,
        )}&lon=${encodeURIComponent(lon)}`;
      const raw = (await nominatim(url)) as { display_name?: string };
      return NextResponse.json({ label: raw.display_name ?? null });
    }

    return NextResponse.json(
      { error: "q veya lat&lon gerekli" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Geocode başarısız", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
