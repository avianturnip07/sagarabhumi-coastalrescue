'use client';

import { useEffect, useRef } from 'react';
import {
  BASEMAP_LAYERS,
  EXTERNAL_GIS_ENDPOINTS,
  SUMATRA_COASTAL_MODELS,
  HexTsunamiGridEngine,
  AStarHexRouter,
} from '@/lib/h3HexEngine';

function getQuakeStyleByMagnitude(mag) {
  const numericMag = Number(mag) || 4.5;
  if (numericMag >= 7.0) {
    return { radius: 13, fillColor: '#dc2626', color: '#fef2f2' };
  }
  if (numericMag >= 6.0) {
    return { radius: 10, fillColor: '#ea580c', color: '#fff7ed' };
  }
  if (numericMag >= 5.2) {
    return { radius: 7.5, fillColor: '#f59e0b', color: '#fffbeb' };
  }
  return { radius: 5.5, fillColor: '#38bdf8', color: '#f0f9ff' };
}

/**
 * Mengambil geometri rute jalan raya aktual antara titik asal dan shelter tujuan
 * melalui backend /api/route (OSRM) dengan fallback langsung ke OSRM router publik.
 */
async function fetchRoadSnappedRoute(originLatLng, shelterLatLng, signal) {
  const [fromLat, fromLon] = originLatLng;
  const [toLat, toLon] = shelterLatLng;

  // 1. Coba rute jalan via API internal Next.js (/api/route)
  try {
    const qs = new URLSearchParams({
      from_lat: String(fromLat),
      from_lon: String(fromLon),
      to_lat: String(toLat),
      to_lon: String(toLon),
    });
    const res = await fetch(`/api/route?${qs.toString()}`, { signal });
    if (res.ok) {
      const data = await res.json();
      const coords = data?.route?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2 && data?.route?.provider !== 'demo') {
        const waypoints = coords.map(([lon, lat]) => [lat, lon]);
        const distanceKm = Number((data.route.distance_m / 1000).toFixed(2));
        const walkMinutes = Math.max(1, Math.round(data.route.distance_m / 83.3));
        return { waypoints, distanceKm, walkMinutes, provider: 'osrm-api' };
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
  }

  // 2. Fallback langsung ke OSRM router publik (profil jalan kaki / kendaraan)
  const osrmProfiles = ['foot', 'driving'];
  for (const profile of osrmProfiles) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${fromLon.toFixed(6)},${fromLat.toFixed(6)};${toLon.toFixed(6)},${toLat.toFixed(6)}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl, { signal });
      if (!res.ok) continue;
      const body = await res.json();
      const route = body?.routes?.[0];
      const coords = route?.geometry?.coordinates;
      if (body?.code === 'Ok' && Array.isArray(coords) && coords.length >= 2) {
        const waypoints = coords.map(([lon, lat]) => [lat, lon]);
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const walkMinutes = Math.max(1, Math.round(route.distance / 83.3));
        return { waypoints, distanceKm, walkMinutes, provider: `osrm-${profile}` };
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
    }
  }

  return null;
}

export default function MapView({
  cityId = 'padang',
  resolution = 'fine',
  magnitude = 8.6,
  timelineMin = 28,
  basemap = 'satellite',
  layers = {
    hexFill: true,
    hexBorders: true,
    urbanDots: true,
    evacRoute: true,
    shelters: true,
    inariskTsunami: true,
    usgsEarthquakes: true,
    roadRouteOverlay: true,
  },
  inariskOpacity = 0.6,
  usgsRefreshTrigger = 0,
  originCoords,
  selectedShelterId,
  externalShelters = [],
  roadRouteGeoJson = null,
  apiHazardZones = null,
  onSelectOrigin,
  onSelectShelter,
  onInspectCell,
  onSimulationUpdate,
  onInariskStatusChange,
  onUsgsStatusChange,
  onNotify,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null);

  const basemapRefs = useRef({
    satellite: null,
    street: null,
  });

  const layerGroupRefs = useRef({
    hexGrid: null,
    urbanDots: null,
    evacRoute: null,
    roadRoute: null,
    apiZones: null,
    shelters: null,
    originMarker: null,
    inariskImage: null,
    usgsGeoJson: null,
  });

  const gridEngineRef = useRef(new HexTsunamiGridEngine());
  const routerRef = useRef(null);
  const inspectedCellRef = useRef(null);
  const previousCityRef = useRef(cityId);
  const roadAbortRef = useRef(null);
  const roadCacheRef = useRef(new Map());

  const callbacksRef = useRef({
    onSelectOrigin,
    onSelectShelter,
    onInspectCell,
    onSimulationUpdate,
    onInariskStatusChange,
    onUsgsStatusChange,
    onNotify,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSelectOrigin,
      onSelectShelter,
      onInspectCell,
      onSimulationUpdate,
      onInariskStatusChange,
      onUsgsStatusChange,
      onNotify,
    };
  }, [
    onSelectOrigin,
    onSelectShelter,
    onInspectCell,
    onSimulationUpdate,
    onInariskStatusChange,
    onUsgsStatusChange,
    onNotify,
  ]);

  // 1. Inisialisasi Peta Leaflet + Esri-Leaflet secara Client-Side (SSR-Safe)
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const LModule = await import('leaflet');
      const L = LModule.default || LModule;
      if (typeof window !== 'undefined') {
        window.L = L;
      }

      const EsriModule = await import('esri-leaflet');
      const esri = EsriModule.default || EsriModule;
      const imageMapLayerFactory =
        EsriModule.imageMapLayer || esri?.imageMapLayer || L?.esri?.imageMapLayer;

      if (isCancelled || !mapContainerRef.current) return;

      leafletRef.current = L;
      routerRef.current = new AStarHexRouter(gridEngineRef.current);

      const initialCity = SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang;

      const map = L.map(mapContainerRef.current, {
        center: initialCity.center,
        zoom: initialCity.zoom,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const satLayer = L.tileLayer(BASEMAP_LAYERS.satellite.url, {
        attribution: BASEMAP_LAYERS.satellite.attribution,
        maxZoom: BASEMAP_LAYERS.satellite.maxZoom,
      });

      const strLayer = L.tileLayer(BASEMAP_LAYERS.street.url, {
        attribution: BASEMAP_LAYERS.street.attribution,
        maxZoom: BASEMAP_LAYERS.street.maxZoom,
      });

      basemapRefs.current = {
        satellite: satLayer,
        street: strLayer,
      };

      if (basemap === 'street') {
        strLayer.addTo(map);
      } else {
        satLayer.addTo(map);
      }

      layerGroupRefs.current.apiZones = L.layerGroup().addTo(map);
      layerGroupRefs.current.hexGrid = L.layerGroup().addTo(map);
      layerGroupRefs.current.urbanDots = L.layerGroup().addTo(map);
      layerGroupRefs.current.roadRoute = L.layerGroup().addTo(map);
      layerGroupRefs.current.evacRoute = L.layerGroup().addTo(map);
      layerGroupRefs.current.shelters = L.layerGroup().addTo(map);
      layerGroupRefs.current.originMarker = L.layerGroup().addTo(map);
      layerGroupRefs.current.usgsGeoJson = L.layerGroup().addTo(map);

      // Inisialisasi ArcGIS ImageServer InaRISK BNPB
      if (typeof imageMapLayerFactory === 'function') {
        try {
          callbacksRef.current.onInariskStatusChange?.({
            state: 'loading',
            message: 'Menghubungkan ke server InaRISK BNPB...',
          });

          const inariskLayer = imageMapLayerFactory({
            url: EXTERNAL_GIS_ENDPOINTS.inariskTsunami.endpoint,
            opacity: inariskOpacity,
          });

          let slowTimer = setTimeout(() => {
            callbacksRef.current.onInariskStatusChange?.({
              state: 'slow',
              message: 'Server gis.bnpb.go.id merespons lambat (timeout > 9 dtk)',
            });
          }, 9000);

          inariskLayer.on('loading', () => {
            clearTimeout(slowTimer);
            slowTimer = setTimeout(() => {
              callbacksRef.current.onInariskStatusChange?.({
                state: 'slow',
                message: 'Server gis.bnpb.go.id merespons lambat',
              });
            }, 9000);
          });

          inariskLayer.on('load', () => {
            clearTimeout(slowTimer);
            callbacksRef.current.onInariskStatusChange?.({
              state: 'ready',
              message: 'InaRISK BNPB ImageServer aktif (resolusi 100m)',
            });
          });

          inariskLayer.on('tileerror', () => {
            clearTimeout(slowTimer);
            callbacksRef.current.onInariskStatusChange?.({
              state: 'error',
              message: 'Layer raster InaRISK BNPB gagal dimuat / gangguan server',
            });
          });

          layerGroupRefs.current.inariskImage = inariskLayer;
          if (layers.inariskTsunami) {
            inariskLayer.addTo(map);
          }
        } catch {
          callbacksRef.current.onInariskStatusChange?.({
            state: 'error',
            message: 'Gagal menginisialisasi esri-leaflet ImageServer BNPB',
          });
        }
      }

      mapInstanceRef.current = map;
      renderSimulationLayers();
    }

    initMap();

    return () => {
      isCancelled = true;
      roadAbortRef.current?.abort();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Basemap Switcher (Satellite <-> Street) tanpa mereset kamera, zoom, H3 grid, rute, maupun shelter
  useEffect(() => {
    const map = mapInstanceRef.current;
    const { satellite, street } = basemapRefs.current;
    if (!map || !satellite || !street) return;

    if (basemap === 'street') {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(street)) {
        street.addTo(map);
        street.bringToBack();
      }
    } else {
      if (map.hasLayer(street)) map.removeLayer(street);
      if (!map.hasLayer(satellite)) {
        satellite.addTo(map);
        satellite.bringToBack();
      }
    }
  }, [basemap]);

  // 3. Kontrol Toggle & Opacity Slider InaRISK BNPB ImageServer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const inariskLayer = layerGroupRefs.current.inariskImage;
    if (!map || !inariskLayer) return;

    if (layers.inariskTsunami) {
      if (!map.hasLayer(inariskLayer)) {
        inariskLayer.addTo(map);
      }
      if (typeof inariskLayer.setOpacity === 'function') {
        inariskLayer.setOpacity(inariskOpacity);
      }
    } else if (map.hasLayer(inariskLayer)) {
      map.removeLayer(inariskLayer);
    }
  }, [layers.inariskTsunami, inariskOpacity]);

  // 4. Fetch & Render USGS Earthquake API (Sumatra BBox, M >= 4.5)
  useEffect(() => {
    let isAborted = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    async function fetchUsgsEarthquakes() {
      const L = leafletRef.current;
      const usgsGroup = layerGroupRefs.current.usgsGeoJson;
      if (!L || !usgsGroup) return;

      if (!layers.usgsEarthquakes) {
        usgsGroup.clearLayers();
        return;
      }

      callbacksRef.current.onUsgsStatusChange?.({
        state: 'loading',
        count: 0,
        lastUpdated: null,
        error: null,
      });

      try {
        const res = await fetch(EXTERNAL_GIS_ENDPOINTS.usgsEarthquake.endpoint, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} dari server USGS`);
        }

        const geojson = await res.json();
        if (isAborted) return;

        usgsGroup.clearLayers();

        const features = Array.isArray(geojson.features) ? geojson.features : [];
        const geoJsonLayer = L.geoJSON(geojson, {
          pointToLayer: (feature, latlng) => {
            const p = feature.properties || {};
            const style = getQuakeStyleByMagnitude(p.mag);
            return L.circleMarker(latlng, {
              radius: style.radius,
              fillColor: style.fillColor,
              color: style.color,
              weight: 1.5,
              opacity: 0.95,
              fillOpacity: 0.82,
            });
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const depthKm = Array.isArray(feature.geometry?.coordinates)
              ? feature.geometry.coordinates[2]
              : '-';
            const formattedTime = p.time
              ? new Date(p.time).toLocaleString('id-ID')
              : 'Tidak diketahui';
            const isTsunamiPotential = Number(p.mag) >= 6.5 || p.tsunami === 1;

            layer.bindPopup(`
              <div class="min-w-[235px] text-xs space-y-1.5">
                <div class="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5">
                  <span class="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                    USGS Earthquake Feed
                  </span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isTsunamiPotential
                      ? 'bg-red-950 text-red-200 border border-red-500/50'
                      : 'bg-amber-950 text-amber-200 border border-amber-500/40'
                  }">
                    ${isTsunamiPotential ? 'Potensi Tsunami' : 'Gempa Tektonik'}
                  </span>
                </div>
                <div class="space-y-1 text-slate-200 pt-0.5">
                  <div><strong>Magnitudo:</strong> <span class="font-mono text-orange-300">${p.mag}</span></div>
                  <div><strong>Kedalaman:</strong> <span class="font-mono text-cyan-200">${depthKm} km</span></div>
                  <div><strong>Waktu:</strong> <span>${formattedTime}</span></div>
                  <div><strong>Lokasi:</strong> <span>${p.place || 'Wilayah Sumatra'}</span></div>
                </div>
              </div>
            `);
          },
        });

        geoJsonLayer.addTo(usgsGroup);

        callbacksRef.current.onUsgsStatusChange?.({
          state: 'ready',
          count: features.length,
          lastUpdated: new Date().toLocaleTimeString('id-ID'),
          error: null,
        });
      } catch (err) {
        if (isAborted) return;
        const msg =
          err?.name === 'AbortError'
            ? 'Koneksi ke USGS API timeout (>12 detik)'
            : err?.message || 'Gagal memuat titik gempa USGS';

        callbacksRef.current.onUsgsStatusChange?.({
          state: 'error',
          count: 0,
          lastUpdated: null,
          error: msg,
        });
      }
    }

    fetchUsgsEarthquakes();

    return () => {
      isAborted = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [layers.usgsEarthquakes, usgsRefreshTrigger]);

  // Helper menggambar polyline rute evakuasi pada peta agar menyesuaikan jalan raya
  function drawEvacuationPolyline(L, routeGroup, activeOrigin, shelterCoords, waypoints, isRoadSnapped) {
    routeGroup.clearLayers();
    if (!layers.evacRoute || !waypoints || waypoints.length === 0) return;

    if (isRoadSnapped && waypoints.length >= 2) {
      const firstRoadPt = waypoints[0];
      const lastRoadPt = waypoints[waypoints.length - 1];

      // Garis penghubung titik awal ke ruas jalan terdekat
      L.polyline([activeOrigin, firstRoadPt], {
        color: '#fdba74',
        weight: 2.5,
        opacity: 0.78,
        dashArray: '4 5',
        interactive: false,
      }).addTo(routeGroup);

      // Garis penghubung ruas jalan terdekat ke shelter tujuan
      L.polyline([lastRoadPt, shelterCoords], {
        color: '#5eead4',
        weight: 2.5,
        opacity: 0.82,
        dashArray: '4 5',
        interactive: false,
      }).addTo(routeGroup);

      // Efek glow rute jalan raya
      L.polyline(waypoints, {
        color: '#fb923c',
        weight: 10,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routeGroup);

      // Garis utama yang mengikuti jaringan jalan raya aktual
      L.polyline(waypoints, {
        color: '#f97316',
        weight: 4.5,
        opacity: 0.98,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'astar-route-glow',
        interactive: false,
      }).addTo(routeGroup);
    } else {
      // Fallback sementara saat rute jalan raya sedang dimuat
      const fallbackCoords = [activeOrigin, ...waypoints, shelterCoords];
      L.polyline(fallbackCoords, {
        color: '#fb923c',
        weight: 4,
        opacity: 0.65,
        dashArray: '6 6',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      }).addTo(routeGroup);
    }
  }

  // 5. Render Rute Jalan Internal OSRM (/api/evacuation atau /api/route) bila dipicu tombol
  useEffect(() => {
    const L = leafletRef.current;
    const roadGroup = layerGroupRefs.current.roadRoute;
    if (!L || !roadGroup) return;

    roadGroup.clearLayers();
    if (!roadRouteGeoJson || !layers.evacRoute) return;

    try {
      L.geoJSON(roadRouteGeoJson, {
        style: {
          color: '#34d399',
          weight: 4,
          opacity: 0.88,
        },
      }).addTo(roadGroup);
    } catch {
      // Abaikan jika format rute jalan belum aktif
    }
  }, [roadRouteGeoJson, layers.evacRoute]);

  // 6. Render Ulang Grid Heksagonal, Urban Dots, Rute Evakuasi Jalan Raya, Shelter, & Origin
  function renderSimulationLayers() {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const grid = gridEngineRef.current;
    const router = routerRef.current;
    if (!L || !map || !grid || !router) return;

    const city = SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang;

    if (previousCityRef.current !== cityId) {
      previousCityRef.current = cityId;
      inspectedCellRef.current = null;
      map.flyTo(city.center, city.zoom, { duration: 1.05 });
    }

    grid.buildGrid(cityId, resolution);
    const simStats = grid.updateSimulation(cityId, magnitude, timelineMin);

    const activeOrigin = originCoords || city.defaultOrigin;
    const startCell = grid.findNearestCell(activeOrigin[0], activeOrigin[1]);
    if (!inspectedCellRef.current && startCell) {
      inspectedCellRef.current = startCell;
    }

    // Gabungkan shelter kota + shelter relevan dari /api/shelters
    const mergedShelters = [...city.shelters];
    if (Array.isArray(externalShelters) && externalShelters.length > 0) {
      externalShelters.forEach((ext, idx) => {
        const lat = Number(ext.lat ?? ext.latitude ?? ext.coords?.[0]);
        const lng = Number(ext.lon ?? ext.lng ?? ext.longitude ?? ext.coords?.[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const distKm = grid.haversineKm(city.center[0], city.center[1], lat, lng);
          if (distKm <= 12) {
            const exists = mergedShelters.some(
              (s) => grid.haversineKm(s.coords[0], s.coords[1], lat, lng) < 0.15
            );
            if (!exists) {
              mergedShelters.push({
                id: ext.id || `api-tes-${idx}`,
                name: ext.name || `TES Basarnas/BNPB #${idx + 1}`,
                coords: [lat, lng],
                elevM: Number(ext.elevation_m ?? ext.elevation ?? ext.elevM ?? 24),
                capacity: Number(ext.capacity || 2000),
              });
            }
          }
        }
      });
    }

    // Tentukan shelter tujuan optimal atau shelter pilihan pengguna
    let chosenShelter = null;
    let fallbackAStarRoute = null;

    if (selectedShelterId) {
      chosenShelter = mergedShelters.find((s) => s.id === selectedShelterId) || null;
      if (chosenShelter && startCell) {
        const goalCell = grid.findNearestCell(chosenShelter.coords[0], chosenShelter.coords[1]);
        fallbackAStarRoute = router.findPath(startCell, goalCell);
      }
    }

    if (!fallbackAStarRoute && startCell) {
      let minDist = Infinity;
      for (const shelter of mergedShelters) {
        const goalCell = grid.findNearestCell(shelter.coords[0], shelter.coords[1]);
        const candidate = router.findPath(startCell, goalCell);
        if (candidate && candidate.distanceKm < minDist) {
          minDist = candidate.distanceKm;
          fallbackAStarRoute = candidate;
          chosenShelter = shelter;
        }
      }
    }

    const baseRoute =
      fallbackAStarRoute && chosenShelter
        ? {
            shelter: chosenShelter,
            ...fallbackAStarRoute,
            isRoadSnapped: false,
          }
        : null;

    // A. Render Poligon Grid Heksagon
    const hexGroup = layerGroupRefs.current.hexGrid;
    hexGroup.clearLayers();
    if (layers.hexFill || layers.hexBorders) {
      for (const cell of grid.cells) {
        const isInspected =
          inspectedCellRef.current && inspectedCellRef.current.key === cell.key;

        const poly = L.polygon(cell.vertices, {
          color: isInspected
            ? '#ffffff'
            : layers.hexBorders
            ? 'rgba(30, 41, 59, 0.45)'
            : 'transparent',
          weight: isInspected ? 2.2 : layers.hexBorders ? 1 : 0,
          fillColor: cell.fillColor,
          fillOpacity: layers.hexFill ? cell.fillOpacity : 0,
          smoothFactor: 0.5,
        });

        poly.on('mouseover', () => {
          poly.setStyle({ color: '#22d3ee', weight: 2 });
          callbacksRef.current.onInspectCell?.(cell);
        });

        poly.on('mouseout', () => {
          const currentInspected =
            inspectedCellRef.current && inspectedCellRef.current.key === cell.key;
          poly.setStyle({
            color: currentInspected
              ? '#ffffff'
              : layers.hexBorders
              ? 'rgba(30, 41, 59, 0.45)'
              : 'transparent',
            weight: currentInspected ? 2.2 : layers.hexBorders ? 1 : 0,
          });
          if (inspectedCellRef.current) {
            callbacksRef.current.onInspectCell?.(inspectedCellRef.current);
          }
        });

        poly.on('click', () => {
          inspectedCellRef.current = cell;
          callbacksRef.current.onInspectCell?.(cell);
          callbacksRef.current.onSelectOrigin?.([...cell.center]);
          callbacksRef.current.onNotify?.(
            'Titik asal diperbarui. Menyesuaikan jalur evakuasi mengikuti jalan...'
          );
        });

        hexGroup.addLayer(poly);
      }
    }

    // B. Render Mikro-klaster Titik Paparan Bangunan Urban
    const dotsGroup = layerGroupRefs.current.urbanDots;
    dotsGroup.clearLayers();
    if (layers.urbanDots) {
      const canvasRenderer = L.canvas({ padding: 0.4 });
      for (const cell of grid.cells) {
        if (cell.urbanMicroDots.length === 0) continue;
        if (cell.riskClass === 2 || (cell.riskClass === 3 && cell.signedInlandKm < 2.6)) {
          const dotColor = cell.riskClass === 2 ? '#ea580c' : '#f97316';
          for (const dotCoord of cell.urbanMicroDots) {
            L.circleMarker(dotCoord, {
              renderer: canvasRenderer,
              radius: 2.3,
              color: 'transparent',
              fillColor: dotColor,
              fillOpacity: cell.riskClass === 2 ? 0.72 : 0.45,
              interactive: false,
            }).addTo(dotsGroup);
          }
        }
      }
    }

    // C. Render Rute Evakuasi Menyesuaikan Jaringan Jalan Raya (Gambar 1)
    const routeGroup = layerGroupRefs.current.evacRoute;
    if (chosenShelter && activeOrigin) {
      const cacheKey = `${activeOrigin[0].toFixed(5)},${activeOrigin[1].toFixed(5)}->${chosenShelter.coords[0].toFixed(5)},${chosenShelter.coords[1].toFixed(5)}`;
      const cachedRoad = roadCacheRef.current.get(cacheKey);

      if (cachedRoad) {
        const snappedRoute = {
          shelter: chosenShelter,
          waypoints: cachedRoad.waypoints,
          distanceKm: cachedRoad.distanceKm,
          walkMinutes: cachedRoad.walkMinutes,
          isRoadSnapped: true,
        };
        drawEvacuationPolyline(
          L,
          routeGroup,
          activeOrigin,
          chosenShelter.coords,
          cachedRoad.waypoints,
          true
        );

        const geoJsonSnapshot = grid.toGeoJson({
          cityId,
          magnitude,
          timelineMin,
          resolution,
          activeRoute: snappedRoute,
        });

        callbacksRef.current.onSimulationUpdate?.({
          hexCount: grid.cells.length,
          simStats,
          activeRoute: snappedRoute,
          geoJsonSnapshot,
        });
      } else {
        if (baseRoute) {
          drawEvacuationPolyline(
            L,
            routeGroup,
            activeOrigin,
            chosenShelter.coords,
            baseRoute.waypoints,
            false
          );
        }

        roadAbortRef.current?.abort();
        const ctrl = new AbortController();
        roadAbortRef.current = ctrl;

        fetchRoadSnappedRoute(activeOrigin, chosenShelter.coords, ctrl.signal)
          .then((roadResult) => {
            if (ctrl.signal.aborted || !roadResult) return;
            roadCacheRef.current.set(cacheKey, roadResult);

            const snappedRoute = {
              shelter: chosenShelter,
              waypoints: roadResult.waypoints,
              distanceKm: roadResult.distanceKm,
              walkMinutes: roadResult.walkMinutes,
              isRoadSnapped: true,
            };

            drawEvacuationPolyline(
              L,
              routeGroup,
              activeOrigin,
              chosenShelter.coords,
              roadResult.waypoints,
              true
            );

            const geoJsonSnapshot = grid.toGeoJson({
              cityId,
              magnitude,
              timelineMin,
              resolution,
              activeRoute: snappedRoute,
            });

            callbacksRef.current.onSimulationUpdate?.({
              hexCount: grid.cells.length,
              simStats,
              activeRoute: snappedRoute,
              geoJsonSnapshot,
            });
          })
          .catch(() => {
            // Tetap pertahankan fallback jika offline
          });
      }
    } else {
      routeGroup.clearLayers();
    }

    // D. Render Marker Shelter (TES)
    const sheltersGroup = layerGroupRefs.current.shelters;
    sheltersGroup.clearLayers();
    if (layers.shelters) {
      for (const shelter of mergedShelters) {
        const isOptimalTarget = chosenShelter && shelter.id === chosenShelter.id;
        const size = isOptimalTarget ? 26 : 22;

        const icon = L.divIcon({
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<div class="shelter-node ${isOptimalTarget ? 'active-optimal' : ''}"></div>`,
        });

        const marker = L.marker(shelter.coords, { icon });
        marker.bindPopup(`
          <div class="min-w-[215px] text-xs space-y-2">
            <div>
              <span class="text-[10px] font-mono uppercase tracking-wider text-cyan-300 block">Zona Aman Evakuasi (TES)</span>
              <h4 class="font-bold text-white text-sm">${shelter.name}</h4>
            </div>
            <div class="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-700/70">
              <div>
                <span class="text-[10px] text-slate-400 block">Elevasi Aman</span>
                <span class="font-mono font-bold text-cyan-300">+${shelter.elevM} mdpl</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">Kapasitas</span>
                <span class="font-mono font-bold text-emerald-300">${Number(shelter.capacity).toLocaleString('id-ID')} jiwa</span>
              </div>
            </div>
            <p class="text-[11px] text-teal-300 font-semibold">
              Klik marker untuk mengalihkan jalur evakuasi jalan ke TES ini.
            </p>
          </div>
        `);

        marker.on('click', () => {
          callbacksRef.current.onSelectShelter?.(shelter.id, shelter);
          callbacksRef.current.onNotify?.(`Alur evakuasi dialihkan mengikuti jalan menuju ${shelter.name}.`);
        });

        sheltersGroup.addLayer(marker);
      }
    }

    // E. Render Origin Concentric Marker
    const originGroup = layerGroupRefs.current.originMarker;
    originGroup.clearLayers();
    if (activeOrigin) {
      const originIcon = L.divIcon({
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: `
          <div class="origin-target-wrap">
            <div class="origin-target-pulse"></div>
            <div class="origin-target-outer">
              <div class="origin-target-inner"></div>
            </div>
          </div>
        `,
      });

      const originMarker = L.marker(activeOrigin, { icon: originIcon, zIndexOffset: 1000 });
      originMarker.bindTooltip('Titik Asal Evakuasi (Klik titik lain di peta untuk memindahkan)', {
        direction: 'top',
        offset: [0, -14],
      });
      originGroup.addLayer(originMarker);
    }

    const currentCell =
      (inspectedCellRef.current && grid.cellMap.get(inspectedCellRef.current.key)) || startCell;
    if (currentCell) {
      callbacksRef.current.onInspectCell?.(currentCell);
    }

    const geoJsonSnapshot = grid.toGeoJson({
      cityId,
      magnitude,
      timelineMin,
      resolution,
      activeRoute: baseRoute,
    });

    callbacksRef.current.onSimulationUpdate?.({
      hexCount: grid.cells.length,
      simStats,
      activeRoute: baseRoute,
      geoJsonSnapshot,
    });
  }

  useEffect(() => {
    renderSimulationLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cityId,
    resolution,
    magnitude,
    timelineMin,
    layers.hexFill,
    layers.hexBorders,
    layers.urbanDots,
    layers.evacRoute,
    layers.shelters,
    originCoords,
    selectedShelterId,
    externalShelters,
  ]);

  return (
    <div
      ref={mapContainerRef}
      id="h3TsunamiMap"
      className="fixed inset-0 w-full h-full z-0"
    />
  );
}
