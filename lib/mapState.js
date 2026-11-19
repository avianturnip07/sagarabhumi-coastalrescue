import { CITY_CENTERS, SNAP_WARN_M, haversineKm } from '@/lib/shared';

// Jarak (m) titik awal dari posisi saat rute dihitung. Di atas nilai ini rute perlu dihitung ulang.
export const MOVED_WARN_M = 100;

// Kota pesisir terdekat dari titik `origin`, selama masih dalam `maxKm`. Jika tidak, kembalikan null.
export function nearestCoastalCity(origin, maxKm = 50) {
  let best = null;
  for (const [name, [lat, lon]] of Object.entries(CITY_CENTERS)) {
    const km = haversineKm(origin.lat, origin.lon, lat, lon);
    if (best === null || km < best.km) best = { name, km };
  }
  return best !== null && best.km <= maxKm ? best.name : null;
}

const PARTIAL_TEXT = {
  time_budget: 'batas waktu pencarian habis',
  RATE_LIMIT: 'batas permintaan layanan routing tercapai',
  TIMEOUT: 'layanan routing terlalu lambat',
  NETWORK: 'layanan routing tidak terjangkau',
  UPSTREAM: 'layanan routing bermasalah',
};

// Peringatan untuk panel rute. Daftar kosong berarti tidak ada yang perlu diperingatkan.
export function routeWarnings(state, currentOrigin) {
  if (state.status !== 'found') return [];
  const { route, partial, partialReason, origin } = state;
  const warnings = [];

  if (route.provider === 'demo') {
    warnings.push('Mode demo: garis lurus, bukan jalan sebenarnya.');
  }
  if (route.start_snap_m > SNAP_WARN_M) {
    warnings.push(`Titik awal berjarak ${Math.round(route.start_snap_m)} m dari jalan terdekat di peta.`);
  }
  if (route.end_snap_m > SNAP_WARN_M) {
    warnings.push(`Shelter berjarak ${Math.round(route.end_snap_m)} m dari jalan terdekat di peta.`);
  }
  if (partial) {
    const why = PARTIAL_TEXT[partialReason] ?? 'pencarian berhenti lebih awal';
    warnings.push(`Hasil sebagian: ${why}. Sebagian shelter belum diuji.`);
  }
  if (currentOrigin && origin) {
    const movedM = haversineKm(origin.lat, origin.lon, currentOrigin.lat, currentOrigin.lon) * 1000;
    if (movedM > MOVED_WARN_M) warnings.push('Posisi Anda sudah berubah. Hitung ulang jalur agar akurat.');
  }
  return warnings;
}

// Warna status maritim: siaga merah, normal hijau, selain itu netral.
export function alertTone(level) {
  if (level === 'siaga') return 'danger';
  if (level === 'normal') return 'ok';
  return 'muted';
}
