'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientError, apiGet, routeFailureStatus } from '@/lib/client';
import { createLatestGate } from '@/lib/latest';

// >>> TUNE: batas waktu di sisi klien. Harus lebih besar dari anggaran server (20 detik) agar
// klien tidak memutus permintaan yang sebenarnya masih berjalan.
export const REQUEST_TIMEOUT_MS = 25000;

const IDLE = { status: 'idle' };

// Status tampilan: idle | searching | found | unreachable | no_shelter | invalid | error
export function useEvacuationRoute() {
  const gateRef = useRef(null);
  if (gateRef.current === null) gateRef.current = createLatestGate();
  const [state, setState] = useState(IDLE);

  // Saat komponen dilepas, batalkan permintaan yang masih berjalan.
  useEffect(() => () => gateRef.current.cancel(), []);

  // Menjalankan satu permintaan. Hasilnya hanya diterapkan jika masih yang terbaru.
  const run = useCallback(async (url, meta) => {
    const req = gateRef.current.start(REQUEST_TIMEOUT_MS);
    setState({ status: 'searching', ...meta });
    try {
      const data = await apiGet(url, { signal: req.signal });
      if (!gateRef.current.isCurrent(req.id)) return; // sudah digantikan permintaan lain: buang hasilnya
      setState({
        status: 'found',
        origin: meta.origin,
        mode: meta.mode,
        shelter: data.shelter ?? meta.shelter,
        route: data.route,
        summary: data.summary,
        partial: data.partial ?? false,
        partialReason: data.partial_reason ?? null,
      });
    } catch (err) {
      if (!gateRef.current.isCurrent(req.id)) return;
      setState(toErrorState(err, req, meta));
    } finally {
      req.done();
    }
  }, []);

  // Cari shelter terdekat yang terhubung ke jalan. Server membandingkan hingga 8 kandidat.
  const requestNearest = useCallback((origin) => {
    if (!origin) return undefined;
    const qs = new URLSearchParams({ lat: String(origin.lat), lon: String(origin.lon) });
    return run(`/api/evacuation?${qs}`, { origin, mode: 'nearest', shelter: null });
  }, [run]);

  // Rute ke shelter yang dipilih pengguna, misalnya dengan mengklik marker.
  const requestRoute = useCallback((origin, shelter) => {
    if (!origin || !shelter) return undefined;
    const qs = new URLSearchParams({
      from_lat: String(origin.lat),
      from_lon: String(origin.lon),
      to_lat: String(shelter.lat),
      to_lon: String(shelter.lon),
    });
    return run(`/api/route?${qs}`, { origin, mode: 'manual', shelter });
  }, [run]);

  const reset = useCallback(() => {
    gateRef.current.cancel();
    setState(IDLE);
  }, []);

  return { state, requestNearest, requestRoute, reset };
}

// Mengubah galat menjadi status tampilan. Kode dari server dipetakan lewat routeFailureStatus.
function toErrorState(err, req, meta) {
  const base = { origin: meta.origin, mode: meta.mode, shelter: meta.shelter };
  if (req.timedOut()) {
    return { ...base, status: 'error', message: 'Pencarian melebihi batas waktu. Silakan coba lagi.' };
  }
  if (err instanceof ClientError) {
    return { ...base, status: routeFailureStatus(err.code), message: err.message, code: err.code };
  }
  return { ...base, status: 'error', message: 'Terjadi kesalahan yang tidak terduga.' };
}
