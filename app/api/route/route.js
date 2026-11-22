import { getRouter } from '@/lib/routing';
import { round, routeMetrics } from '@/lib/shared';

function normalizePoint(point, label) {
  if (!point || typeof point !== 'object') {
    throw new Error(`${label} tidak valid.`);
  }

  const lat = Number(point.lat ?? point.latitude);
  const lon = Number(point.lon ?? point.lng ?? point.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Koordinat ${label} harus berupa angka yang valid.`);
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error(`Koordinat ${label} di luar rentang geografis.`);
  }

  return { lat, lon };
}

/**
 * Menghitung rute evakuasi dan metrik jarak/waktu langsung di sisi klien
 * untuk kebutuhan static export (GitHub Pages).
 */
export async function computeEvacuationRoute(rawFrom, rawTo) {
  const from = normalizePoint(rawFrom, 'Titik awal');
  const to = normalizePoint(rawTo, 'Tujuan');
  const route = await getRouter().route(from, to);
  const metrics = routeMetrics(route);

  return {
    route,
    summary: {
      distance_km: round(metrics.km, 2),
      drive_min: metrics.driveMin,
      walk_min: metrics.walkMin,
    },
  };
}
