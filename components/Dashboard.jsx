'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  BASEMAP_LAYERS,
  EXTERNAL_GIS_ENDPOINTS,
  DATA_SOURCE_AGENCIES,
  SUMATRA_COASTAL_MODELS,
} from '@/lib/h3HexEngine';
import { useEvacuationRoute } from '@/hooks/useEvacuationRoute';
import { useHazard, useShelters } from '@/hooks/useMapData';
import { useMaritime } from '@/hooks/useMaritime';
import { EMERGENCY_CONTACTS } from '@/lib/shared';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#040911] text-cyan-300 text-xs font-mono">
      Memuat Peta Evakuasi COASTAL-RESCUE...
    </div>
  ),
});

export default function Dashboard() {
  const [cityId, setCityId] = useState('padang');
  const [resolution, setResolution] = useState('fine');
  const [magnitude, setMagnitude] = useState(8.6);
  const [timelineMin, setTimelineMin] = useState(28);
  const [isPlaying, setIsPlaying] = useState(false);

  // Gambar 4: Panel kontrol kiri dapat ditutup ke samping kiri lalu dibuka ke kanan
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Gambar 2: Basemap Switcher State: 'satellite' | 'street' (Esri World Street Map)
  const [basemap, setBasemap] = useState('satellite');

  // Layer Controls State
  const [layers, setLayers] = useState({
    hexFill: true,
    hexBorders: true,
    urbanDots: true,
    evacRoute: true,
    shelters: true,
    inariskTsunami: true,
    usgsEarthquakes: true,
  });

  // InaRISK BNPB ImageServer Opacity & Health Status
  const [inariskOpacity, setInariskOpacity] = useState(0.6);
  const [inariskStatus, setInariskStatus] = useState({
    state: 'loading',
    message: 'Menghubungkan ke InaRISK BNPB...',
  });

  // USGS Earthquake API Status & Manual Refresh Trigger
  const [usgsStatus, setUsgsStatus] = useState({
    state: 'loading',
    count: 0,
    lastUpdated: null,
    error: null,
  });
  const [usgsRefreshTrigger, setUsgsRefreshTrigger] = useState(0);

  // Simulasi & Inspector State
  const [originCoords, setOriginCoords] = useState(null);
  const [selectedShelterId, setSelectedShelterId] = useState(null);
  const [inspectedCell, setInspectedCell] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [simStats, setSimStats] = useState({
    maxCoastalWaveM: 6.79,
    totalExposedPopulation: 118400,
  });
  const [hexCount, setHexCount] = useState(0);

  // Gambar 6: Modal Sumber Informasi & Instansi Data
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const currentCity = SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang;
  const activePoint = useMemo(() => {
    const [lat, lon] = originCoords || currentCity.defaultOrigin;
    return { lat, lon };
  }, [originCoords, currentCity]);

  // Koneksi ke hook & API internal coastal-rescue-vercel
  const sheltersState = useShelters();
  const hazardState = useHazard(currentCity.name);
  const maritime = useMaritime();
  const evacuation = useEvacuationRoute();

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Playback Timeline Loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = null;
    let lastTime = performance.now();

    const tick = (now) => {
      const dtSec = (now - lastTime) / 1000;
      lastTime = now;

      setTimelineMin((prev) => {
        const next = prev + dtSec * 4.0;
        if (next >= 60) {
          setIsPlaying(false);
          return 60;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const handleSelectCity = (nextCityId) => {
    setCityId(nextCityId);
    setOriginCoords(null);
    setSelectedShelterId(null);
    setInspectedCell(null);
    if (evacuation.state.status !== 'idle') {
      evacuation.reset();
    }
  };

  const handleSelectOrigin = useCallback(
    (coords) => {
      setOriginCoords(coords);
      if (evacuation.state.status !== 'idle') {
        evacuation.reset();
      }
    },
    [evacuation]
  );

  const handleSelectShelter = useCallback(
    (shelterId, shelterObj) => {
      setSelectedShelterId(shelterId);
      if (shelterObj?.coords) {
        evacuation.requestRoute(activePoint, {
          id: shelterId,
          name: shelterObj.name,
          lat: shelterObj.coords[0],
          lon: shelterObj.coords[1],
          elevation_m: shelterObj.elevM,
        });
      }
    },
    [activePoint, evacuation]
  );

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSimulationUpdate = useCallback((payload) => {
    setHexCount(payload.hexCount);
    setSimStats(payload.simStats);
    setActiveRoute(payload.activeRoute);
  }, []);

  const getRiskBadgeClass = (riskClass) => {
    if (riskClass === 1) {
      return 'px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-950 text-red-200 border border-red-500/50';
    }
    if (riskClass === 2) {
      return 'px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-950 text-orange-200 border border-orange-500/50';
    }
    if (riskClass === 3) {
      return 'px-2 py-0.5 rounded text-[10px] font-extrabold bg-lime-950 text-lime-200 border border-lime-500/50';
    }
    return 'px-2 py-0.5 rounded text-[10px] font-extrabold bg-cyan-950 text-cyan-200 border border-cyan-500/50';
  };

  const getTimelinePhaseNote = () => {
    if (timelineMin === 0) {
      return `Gempa M ${magnitude.toFixed(1)} terjadi (ETA gelombang: ${currentCity.etaMinutes} mnt)`;
    }
    if (timelineMin < currentCity.etaMinutes) {
      return `Gelombang mendekati pantai (${Math.round(currentCity.etaMinutes - timelineMin)} mnt menuju ETA)`;
    }
    return `Gelombang tinggi (${simStats.maxCoastalWaveM}m) merendam pesisir & muara!`;
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* FULL-VIEWPORT LEAFLET WEBGIS MAP */}
      <MapView
        cityId={cityId}
        resolution={resolution}
        magnitude={magnitude}
        timelineMin={timelineMin}
        basemap={basemap}
        layers={layers}
        inariskOpacity={inariskOpacity}
        usgsRefreshTrigger={usgsRefreshTrigger}
        originCoords={originCoords}
        selectedShelterId={selectedShelterId}
        externalShelters={sheltersState.items}
        roadRouteGeoJson={evacuation.state.status === 'found' ? evacuation.state.route : null}
        apiHazardZones={hazardState.status === 'ready' ? hazardState.zones : null}
        onSelectOrigin={handleSelectOrigin}
        onSelectShelter={handleSelectShelter}
        onInspectCell={setInspectedCell}
        onSimulationUpdate={handleSimulationUpdate}
        onInariskStatusChange={setInariskStatus}
        onUsgsStatusChange={setUsgsStatus}
        onNotify={showToast}
      />

      {/* TOP FLOATING WORKSTATION BAR */}
      <header className="fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Brand Identity dengan Logo Aplikasi (Gambar 3) + Toggle Panel */}
        <div className="glass-hud rounded-2xl px-3 py-2 flex items-center gap-2.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Tutup Panel ke Samping Kiri' : 'Buka Panel ke Kanan'}
            aria-label={sidebarOpen ? 'Tutup Panel ke Samping Kiri' : 'Buka Panel ke Kanan'}
            className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/35 transition cursor-pointer"
          >
            {sidebarOpen ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Gambar 3: Logo di samping COASTAL-RESCUE menjadi logo aplikasi */}
            <div className="w-9 h-9 rounded-full bg-white p-0.5 border border-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.35)] flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/assets/team-logo.png"
                alt="Logo Aplikasi COASTAL-RESCUE"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold tracking-wider text-white">
                  COASTAL-<span className="text-cyan-400">RESCUE</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-400/35">
                  SUMATRA WEBGIS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">
                Pemodelan Spasial Dampak Tsunami &amp; Alur Evakuasi Pesisir
              </p>
            </div>
          </div>
        </div>

        {/* Center: 5 Sumatra Coastal Cities Selector */}
        <nav
          aria-label="Pilih Kota Pesisir Sumatra"
          className="glass-hud rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto max-w-full pointer-events-auto"
        >
          {Object.values(SUMATRA_COASTAL_MODELS).map((city) => {
            const active = city.id === cityId;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelectCity(city.id)}
                className={
                  active
                    ? 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-orange-500 text-slate-950 shadow-md transition whitespace-nowrap cursor-pointer'
                    : 'px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition whitespace-nowrap cursor-pointer'
                }
              >
                {city.name}
              </button>
            );
          })}
        </nav>

        {/* Gambar 6: Cukup menampilkan darimana informasi dan data diambil (Instansi) */}
        <div className="glass-hud rounded-2xl p-1.5 flex items-center pointer-events-auto">
          <button
            type="button"
            onClick={() => setSourcesModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-100 border border-cyan-400/30 transition cursor-pointer"
            title="Lihat instansi dan sumber pengambilan data"
          >
            <svg className="w-4 h-4 text-cyan-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-left">
              <span className="block text-[10px] uppercase tracking-wider text-cyan-300 font-bold leading-tight">
                Sumber Data &amp; Instansi
              </span>
              <span className="block text-[10px] text-slate-300 leading-tight">
                BMKG • BNPB • BIG • Basarnas • USGS • NOAA
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* FLOATING TOP-RIGHT BASEMAP SWITCHER WIDGET (SATELLITE / STREET) */}
      <div
        aria-label="Pemilih Peta Dasar (Basemap Switcher)"
        className="fixed top-20 right-3 z-20 glass-hud rounded-2xl p-1.5 flex items-center gap-1 shadow-xl"
      >
        <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
          Basemap:
        </span>
        {Object.values(BASEMAP_LAYERS).map((bm) => {
          const isActive = basemap === bm.id;
          return (
            <button
              key={bm.id}
              type="button"
              onClick={() => {
                setBasemap(bm.id);
                showToast(`Peta dasar beralih ke ${bm.label} (${bm.provider}).`);
              }}
              className={
                isActive
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-cyan-500 text-slate-950 shadow transition cursor-pointer'
                  : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer'
              }
            >
              {bm.id === 'satellite' ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              )}
              <span>{bm.label}</span>
            </button>
          );
        })}
      </div>

      {/* Gambar 4: Tab di sisi kiri layar untuk membuka kembali panel ke kanan */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          title="Buka Panel Kontrol ke Kanan"
          aria-label="Buka Panel Kontrol ke Kanan"
          className="fixed top-1/2 -translate-y-1/2 left-0 z-30 glass-hud rounded-r-2xl rounded-l-none border-l-0 px-2.5 py-4 flex flex-col items-center gap-1.5 text-cyan-300 hover:text-white hover:bg-cyan-500/20 shadow-2xl transition cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-extrabold uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
            Buka Panel
          </span>
        </button>
      )}

      {/* COLLAPSIBLE LEFT FLOATING CONTROL & INSPECTOR SIDEBAR (Gambar 4) */}
      <aside
        className={`fixed top-20 left-3 bottom-3 w-[340px] sm:w-[375px] z-20 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+20px)]'
        }`}
      >
        {/* Handle Tab di Tepi Kanan Panel untuk Menutup Panel ke Samping Kiri */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          title="Tutup Panel ke Samping Kiri"
          aria-label="Tutup Panel ke Samping Kiri"
          className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -right-7 z-30 w-7 h-16 glass-hud rounded-r-xl rounded-l-none border-l-0 items-center justify-center text-cyan-300 hover:text-white hover:bg-cyan-500/25 shadow-lg transition cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="glass-hud w-full h-full rounded-2xl flex flex-col overflow-hidden">
          {/* Sidebar Header */}
          <div className="px-4 py-2.5 border-b border-cyan-500/20 bg-[#081220]/70 flex items-center justify-between shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping shrink-0" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-white truncate">
                {currentCity.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                {hexCount} sel
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                title="Tutup ke Samping Kiri"
                className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/50 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Controls Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
            {/* 1. Live Zone & Evacuation Inspector Card */}
            <div className="glass-subcard rounded-xl p-3 border-cyan-400/30 bg-gradient-to-br from-[#081220]/90 to-[#040911]/90">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" />
                  </svg>
                  Inspector Zona &amp; Evakuasi
                </span>
                <span className={getRiskBadgeClass(inspectedCell?.riskClass || 1)}>
                  {inspectedCell?.classLabel || 'Kelas 1 • Rendaman Ekstrem'}
                </span>
              </div>

              {/* Gambar 5: Unsur H3 Cell Index tetap ada di kode & data, namun disembunyikan dari antarmuka */}
              <div
                aria-hidden="true"
                className="hidden items-center justify-between bg-[#040911]/90 px-2.5 py-1.5 rounded-lg border border-slate-700/70 mb-2"
              >
                <span className="text-[10px] text-slate-400">H3 Cell Index:</span>
                <span className="text-xs font-mono font-bold text-cyan-300 tracking-wide">
                  {inspectedCell?.h3Index || '896528a31b7ffff'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
                <div className="bg-[#040911]/65 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Elevasi DEM</span>
                  <span className="font-mono font-bold text-slate-100">
                    {inspectedCell ? `${inspectedCell.elevationM.toFixed(1)} mdpl` : '2.4 mdpl'}
                  </span>
                </div>
                <div className="bg-[#040911]/65 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Kedalaman Genangan</span>
                  <span className="font-mono font-bold text-orange-400">
                    {inspectedCell
                      ? inspectedCell.inundationDepthM > 0
                        ? `${inspectedCell.inundationDepthM.toFixed(2)} m`
                        : '0.00 m (Aman)'
                      : '3.45 m'}
                  </span>
                </div>
                <div className="bg-[#040911]/65 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Bangunan Terpapar</span>
                  <span className="font-mono font-bold text-amber-300">
                    {inspectedCell ? `${inspectedCell.exposedBuildings} unit` : '142 unit'}
                  </span>
                </div>
                <div className="bg-[#040911]/65 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Alur Evakuasi Jalan</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {activeRoute
                      ? `${activeRoute.distanceKm.toFixed(2)} km • ${activeRoute.walkMinutes} mnt`
                      : '2.80 km • 34 mnt'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-teal-950/45 border border-teal-500/30 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                <span className="truncate">
                  Tujuan TES:{' '}
                  <strong className="text-teal-300">
                    {activeRoute?.shelter?.name || currentCity.shelters[0].name}
                  </strong>
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">Klik peta/TES</span>
              </div>
            </div>

            {/* 2. Simulasi Magnitudo & Timeline Penjalaran Gelombang */}
            <div className="glass-subcard rounded-xl p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="sliderMagnitude" className="text-xs font-semibold text-slate-200">
                    Magnitudo Gempa Megathrust
                  </label>
                  <span className="text-xs font-mono font-extrabold text-orange-300 bg-[#040911] px-2 py-0.5 rounded border border-orange-500/30">
                    M {magnitude.toFixed(1)}
                  </span>
                </div>
                <input
                  id="sliderMagnitude"
                  type="range"
                  min="7.0"
                  max="9.0"
                  step="0.1"
                  value={magnitude}
                  onChange={(e) => setMagnitude(parseFloat(e.target.value))}
                  className="gis-slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>M 7.0</span>
                  <span>M 8.0</span>
                  <span>M 9.0</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <label htmlFor="sliderTimeline" className="text-xs font-semibold text-slate-200 block">
                      Timeline Kedatangan Gelombang
                    </label>
                    <span className="text-[10px] text-cyan-300">{getTimelinePhaseNote()}</span>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-white bg-cyan-500/20 px-2 py-1 rounded-lg border border-cyan-400/40">
                    T+{Math.round(timelineMin)} mnt
                  </span>
                </div>

                <input
                  id="sliderTimeline"
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={Math.round(timelineMin)}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setTimelineMin(parseFloat(e.target.value));
                  }}
                  className="gis-slider my-1.5"
                />

                <div className="flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (timelineMin >= 60) setTimelineMin(0);
                      setIsPlaying((p) => !p);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-400 text-slate-950 shadow transition cursor-pointer"
                  >
                    <span>{isPlaying ? 'Jeda Simulasi' : 'Putar Simulasi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setTimelineMin(0);
                    }}
                    className="py-1.5 px-3 rounded-xl text-xs font-semibold bg-[#122642] hover:bg-slate-700 text-slate-200 border border-slate-600/40 transition cursor-pointer"
                  >
                    T+0
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Resolusi Grid & Layer Geospasial */}
            <div className="glass-subcard rounded-xl p-3 space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Resolusi Grid Analisis
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'fine', label: 'Fine (~280m)' },
                    { key: 'medium', label: 'Medium (~420m)' },
                    { key: 'coarse', label: 'Coarse (~650m)' },
                  ].map((item) => {
                    const active = resolution === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setResolution(item.key);
                          setInspectedCell(null);
                          showToast(`Resolusi analisis diubah ke ${item.label}.`);
                        }}
                        className={
                          active
                            ? 'py-1.5 px-2 rounded-lg text-[11px] font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-400/45 cursor-pointer'
                            : 'py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-[#081220] text-slate-300 border border-slate-700 hover:border-cyan-400/35 cursor-pointer'
                        }
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layer Eksternal: InaRISK BNPB & USGS */}
              <div className="pt-2 border-t border-slate-700/50 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 block">
                  Layer Data Instansi Eksternal
                </span>

                {/* InaRISK BNPB ImageServer */}
                <div className="bg-[#040911]/75 rounded-lg p-2.5 border border-slate-800 space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-slate-100 font-semibold block">
                        InaRISK BNPB — Bahaya Tsunami
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Badan Nasional Penanggulangan Bencana (100m)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers.inariskTsunami}
                      onChange={() => handleToggleLayer('inariskTsunami')}
                      className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                    />
                  </label>

                  {layers.inariskTsunami && (
                    <div className="space-y-1 pt-1 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Opasitas Layer InaRISK:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {Math.round(inariskOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={inariskOpacity}
                        onChange={(e) => setInariskOpacity(parseFloat(e.target.value))}
                        className="gis-slider"
                      />
                      <p
                        className={`text-[10px] ${
                          inariskStatus.state === 'error' || inariskStatus.state === 'slow'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }`}
                      >
                        {inariskStatus.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* USGS Earthquake API */}
                <div className="bg-[#040911]/75 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={layers.usgsEarthquakes}
                        onChange={() => handleToggleLayer('usgsEarthquakes')}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                      <div>
                        <span className="text-slate-100 font-semibold block">
                          USGS Gempa Sumatra (M &ge; 4.5)
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          United States Geological Survey
                        </span>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setUsgsRefreshTrigger((c) => c + 1)}
                      title="Muat ulang data gempa USGS"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-cyan-300 border border-slate-700 cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>

                  {layers.usgsEarthquakes && (
                    <div className="text-[10px] flex items-center justify-between pt-1 border-t border-slate-800">
                      {usgsStatus.state === 'loading' && (
                        <span className="text-cyan-300">Memuat titik gempa USGS...</span>
                      )}
                      {usgsStatus.state === 'ready' && (
                        <span className="text-emerald-300">
                          {usgsStatus.count} titik gempa dimuat ({usgsStatus.lastUpdated})
                        </span>
                      )}
                      {usgsStatus.state === 'error' && (
                        <span className="text-amber-300">{usgsStatus.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Layer Spasial Model */}
              <div className="pt-2 border-t border-slate-700/50 space-y-1.5 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Kontrol Tampilan Peta
                </span>

                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-200">Zona Rendaman Tsunami</span>
                  <input
                    type="checkbox"
                    checked={layers.hexFill}
                    onChange={() => handleToggleLayer('hexFill')}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-200">Garis Batas Grid Analisis</span>
                  <input
                    type="checkbox"
                    checked={layers.hexBorders}
                    onChange={() => handleToggleLayer('hexBorders')}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-200">Titik Paparan Permukiman</span>
                  <input
                    type="checkbox"
                    checked={layers.urbanDots}
                    onChange={() => handleToggleLayer('urbanDots')}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-200">Alur Evakuasi Mengikuti Jalan</span>
                  <input
                    type="checkbox"
                    checked={layers.evacRoute}
                    onChange={() => handleToggleLayer('evacRoute')}
                    className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className="text-slate-200">Titik Shelter Evakuasi (TES)</span>
                  <input
                    type="checkbox"
                    checked={layers.shelters}
                    onChange={() => handleToggleLayer('shelters')}
                    className="w-4 h-4 accent-teal-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 4. Status Telemetri Maritim BMKG & Rute Jalan */}
            <div className="glass-subcard rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  Status Maritim (BMKG &amp; Open-Meteo)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-400/30">
                  {maritime.data.alert}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-[#040911]/70 rounded-lg py-1.5 px-2 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Gelombang</span>
                  <span className="font-mono font-bold text-slate-100">
                    {maritime.data.wave == null ? '—' : `${maritime.data.wave} m`}
                  </span>
                </div>
                <div className="bg-[#040911]/70 rounded-lg py-1.5 px-2 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Angin</span>
                  <span className="font-mono font-bold text-slate-100">
                    {maritime.data.wind == null ? '—' : `${maritime.data.wind} km/j`}
                  </span>
                </div>
                <div className="bg-[#040911]/70 rounded-lg py-1.5 px-2 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Pasang</span>
                  <span className="font-mono font-bold text-slate-100">
                    {maritime.data.tide ?? '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => evacuation.requestNearest(activePoint)}
                  disabled={evacuation.state.status === 'searching'}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-teal-600/80 hover:bg-teal-500 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {evacuation.state.status === 'searching'
                    ? 'Mencari Rute Shelter...'
                    : 'Cari Rute Jalan Shelter Terdekat'}
                </button>
                {evacuation.state.status === 'found' && (
                  <button
                    type="button"
                    onClick={evacuation.reset}
                    className="py-1.5 px-2 rounded-lg text-[11px] bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {evacuation.state.status === 'found' && (
                <div className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                  Rute Jalan ke <strong>{evacuation.state.shelter?.name}</strong>:{' '}
                  {evacuation.state.summary?.distance_km} km (Mobil {evacuation.state.summary?.drive_min} mnt / Jalan{' '}
                  {evacuation.state.summary?.walk_min} mnt)
                </div>
              )}
            </div>

            {/* 5. Legenda 4 Kelas Risiko & Ringkasan Sumber Data Instansi */}
            <div className="glass-subcard rounded-xl p-3 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Klasifikasi Zona Bahaya (4 Kelas)
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-slate-500/50"
                    style={{ background: 'rgba(127, 29, 29, 0.85)' }}
                  />
                  <span className="text-slate-200">
                    <strong>Kelas 1:</strong> Laut &amp; Rendaman Ekstrem (&gt;3.0m)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-slate-500/50"
                    style={{ background: 'rgba(234, 88, 12, 0.82)' }}
                  />
                  <span className="text-slate-200">
                    <strong>Kelas 2:</strong> Bahaya Tinggi &amp; Urban Terpapar (0.5–3m)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-slate-500/50"
                    style={{ background: 'rgba(101, 163, 13, 0.72)' }}
                  />
                  <span className="text-slate-200">
                    <strong>Kelas 3:</strong> Penyangga / Daratan Sedang (5–18 mdpl)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0 border border-slate-500/50"
                    style={{ background: 'rgba(6, 182, 212, 0.78)' }}
                  />
                  <span className="text-slate-200">
                    <strong>Kelas 4:</strong> Klaster Zona Aman &amp; TES (&gt;18 mdpl)
                  </span>
                </div>
              </div>

              {/* Gambar 6: Sumber Data & Instansi */}
              <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Sumber Informasi &amp; Data Instansi
                  </span>
                  <button
                    type="button"
                    onClick={() => setSourcesModalOpen(true)}
                    className="text-[10px] font-semibold text-orange-300 hover:underline cursor-pointer"
                  >
                    Lihat Semua Instansi →
                  </button>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Data diambil dari: <strong>BMKG</strong> (Gempa &amp; Tsunami),{' '}
                  <strong>BNPB InaRISK</strong> (Bahaya Tsunami), <strong>BIG Ina-Geoportal</strong>{' '}
                  (DEMNAS &amp; Garis Pantai), <strong>Basarnas/BPBD</strong> (Shelter TES),{' '}
                  <strong>USGS</strong>, <strong>NOAA</strong>, <strong>GEBCO</strong>, &amp;{' '}
                  <strong>OSRM</strong> (Jaringan Jalan).
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {EMERGENCY_CONTACTS.map(({ name, no }) => (
                    <a
                      key={`${name}-${no}`}
                      href={`tel:${no}`}
                      className="px-2 py-0.5 rounded bg-[#040911]/80 border border-slate-800 text-[10px] text-slate-300 hover:border-cyan-400/40"
                    >
                      {name}: <strong className="text-cyan-300">{no}</strong>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* BOTTOM-RIGHT SUMMARY HUD */}
      <div className="fixed bottom-3 right-14 z-20 hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl glass-hud text-[11px] text-slate-200">
        <div>
          <span className="text-slate-400">Populasi Terpapar:</span>
          <strong className="font-mono text-orange-400 ml-1">
            {simStats.totalExposedPopulation.toLocaleString('id-ID')} jiwa
          </strong>
        </div>
        <span className="text-slate-600">|</span>
        <div>
          <span className="text-slate-400">Jarak Jalur Jalan:</span>
          <strong className="font-mono text-cyan-300 ml-1">
            {activeRoute ? `${activeRoute.distanceKm.toFixed(2)} km` : '2.84 km'}
          </strong>
        </div>
      </div>

      {/* Gambar 6: MODAL SUMBER DATA & INSTANSI PENYEDIA INFORMASI */}
      {sourcesModalOpen && (
        <div
          onClick={() => setSourcesModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-hud w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-cyan-400/40 shadow-2xl"
          >
            <div className="px-5 py-3.5 border-b border-cyan-500/20 bg-[#081220]/90 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Sumber Informasi &amp; Instansi Data COASTAL-RESCUE
                </h2>
                <p className="text-xs text-slate-400">
                  Daftar instansi resmi dan lembaga penyedia data geospasial, kebencanaan, serta jaringan jalan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSourcesModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
              {DATA_SOURCE_AGENCIES.map((item) => (
                <div key={item.id} className="glass-subcard rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-cyan-300 text-sm">{item.agency}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-400/35 shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-white mb-1">{item.dataset}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              ))}

              <div className="glass-subcard rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300 block">
                  Layanan Peta Langsung (Live Data Stream)
                </span>
                {Object.values(EXTERNAL_GIS_ENDPOINTS).map((ep) => (
                  <div key={ep.id} className="bg-[#040911]/85 p-2.5 rounded-lg border border-slate-800">
                    <div className="font-bold text-white">{ep.name}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{ep.format}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NON-BLOCKING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2 rounded-xl glass-hud border border-cyan-400/45 text-xs font-medium text-cyan-100 shadow-xl">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
