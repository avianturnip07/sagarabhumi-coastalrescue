// Konstanta dan utilitas geospasial, dipakai di server (route handler) maupun client.
// Konvensi: API dan Leaflet memakai [lat, lon]; bounding box memakai [minLon, minLat, maxLon, maxLat].

export const SUMATRA_BBOX = [94.9, -6.2, 106.2, 6.2];
export const DEFAULT_POS = { lat: -0.9471, lon: 100.3543 }; // Padang (contoh)
export const SNAP_WARN_M = 100;

// Pusat kota pesisir. Indeks routing hanya berisi kota-kota ini.
export const CITY_CENTERS = {
  Padang: [-0.9471, 100.3543],
  'Banda Aceh': [5.5483, 95.3238],
  Medan: [3.5952, 98.6722],
  'Bandar Lampung': [-5.45, 105.2667],
  Bengkulu: [-3.8004, 102.2655],
  Pekanbaru: [0.5071, 101.4478],
  Pariaman: [-0.619, 100.12],
  Lhokseumawe: [5.1801, 97.1507],
  Dumai: [1.6671, 101.447],
};

// Kota pedalaman yang sengaja dikeluarkan dari indeks kandidat shelter
export const EXCLUDED_CITIES = ['Jambi', 'Palembang'];

export const AGENCY = {
  BMKG: { color: '#06B6D4', code: 'MK' },
  BASARNAS: { color: '#F97316', code: 'SR' },
  BPBD: { color: '#22C55E', code: 'PB' },
};

// Nomor darurat: verifikasi ke sumber resmi sebelum rilis.
// Nomor BPBD setempat diisi lewat environment variable NEXT_PUBLIC_BPBD_PHONE.
export const BPBD_PHONE = process.env.NEXT_PUBLIC_BPBD_PHONE || '';
export const EMERGENCY_CONTACTS = [
  { name: 'Polisi', no: '110' },
  { name: 'Pemadam kebakaran', no: '113' },
  { name: 'Basarnas (SAR)', no: '115' },
  { name: 'Ambulans', no: '119' },
  ...(BPBD_PHONE ? [{ name: 'BPBD setempat', no: BPBD_PHONE }] : []),
];

// Data contoh saat semua sumber telemetri gagal (sesuai spesifikasi)
export const MOCK_MARITIME = {
  source: 'mock',
  updated_at: null,
  wave: 2.5,
  wind: 18,
  tide: 'Tinggi',
  alert: 'SIAGA TSUNAMI',
  quake: null,
};
export const LOADING_MARITIME = {
  source: 'loading', wave: null, wind: null, tide: null, alert: 'MEMUAT', quake: null,
};

const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

// Jarak lingkaran besar (km) antara dua titik
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}

// Arah awal dari titik 1 ke titik 2, dalam derajat (0 = utara)
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
    - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Apakah titik berada di dalam bounding box?
export function inBbox(lat, lon, [minLon, minLat, maxLon, maxLat]) {
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

// Kotak kasar di sekitar titik, dipakai sebagai filter murah sebelum Haversine.
// 1 derajat lintang ≈ 111,32 km; 1 derajat bujur menyusut mengikuti cos(lintang).
export function radiusBbox(lat, lon, km) {
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.max(Math.cos(toRad(lat)), 1e-6));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

export const round = (v, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;

// GeoJSON (RFC 7946) menulis [lon, lat]; Leaflet memakai [lat, lon].
// Konversi hanya dilakukan di sini.
export const geoJsonToLatLng = (coords) => coords.map(([lon, lat]) => [lat, lon]);

const COMPASS = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];
export const compassName = (deg) => COMPASS[Math.round(deg / 45) % 8];

// Ringkasan rute untuk UI: jarak, waktu berkendara (dari OSRM), dan waktu jalan kaki (5 km/jam).
// Waktu jalan kaki ditambahkan karena rute OSRM memakai profil mobil.
export function routeMetrics(route) {
  return {
    km: route.distance_m / 1000,
    driveMin: Math.max(1, Math.round(route.duration_s / 60)),
    walkMin: Math.max(1, Math.round(route.distance_m / 83.3)),
  };
}

// Langkah evakuasi sederhana dari titik awal ke shelter
export function routeSteps(origin, shelter, km) {
  const dir = compassName(bearingDeg(origin[0], origin[1], shelter.lat, shelter.lon));
  return [
    `Mulai bergerak ke arah ${dir}, sekitar ${km.toFixed(1)} km.`,
    `Ikuti jalur hijau di peta menuju ${shelter.name}.`,
    'Setibanya di lokasi, lapor ke petugas dan ikuti arahan.',
  ];
}
