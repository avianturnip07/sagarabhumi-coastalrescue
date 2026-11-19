import shelterData from '@/data/shelters.json';
import { ApiError } from '@/lib/api';
import { CITY_CENTERS, EXCLUDED_CITIES, SUMATRA_BBOX, haversineKm, inBbox, radiusBbox } from '@/lib/shared';

const AGENCIES = new Set(['BMKG', 'BASARNAS', 'BPBD']);
const norm = (s) => String(s ?? '').trim().toLowerCase();

// >>> TUNE: tinggi minimum shelter (spesifikasi: elevasi > 15 m). Di bawah ini tidak masuk indeks.
export const MIN_SHELTER_ELEVATION_M = 15;

// Indeks routing: hanya kota pesisir dari CITY_CENTERS. Jambi dan Palembang dikeluarkan secara eksplisit.
const COASTAL = new Set(Object.keys(CITY_CENTERS).map(norm));
const EXCLUDED = new Set(EXCLUDED_CITIES.map(norm));

// Memeriksa satu record terhadap skema. Mengembalikan null jika tidak valid.
function validate(r) {
  const valid =
    typeof r?.id === 'string' && r.id.length > 0 &&
    typeof r.name === 'string' &&
    typeof r.city === 'string' &&
    Number.isFinite(r.lat) && Math.abs(r.lat) <= 90 &&
    Number.isFinite(r.lon) && Math.abs(r.lon) <= 180 &&
    Number.isFinite(r.elevation_m) &&
    Number.isInteger(r.capacity) && r.capacity >= 0 &&
    AGENCIES.has(r.source_agency) &&
    typeof r.is_active === 'boolean';
  return valid ? r : null;
}

// Dijalankan sekali per instance serverless (saat cold start), bukan setiap request.
function buildIndex(records) {
  const index = [];
  let rejected = 0;
  for (const raw of records) {
    const r = validate(raw);
    if (!r || !inBbox(r.lat, r.lon, SUMATRA_BBOX)) {
      rejected++;
      continue;
    }
    const city = norm(r.city);
    if (!COASTAL.has(city) || EXCLUDED.has(city)) continue; // di luar cakupan: dilewati tanpa peringatan
    if (r.elevation_m <= MIN_SHELTER_ELEVATION_M) continue; // dataran rendah: bukan titik aman tsunami
    index.push(r);
  }
  if (rejected > 0) console.warn(`[shelters] ${rejected} record dilewati: skema tidak valid atau di luar Sumatra.`);
  return index;
}

const INDEX = buildIndex(shelterData.shelters ?? []);

export function allShelters() {
  return INDEX;
}

// Shelter aktif dalam radius (km). Kotak batas sebagai filter murah, lalu Haversine yang akurat.
export function findCandidates(lat, lon, radiusKm) {
  const box = radiusBbox(lat, lon, radiusKm);
  const out = [];
  for (const shelter of INDEX) {
    if (!shelter.is_active || !inBbox(shelter.lat, shelter.lon, box)) continue;
    const km = haversineKm(lat, lon, shelter.lat, shelter.lon);
    if (km <= radiusKm) out.push({ shelter, km });
  }
  return out;
}

// Skor = jarak_lurus_km - 0.01 * elevasi_m. Makin kecil makin baik: 100 m elevasi setara 1 km jarak.
export const score = ({ shelter, km }) => km - 0.01 * shelter.elevation_m;

export function rankCandidates(candidates) {
  return [...candidates].sort((a, b) => score(a) - score(b));
}

// "minLon,minLat,maxLon,maxLat" menjadi array angka. Melempar ApiError jika formatnya salah.
export function parseBbox(text) {
  const parts = text.split(',').map((p) => (p.trim() === '' ? NaN : Number(p)));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new ApiError(422, 'bbox harus berformat minLon,minLat,maxLon,maxLat.', 'BAD_BBOX');
  }
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon > maxLon || minLat > maxLat) {
    throw new ApiError(422, 'bbox: nilai minimum harus lebih kecil dari maksimum.', 'BAD_BBOX');
  }
  return parts;
}

// Filter untuk GET /api/shelters.
export function queryShelters({ city, bbox, agency, activeOnly = true }) {
  let out = INDEX;
  if (city) {
    const c = norm(city);
    if (EXCLUDED.has(c)) throw new ApiError(422, `${city} dikecualikan dari indeks routing pesisir.`, 'EXCLUDED_CITY');
    if (!COASTAL.has(c)) throw new ApiError(404, `Kota pesisir tidak dikenal: ${city}.`, 'UNKNOWN_CITY');
    out = out.filter((s) => norm(s.city) === c);
  }
  if (bbox) {
    const box = parseBbox(bbox);
    out = out.filter((s) => inBbox(s.lat, s.lon, box));
  }
  if (agency) {
    if (!AGENCIES.has(agency)) throw new ApiError(422, 'agency harus BMKG, BASARNAS, atau BPBD.', 'BAD_AGENCY');
    out = out.filter((s) => s.source_agency === agency);
  }
  return activeOnly ? out.filter((s) => s.is_active) : out;
}
