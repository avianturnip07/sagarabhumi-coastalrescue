'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/client';

// Daftar shelter aktif untuk marker peta. Diambil sekali ketika dashboard dibuka.
export function useShelters() {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet('/api/shelters', { signal: ctrl.signal })
      .then((items) => setState({ status: 'ready', items }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: 'error', items: [] });
      });
    return () => ctrl.abort();
  }, []);

  return state;
}

// Zona bahaya untuk satu kota. `city` null berarti lokasi di luar area yang punya data.
export function useHazard(city) {
  const [state, setState] = useState({ status: 'idle', zones: null, source: null });

  useEffect(() => {
    if (!city) {
      setState({ status: 'out_of_area', zones: null, source: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading', zones: null, source: null });
    apiGet(`/api/hazard?city=${encodeURIComponent(city)}`, { signal: ctrl.signal })
      .then((json) => setState({ status: 'ready', zones: json.zones, source: json.source }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState({ status: err.code === 'NO_HAZARD_DATA' ? 'missing' : 'error', zones: null, source: null });
      });
    return () => ctrl.abort();
  }, [city]);

  return state;
}
