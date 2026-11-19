import { NextResponse } from 'next/server';
import { SUMATRA_BBOX, inBbox } from '@/lib/shared';

// Galat yang sengaja dilempar, dengan status HTTP yang jelas.
export class ApiError extends Error {
  constructor(status, message, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Kode galat routing -> status HTTP. Klien memakai 404 untuk "jalan tidak terhubung".
const ROUTING_STATUS = {
  NO_ROUTE: 404,
  NO_SEGMENT: 404,
  NO_CANDIDATES: 404,
  RATE_LIMIT: 429,
  TIMEOUT: 504,
  NETWORK: 502,
  UPSTREAM: 502,
  OSRM_ERROR: 502,
};

// Satu pintu untuk semua galat API. Detail teknis hanya masuk log server.
export function errorResponse(err) {
  if (err?.name === 'ApiError') {
    return NextResponse.json({ code: err.code, detail: err.message }, { status: err.status });
  }
  if (err?.name === 'RoutingError') {
    return NextResponse.json(
      { code: err.code, detail: err.message },
      { status: ROUTING_STATUS[err.code] ?? 502 },
    );
  }
  console.error('[api] galat tak terduga:', err);
  return NextResponse.json({ code: 'INTERNAL', detail: 'Terjadi kesalahan di server.' }, { status: 500 });
}

// Null dan string kosong harus ditolak: Number(null) menghasilkan 0 dan lolos diam-diam.
const toNumber = (raw) => (raw === null || raw.trim() === '' ? NaN : Number(raw));

// Membaca dan memvalidasi satu titik. Parameter query memakai urutan (lat, lon).
export function parsePoint(params, latKey, lonKey, label) {
  const lat = toNumber(params.get(latKey));
  const lon = toNumber(params.get(lonKey));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new ApiError(422, `${label}: koordinat tidak valid.`, 'BAD_COORDINATE');
  }
  if (!inBbox(lat, lon, SUMATRA_BBOX)) {
    throw new ApiError(422, `${label} berada di luar cakupan Sumatra.`, 'OUT_OF_COVERAGE');
  }
  return { lat, lon };
}

// Parameter numerik dengan batas. Nilai kosong memakai default.
export function parseNumber(params, key, fallback, min, max) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const value = toNumber(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ApiError(422, `Parameter ${key} harus di antara ${min} dan ${max}.`, 'BAD_PARAM');
  }
  return value;
}
