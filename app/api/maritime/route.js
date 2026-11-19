import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { MOCK_MARITIME } from '@/lib/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // ketiga sumber dipanggil paralel dengan timeout 4 detik

// >>> SWAP: titik pengamatan pesisir. Default: Padang (contoh).
const LAT = -0.9471;
const LON = 100.3543;

// >>> SWAP: sumber data.
// BMKG autogempa memuat gempa terbaru di seluruh Indonesia. Ini BUKAN peringatan dini untuk pesisir Anda.
const SOURCES = {
  quake: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json',
  wave: `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=wave_height`,
  level: `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=sea_level_height_msl`,
  wind: `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=wind_speed_10m`,
};

const TIMEOUT_MS = 4000;
const CACHE = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' };
// Data contoh hanya dipakai jika semua sumber gagal. Level "siaga" mengikuti spesifikasi.
const MOCK = { ...MOCK_MARITIME, alert_level: 'siaga' };
const NOTE = 'Status tsunami berasal dari gempa terbaru yang dilaporkan BMKG. Ini bukan pengganti peringatan dini resmi BMKG.';

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // cache data Next.js selama 5 menit
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const valueOrNull = (settled) => (settled.status === 'fulfilled' ? settled.value : null);

// GET /api/maritime
export async function GET() {
  try {
    const [quakeR, waveR, levelR, windR] = await Promise.allSettled(
      [SOURCES.quake, SOURCES.wave, SOURCES.level, SOURCES.wind].map((url) => getJson(url)),
    );

    const gempa = valueOrNull(quakeR)?.Infogempa?.gempa ?? null;
    const wave = valueOrNull(waveR)?.current?.wave_height ?? null;
    const level = valueOrNull(levelR)?.current?.sea_level_height_msl ?? null;
    const wind = valueOrNull(windR)?.current?.wind_speed_10m ?? null;

    const okCount = [gempa, wave, level, wind].filter((v) => v !== null).length;
    if (okCount === 0) return NextResponse.json(MOCK, { headers: CACHE });

    // Pasang surut: perkiraan dari tinggi muka laut model (m). Ambang ini perkiraan, bukan prediksi resmi.
    const tide = level === null ? null : level > 0.5 ? 'Tinggi' : level < -0.5 ? 'Rendah' : 'Sedang';

    // Status tsunami punya tiga keadaan. Tidak adanya potensi dari gempa terbaru tidak berarti aman.
    const potensi = String(gempa?.Potensi ?? '').toLowerCase();
    let alert = 'DATA TIDAK TERSEDIA';
    let alertLevel = 'tidak_diketahui';
    if (gempa) {
      if (potensi.includes('berpotensi tsunami') && !potensi.startsWith('tidak')) {
        alert = 'BERPOTENSI TSUNAMI';
        alertLevel = 'siaga';
      } else {
        alert = 'TIDAK ADA POTENSI TSUNAMI';
        alertLevel = 'normal';
      }
    }

    const quake = gempa
      ? {
          magnitude: Number(gempa.Magnitude) || null,
          region: gempa.Wilayah ?? null,
          datetime: gempa.DateTime ?? null,
          potensi: gempa.Potensi ?? null,
        }
      : null;

    return NextResponse.json({
      source: okCount === 4 ? 'live' : 'partial',
      updated_at: new Date().toISOString(),
      wave,
      wind,
      tide,
      alert,
      alert_level: alertLevel,
      quake,
      note: NOTE,
    }, { headers: CACHE });
  } catch (err) {
    return errorResponse(err);
  }
}
