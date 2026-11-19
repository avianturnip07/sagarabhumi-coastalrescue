'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/client';
import { LOADING_MARITIME, MOCK_MARITIME } from '@/lib/shared';

// >>> TUNE: selang pembaruan (spesifikasi: 10 menit) dan batas waktu satu permintaan.
const POLL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const LOADING = { ...LOADING_MARITIME, alert_level: 'tidak_diketahui', note: '' };
// Data contoh di sisi klien. Dipakai hanya jika /api/maritime sendiri tidak bisa dihubungi.
const CLIENT_MOCK = {
  ...MOCK_MARITIME,
  alert_level: 'siaga',
  note: 'Data contoh. Layanan telemetri tidak dapat dihubungi.',
};

// Telemetri maritim untuk dashboard. Jika pembaruan gagal, data terakhir tetap tampil dengan tanda `stale`.
export function useMaritime() {
  const [data, setData] = useState(LOADING);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let tick = 0; // nomor pembaruan: hanya pembaruan terakhir yang boleh mengubah state
    let inFlight = null;

    const load = async () => {
      const token = ++tick;
      inFlight?.abort();
      const ctrl = new AbortController();
      inFlight = ctrl;
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const json = await apiGet('/api/maritime', { signal: ctrl.signal });
        if (!alive || token !== tick) return;
        setData(json);
        setError(null);
      } catch {
        if (!alive || token !== tick) return;
        setError('Layanan telemetri tidak merespons.');
        setData((prev) => (prev.source === 'loading' ? CLIENT_MOCK : { ...prev, stale: true }));
      } finally {
        clearTimeout(timer);
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
      inFlight?.abort();
    };
  }, []);

  return { data, error };
}
