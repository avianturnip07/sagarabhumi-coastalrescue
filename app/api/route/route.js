import { NextResponse } from 'next/server';
import { errorResponse, parsePoint } from '@/lib/api';
import { getRouter } from '@/lib/routing';
import { round, routeMetrics } from '@/lib/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15; // satu panggilan OSRM (timeout 8 detik) ditambah overhead

// GET /api/route?from_lat=&from_lon=&to_lat=&to_lon=
export async function GET(request) {
  try {
    const params = request.nextUrl.searchParams;
    const from = parsePoint(params, 'from_lat', 'from_lon', 'Titik awal');
    const to = parsePoint(params, 'to_lat', 'to_lon', 'Tujuan');
    const route = await getRouter().route(from, to);

    const m = routeMetrics(route);
    return NextResponse.json({
      route,
      summary: { distance_km: round(m.km, 2), drive_min: m.driveMin, walk_min: m.walkMin },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return errorResponse(err);
  }
}
