import { NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/api';
import { getHazardZones, listHazardCities } from '@/lib/hazard';
import { EXCLUDED_CITIES } from '@/lib/shared';

export const runtime = 'nodejs'; // Turf dan jsts tidak berjalan di Edge runtime
export const dynamic = 'force-dynamic';

// Zona bahaya hanya berubah saat deploy baru, jadi CDN boleh menyimpannya sehari.
const CACHE = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };

// GET /api/hazard              -> daftar kota yang punya data
// GET /api/hazard?city=Padang  -> FeatureCollection zona bahaya
export async function GET(request) {
  try {
    const city = request.nextUrl.searchParams.get('city')?.trim();
    if (!city) {
      return NextResponse.json({ cities: listHazardCities() }, { headers: CACHE });
    }
    if (EXCLUDED_CITIES.some((c) => c.toLowerCase() === city.toLowerCase())) {
      throw new ApiError(422, `${city} dikecualikan dari indeks routing pesisir.`, 'EXCLUDED_CITY');
    }
    const zones = getHazardZones(city);
    if (!zones) {
      // Respons 404 tidak diberi cache, supaya begitu data tersedia, respons langsung ikut berubah.
      return NextResponse.json(
        { code: 'NO_HAZARD_DATA', detail: `Belum ada data zona bahaya untuk ${city}.` },
        { status: 404 },
      );
    }
    return NextResponse.json({ city, source: zones.source, zones: zones.data }, { headers: CACHE });
  } catch (err) {
    return errorResponse(err);
  }
}
