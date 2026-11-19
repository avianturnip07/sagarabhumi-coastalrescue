'use client';

import { Polyline } from 'react-leaflet';
import { geoJsonToLatLng } from '@/lib/shared';

export default function RouteMap({ route }) {
  if (!route?.geometry?.coordinates?.length) return null;

  return (
    <Polyline
      positions={geoJsonToLatLng(route.geometry.coordinates)}
      pathOptions={{ color: '#34d399', weight: 6, opacity: 0.9 }}
    />
  );
}
