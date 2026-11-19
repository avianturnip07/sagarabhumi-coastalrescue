import buffer from '@turf/buffer';
import difference from '@turf/difference';
import { featureCollection, lineString, polygon } from '@turf/helpers';

// Zona bahaya tsunami dan banjir rob, dihitung dari garis pantai:
//   risiko tinggi: 0–500 m dari pantai, di sisi daratan (merah)
//   risiko sedang: 500 m–1 km dari pantai, di sisi daratan (kuning)
// Koordinat memakai urutan [lon, lat] (RFC 7946), sesuai yang diharapkan Turf.
//
// >>> PENTING: garis pantai di bawah adalah CONTOH untuk demonstrasi, bukan garis pantai resmi.
// Ganti dengan data resmi (misalnya garis pantai dari BIG atau OSM, dan zona dari InaRISK BNPB)
// sebelum dipakai untuk keselamatan warga.

export const RISK_STYLE = {
  high: { label: 'Risiko tinggi (0–500 m dari pantai)', color: '#EF4444' },
  moderate: { label: 'Risiko sedang (500 m–1 km dari pantai)', color: '#F59E0B' },
};

// Garis pantai contoh, dari utara ke selatan. Ujungnya dibuat jauh dari pusat kota,
// supaya artefak di ujung garis (akibat sisi laut yang belum dipetakan) tidak terlihat.
export const SAMPLE_COASTLINE = [
  [100.334, -0.8],
  [100.34, -0.85],
  [100.346, -0.9],
  [100.35, -0.93],
  [100.3525, -0.955],
  [100.358, -0.98],
  [100.3685, -1.1],
];

// Poligon laut: garis pantai di sisi timur, ditutup ke barat. Sisi timur dianggap daratan.
export const SAMPLE_SEA_MASK = [...SAMPLE_COASTLINE, [100.2, -1.1], [100.2, -0.8], SAMPLE_COASTLINE[0]];

// Kota -> sumber data. Tambahkan kota setelah data garis pantainya tersedia.
// Kota yang tidak ada di sini tidak punya zona bahaya, dan UI harus menampilkan "belum tersedia".
const HAZARD_SOURCES = {
  Padang: { source: 'sample', coastline: SAMPLE_COASTLINE, seaMask: SAMPLE_SEA_MASK },
};

const norm = (s) => String(s ?? '').trim().toLowerCase();
const SOURCES = new Map(Object.entries(HAZARD_SOURCES).map(([city, src]) => [norm(city), src]));
const cache = new Map();

export const listHazardCities = () => Object.keys(HAZARD_SOURCES);

// Menyusun zona dari garis pantai dan poligon laut. Fungsi ini murni, jadi datanya mudah diganti.
// Cara kerja: buat pita buffer di kedua sisi garis, lalu kurangkan bagian laut. Yang tersisa hanya sisi darat.
export function buildHazardZones({ coastline, seaMask }) {
  const sea = polygon([seaMask]); // melempar galat jika cincin tidak tertutup
  const landOnly = (feature) => difference(feature, sea); // null jika tidak ada sisa daratan

  const high = landOnly(buffer(lineString(coastline), 0.5, { units: 'kilometers', steps: 16 }));
  const within1km = landOnly(buffer(lineString(coastline), 1, { units: 'kilometers', steps: 16 }));
  // Pita sedang = area 1 km dikurangi area 500 m. Tanpa pengurangan ini, area 0–500 m terhitung dua kali.
  const moderate = high && within1km ? difference(within1km, high) : within1km;

  const features = [];
  if (high) features.push({ ...high, properties: { risk: 'high', ...RISK_STYLE.high } });
  if (moderate) features.push({ ...moderate, properties: { risk: 'moderate', ...RISK_STYLE.moderate } });
  return featureCollection(features);
}

// Mengembalikan { source, data } atau null jika kota belum punya data. Hasil disimpan per instance.
export function getHazardZones(city) {
  const src = SOURCES.get(norm(city));
  if (!src) return null;
  if (!cache.has(src)) {
    try {
      cache.set(src, { source: src.source, data: buildHazardZones(src) });
    } catch (err) {
      // Zona gagal dihitung: aplikasi tetap berjalan, hanya tanpa layer ini.
      console.error('[hazard] gagal menghitung zona:', err);
      cache.set(src, null);
    }
  }
  return cache.get(src);
}
