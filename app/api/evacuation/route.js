import { NextResponse } from 'next/server';
import { errorResponse, parseNumber, parsePoint } from '@/lib/api';
import { getElevation } from '@/lib/elevation';
import { round, routeMetrics } from '@/lib/shared';
import { MAX_CANDIDATES, selectAndRoute } from '@/lib/routing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Anggaran pencarian 20 detik ditambah overhead. Nilai ini dicek terhadap batas paket Anda (Hobby).
export const maxDuration = 30;

const NO_STORE = { 'Cache-Control': 'no-store' }; // hasil bergantung pada lokasi pengguna

// GET /api/evacuation?lat=&lon=&radius_km=&max_candidates=
export async function GET(request) {
  try {
    const params = request.nextUrl.searchParams;
    const origin = parsePoint(params, 'lat', 'lon', 'Titik awal');
    const radiusKm = parseNumber(params, 'radius_km', 20, 1, 30);
    const maxCandidates = Math.trunc(parseNumber(params, 'max_candidates', MAX_CANDIDATES, 1, MAX_CANDIDATES));

    // Pencarian rute dan elevasi titik awal berjalan paralel, sehingga waktu tunggu tidak bertambah.
    const [result, originElevation] = await Promise.all([
      selectAndRoute(origin, { radiusKm, maxCandidates }),
      getElevation(origin.lat, origin.lon),
    ]);

    const m = routeMetrics(result.route);
    return NextResponse.json({
      shelter: result.shelter,
      route: result.route,
      summary: {
        distance_km: round(m.km, 2),
        drive_min: m.driveMin,
        walk_min: m.walkMin, // dihitung dari jarak rute mengemudi, jadi hanya perkiraan kasar
        // Perkiraan: selisih elevasi tujuan dan titik awal, bukan kenaikan kumulatif sepanjang jalan.
        elevation_gain_m: originElevation === null
          ? null
          : Math.max(0, Math.round(result.shelter.elevation_m - originElevation)),
      },
      straight_km: result.straight_km,
      candidates: result.candidates,
      tried: result.tried,
      partial: result.partial,
      partial_reason: result.partial_reason,
    }, { headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
}
