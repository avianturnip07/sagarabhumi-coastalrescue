import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { queryShelters } from '@/lib/shelters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Data shelter berubah jarang, jadi CDN boleh menyimpannya.
const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };

// GET /api/shelters?city=&bbox=minLon,minLat,maxLon,maxLat&agency=BMKG|BASARNAS|BPBD&active_only=true|false
export async function GET(request) {
  try {
    const p = request.nextUrl.searchParams;
    const activeOnly = !['false', '0', 'no'].includes((p.get('active_only') ?? 'true').toLowerCase());
    const items = queryShelters({
      city: p.get('city') || undefined,
      bbox: p.get('bbox') || undefined,
      agency: p.get('agency') || undefined,
      activeOnly,
    });
    return NextResponse.json(items, { headers: CACHE });
  } catch (err) {
    return errorResponse(err);
  }
}
