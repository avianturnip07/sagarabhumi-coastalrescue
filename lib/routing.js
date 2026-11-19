import { findCandidates, rankCandidates } from '@/lib/shelters';
import { haversineKm, round } from '@/lib/shared';

// >>> TUNE: batas waktu per panggilan OSRM, anggaran total satu pencarian, dan jumlah kandidat.
// Anggaran total harus lebih kecil dari batas durasi fungsi serverless Anda (lihat catatan).
export const OSRM_TIMEOUT_MS = 8000;
export const SEARCH_BUDGET_MS = 20000;
export const MAX_CANDIDATES = 8;

// Server demo publik OSRM. Hanya untuk pengembangan, tidak dijamin untuk produksi.
const PUBLIC_OSRM = 'https://router.project-osrm.org';

// Galat yang menandakan layanan routing bermasalah secara umum. Mencoba shelter lain tidak ada gunanya.
const GLOBAL_CODES = new Set(['TIMEOUT', 'NETWORK', 'RATE_LIMIT', 'UPSTREAM']);

export class RoutingError extends Error {
  constructor(message, code = 'OSRM_ERROR') {
    super(message);
    this.name = 'RoutingError';
    this.code = code;
  }

  get isGlobal() {
    return GLOBAL_CODES.has(this.code);
  }
}

const isTimeout = (err) => err?.name === 'TimeoutError' || err?.name === 'AbortError';

// OSRM memakai urutan lon,lat. API kita dan Leaflet memakai lat,lon. Konversi hanya dilakukan di sini.
const toOsrm = (p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;

export class OSRMRouter {
  constructor(baseUrl = process.env.OSRM_URL || PUBLIC_OSRM) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  // from dan to berbentuk { lat, lon }. Mengembalikan metrik rute dan geometri GeoJSON.
  async route(from, to, { timeoutMs = OSRM_TIMEOUT_MS } = {}) {
    const url = `${this.baseUrl}/route/v1/driving/${toOsrm(from)};${toOsrm(to)}?overview=full&geometries=geojson`;

    let res;
    try {
      res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'COASTAL-RESCUE/2.0' },
        cache: 'no-store', // jangan simpan hasil rute di Data Cache Next.js
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (isTimeout(err)) throw new RoutingError(`OSRM tidak menjawab dalam ${timeoutMs / 1000} detik.`, 'TIMEOUT');
      throw new RoutingError('Gagal terhubung ke layanan routing.', 'NETWORK');
    }

    if (res.status === 429) throw new RoutingError('Batas permintaan layanan routing tercapai.', 'RATE_LIMIT');
    if (res.status >= 500) throw new RoutingError(`Layanan routing bermasalah (HTTP ${res.status}).`, 'UPSTREAM');

    // OSRM juga mengirim JSON dengan status 400 (misalnya NoSegment), jadi isinya dibaca dulu, baru statusnya dinilai.
    let body;
    try {
      body = await res.json();
    } catch (err) {
      if (isTimeout(err)) throw new RoutingError(`OSRM tidak menjawab dalam ${timeoutMs / 1000} detik.`, 'TIMEOUT');
      throw new RoutingError('Respons layanan routing tidak valid.', 'UPSTREAM');
    }

    const code = body?.code;
    if (code === 'NoRoute') throw new RoutingError('Tidak ada jalan yang menghubungkan kedua titik.', 'NO_ROUTE');
    if (code === 'NoSegment') throw new RoutingError('Titik terlalu jauh dari jalan yang terpetakan.', 'NO_SEGMENT');
    if (code !== 'Ok' || !Array.isArray(body.routes) || !body.routes[0]) {
      throw new RoutingError(body?.message || `Kode OSRM tidak dikenal: ${code}`, 'OSRM_ERROR');
    }

    const [r] = body.routes;
    const [start, end] = body.waypoints ?? [];
    if (!Number.isFinite(r.distance) || !Number.isFinite(r.duration) || r.geometry?.type !== 'LineString') {
      throw new RoutingError('Format rute dari OSRM tidak dikenali.', 'UPSTREAM');
    }

    return {
      distance_m: r.distance,
      duration_s: r.duration,
      geometry: r.geometry,                // LineString dengan koordinat [lon, lat] (RFC 7946)
      start_snap_m: start?.distance ?? 0,  // jarak titik awal ke jalan terdekat
      end_snap_m: end?.distance ?? 0,      // jarak shelter ke jalan terdekat
      provider: 'osrm',
    };
  }
}

// Mode offline: garis lurus x1,3 dengan kecepatan rata-rata 30 km/jam. Geometrinya BUKAN jalan sebenarnya.
const DEMO_DETOUR = 1.3;
const DEMO_SPEED_KMH = 30;

export class DemoRouter {
  async route(from, to) {
    const meters = haversineKm(from.lat, from.lon, to.lat, to.lon) * DEMO_DETOUR * 1000;
    return {
      distance_m: meters,
      duration_s: meters / (DEMO_SPEED_KMH / 3.6),
      geometry: { type: 'LineString', coordinates: [[from.lon, from.lat], [to.lon, to.lat]] },
      start_snap_m: 0,
      end_snap_m: 0,
      provider: 'demo',
    };
  }
}

let warnedPublicOsrm = false;

// ROUTER=demo memakai router offline. Selain itu memakai OSRM, dengan OSRM_URL bila diisi.
export function getRouter() {
  if (process.env.ROUTER === 'demo') return new DemoRouter();
  if (!process.env.OSRM_URL && process.env.VERCEL_ENV === 'production' && !warnedPublicOsrm) {
    warnedPublicOsrm = true;
    console.warn('[routing] OSRM_URL belum diisi. Memakai server demo publik, yang punya batas pemakaian.');
  }
  return new OSRMRouter();
}

// Pencarian shelter tercepat:
//   1. ambil shelter aktif dalam radius, urutkan dengan skor (jarak lurus - 0,01 x elevasi);
//   2. uji paling banyak maxCandidates kandidat ke router, satu per satu;
//   3. galat umum (429, timeout, jaringan, 5xx) menghentikan pengujian;
//   4. pilih kandidat dengan duration_s terkecil.
export async function selectAndRoute(origin, {
  radiusKm = 20,
  maxCandidates = MAX_CANDIDATES,
  router = getRouter(),
  budgetMs = SEARCH_BUDGET_MS,
  now = Date.now,
} = {}) {
  const inRange = findCandidates(origin.lat, origin.lon, radiusKm);
  if (inRange.length === 0) {
    throw new RoutingError(`Tidak ada shelter aktif dalam radius ${radiusKm} km.`, 'NO_CANDIDATES');
  }
  const ranked = rankCandidates(inRange).slice(0, Math.min(maxCandidates, MAX_CANDIDATES));
  const deadline = now() + budgetMs;

  let best = null;
  let lastError = null;      // galat NoRoute/NoSegment terakhir (hanya berlaku untuk satu shelter)
  let tried = 0;
  let partialReason = null;  // 'time_budget', atau kode galat global yang menghentikan pengujian

  for (const { shelter, km } of ranked) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      partialReason = 'time_budget';
      break;
    }

    tried++;
    let route;
    try {
      // Timeout per panggilan juga dibatasi oleh sisa anggaran.
      route = await router.route(origin, shelter, { timeoutMs: Math.floor(Math.min(OSRM_TIMEOUT_MS, remaining)) });
    } catch (err) {
      if (!(err instanceof RoutingError)) throw err;
      if (err.isGlobal) {
        if (!best) throw err;      // belum ada hasil: laporkan galat ini ke klien
        partialReason = err.code;  // sudah ada hasil: kembalikan yang terbaik, dan tandai parsial
        break;
      }
      lastError = err;            // shelter ini tidak terhubung ke jalan: lanjut ke kandidat berikutnya
      continue;
    }

    if (!best || route.duration_s < best.route.duration_s) {
      best = { shelter, route, km };
    }
  }

  if (!best) {
    if (partialReason === 'time_budget') {
      throw new RoutingError('Pencarian rute melebihi batas waktu.', 'TIMEOUT');
    }
    throw lastError ?? new RoutingError('Tidak ada shelter yang terhubung ke jalan.', 'NO_ROUTE');
  }

  return {
    shelter: best.shelter,
    route: best.route,
    straight_km: round(best.km, 2),
    candidates: inRange.length,
    tried,
    partial: partialReason !== null,
    partial_reason: partialReason,
  };
}
