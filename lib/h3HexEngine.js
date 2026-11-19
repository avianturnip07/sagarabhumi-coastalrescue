/**
 * ============================================================================
 * COASTAL-RESCUE — H3 HEXAGONAL SPATIAL ENGINE, A* ROUTER & EXTERNAL GIS CONFIG
 * ============================================================================
 */

export const BASEMAP_LAYERS = {
  satellite: {
    id: 'satellite',
    label: 'Satellite Map',
    shortLabel: 'Satellite',
    provider: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics | COASTAL-RESCUE H3 GIS',
    maxZoom: 19,
  },
  street: {
    id: 'street',
    label: 'Street Map',
    shortLabel: 'Street',
    provider: 'Esri World Street Map',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, TomTom, Garmin, FAO, NOAA, USGS | COASTAL-RESCUE GIS',
    maxZoom: 19,
  },
};

export const EXTERNAL_GIS_ENDPOINTS = {
  inariskTsunami: {
    id: 'inarisk_bnpb',
    name: 'InaRISK BNPB — Layer Bahaya Tsunami',
    endpoint:
      'https://gis.bnpb.go.id/server/rest/services/inarisk/layer_bahaya_tsunami/ImageServer',
    format: 'ArcGIS ImageServer (Resolusi pixel 100 meter, nilai raster 0–1)',
    coverage: 'Seluruh Wilayah Pesisir Indonesia',
  },
  usgsEarthquake: {
    id: 'usgs_quakes',
    name: 'USGS Earthquake API — Titik Gempa Sumatra (M >= 4.5)',
    endpoint:
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-6&maxlatitude=6&minlongitude=94&maxlongitude=108&minmagnitude=4.5&limit=500&orderby=time',
    format: 'GeoJSON Feed Real-Time (BBox Sumatra: 6°LU–6°LS, 94°BT–108°BT)',
    coverage: 'Zona Subduksi Megathrust Sumatra & Sesar Mentawai',
  },
};


export const DATA_SOURCE_AGENCIES = [
  {
    id: 'bmkg',
    agency: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
    dataset: 'Informasi Gempa Bumi Terkini & Status Potensi Tsunami',
    badge: 'Instansi Resmi RI',
    description:
      'Sumber data parameter gempa bumi terbaru di Indonesia (data.bmkg.go.id) serta status peringatan dini potensi tsunami untuk wilayah pesisir Sumatra.',
  },
  {
    id: 'bnpb',
    agency: 'BNPB (Badan Nasional Penanggulangan Bencana — InaRISK)',
    dataset: 'Peta Spasial Indeks Bahaya Tsunami Nasional',
    badge: 'Instansi Resmi RI',
    description:
      'Layanan peta bahaya tsunami resmi BNPB (gis.bnpb.go.id) dengan resolusi spasial 100 meter untuk pemetaan zona kerentanan pesisir.',
  },
  {
    id: 'big',
    agency: 'BIG (Badan Informasi Geospasial — Ina-Geoportal)',
    dataset: 'DEMNAS, Garis Pantai & Batas Administrasi Pesisir',
    badge: 'Instansi Resmi RI',
    description:
      'Referensi data geospasial dasar nasional berupa garis pantai skala besar dan Digital Elevation Model Nasional (DEMNAS) untuk penentuan zona aman (>18 mdpl).',
  },
  {
    id: 'basarnas',
    agency: 'Basarnas & BPBD Provinsi/Kota',
    dataset: 'Titik Tempat Evakuasi Sementara (TES) & Kontak Darurat SAR',
    badge: 'Instansi SAR & Daerah',
    description:
      'Referensi lokasi shelter/bukit evakuasi pesisir (Padang, Banda Aceh, Bengkulu, Sibolga, Bandar Lampung) serta saluran panggilan darurat 115.',
  },
  {
    id: 'usgs',
    agency: 'USGS (United States Geological Survey)',
    dataset: 'Katalog Real-Time Gempa Tektonik Sumatra (M >= 4.5)',
    badge: 'Lembaga Geologi',
    description:
      'Umpan data seismik real-time (earthquake.usgs.gov) untuk memetakan episenter, magnitudo, dan kedalaman gempa di sepanjang zona subduksi Sumatra.',
  },
  {
    id: 'noaa',
    agency: 'NOAA (National Oceanic and Atmospheric Administration)',
    dataset: 'Database Historis Tsunami & Tinggi Run-Up',
    badge: 'Lembaga Kelautan',
    description:
      'Katalog kejadian tsunami historis Samudra Hindia & Selat Sunda dari NCEI/NOAA sebagai referensi kalibrasi skenario magnitudo M 7.0–9.0.',
  },
  {
    id: 'gebco',
    agency: 'GEBCO (General Bathymetric Chart of the Oceans)',
    dataset: 'Model Batimetri & Kedalaman Dasar Laut',
    badge: 'Konsorsium Batimetri',
    description:
      'Data topografi dasar laut (bathymetry grid) Samudra Hindia untuk pemodelan penjalaran gelombang tsunami menuju daratan pesisir.',
  },
  {
    id: 'osrm_meteo',
    agency: 'OSRM & Open-Meteo Marine',
    dataset: 'Jaringan Jalan Raya & Prakiraan Gelombang/Angin Pesisir',
    badge: 'Jaringan Jalan & Maritim',
    description:
      'Data jaringan jalan raya untuk menyesuaikan alur evakuasi darat menuju shelter serta prakiraan tinggi gelombang laut dan angin pesisir.',
  },
];

export const SCIENTIFIC_DATA_METADATA = [
  {
    id: 'noaa',
    title: 'NOAA Tsunami Database',
    agency: 'National Centers for Environmental Information (NCEI / NOAA)',
    badge: 'Katalog Historis & Run-Up',
    description:
      'Referensi katalog tsunami historis Samudra Hindia & Selat Sunda, koordinat sumber kejadian, waktu tiba gelombang (ETA), serta tinggi run-up maksimum untuk kalibrasi skenario magnitudo M 7.0–9.0.',
  },
  {
    id: 'gebco',
    title: 'GEBCO Bathymetry',
    agency: 'General Bathymetric Chart of the Oceans (GEBCO Grid)',
    badge: 'Batimetri GeoTIFF/NetCDF',
    description:
      'Referensi data elevasi/kedalaman dasar laut Sumatra (GeoTIFF/NetCDF) sebagai dasar pemodelan shoaling dan penjalaran gelombang tsunami menuju daratan pesisir.',
  },
  {
    id: 'big',
    title: 'Ina-Geoportal BIG',
    agency: 'Badan Informasi Geospasial (BIG) Republik Indonesia',
    badge: 'DEMNAS & Garis Pantai',
    description:
      'Referensi data geospasial dasar Indonesia meliputi garis pantai skala besar, batas administrasi pesisir, dan Digital Elevation Model Nasional (DEMNAS) untuk penentuan zona aman (>18 mdpl).',
  },
];

/**
 * ============================================================================
 * 1. DATA PROFIL TOPOGRAFI, PELABUHAN, MUARA & SHELTER 5 KOTA PESISIR SUMATRA
 * ============================================================================
 */
export const SUMATRA_COASTAL_MODELS = {
  padang: {
    id: 'padang',
    name: 'Padang',
    subtitle: 'PADANG — TELUK BAYUR & MUARA',
    center: [-0.946, 100.368],
    zoom: 13,
    seaSide: 'west',
    defaultOrigin: [-0.9635, 100.3535],
    etaMinutes: 20,
    coastLngAtLat(lat) {
      return 100.3525 + (-0.945 - lat) * 0.14 + 0.0022 * Math.sin((lat + 0.945) * 95);
    },
    riverCorridors: [
      { p1: [-0.964, 100.351], p2: [-0.9685, 100.382], widthKm: 0.42 },
      { p1: [-0.9355, 100.349], p2: [-0.931, 100.384], widthKm: 0.36 },
    ],
    highGroundHills: [
      { center: [-0.9165, 100.3715], radiusKm: 1.05, peakElevM: 34 },
      { center: [-0.969, 100.3635], radiusKm: 0.95, peakElevM: 42 },
      { center: [-0.933, 100.402], radiusKm: 1.55, peakElevM: 38 },
      { center: [-0.954, 100.399], radiusKm: 1.35, peakElevM: 31 },
    ],
    shelters: [
      { id: 'pdg-tes-1', name: 'TES Gunung Pangilun', coords: [-0.9175, 100.371], elevM: 28, capacity: 2400 },
      { id: 'pdg-tes-2', name: 'TES Bukit Gado-Gado', coords: [-0.9685, 100.363], elevM: 36, capacity: 2100 },
      { id: 'pdg-tes-3', name: 'TES Escape Building Darussalam', coords: [-0.9225, 100.3675], elevM: 22, capacity: 1800 },
      { id: 'pdg-tes-4', name: 'TES Zona Aman ByPass Kuranji', coords: [-0.934, 100.3985], elevM: 29, capacity: 3500 },
      { id: 'pdg-tes-5', name: 'TES Dataran Tinggi Lubuk Begalung', coords: [-0.9535, 100.3965], elevM: 25, capacity: 3000 },
    ],
  },

  banda_aceh: {
    id: 'banda_aceh',
    name: 'Banda Aceh',
    subtitle: 'BANDA ACEH — ULEE LHEUE & KRUENG ACEH',
    center: [5.554, 95.316],
    zoom: 13,
    seaSide: 'northwest',
    defaultOrigin: [5.5655, 95.2945],
    etaMinutes: 24,
    coastLatAtLng(lng) {
      return 5.566 + (lng - 95.3) * 0.72 + 0.0025 * Math.sin((lng - 95.3) * 120);
    },
    riverCorridors: [
      { p1: [5.586, 95.319], p2: [5.534, 95.3245], widthKm: 0.45 },
      { p1: [5.564, 95.291], p2: [5.549, 95.301], widthKm: 0.48 },
    ],
    highGroundHills: [
      { center: [5.522, 95.294], radiusKm: 1.25, peakElevM: 36 },
      { center: [5.525, 95.311], radiusKm: 1.05, peakElevM: 26 },
      { center: [5.52, 95.334], radiusKm: 1.25, peakElevM: 28 },
      { center: [5.548, 95.358], radiusKm: 1.2, peakElevM: 27 },
    ],
    shelters: [
      { id: 'ach-tes-1', name: 'TES Perbukitan Mata Ie', coords: [5.5235, 95.2945], elevM: 32, capacity: 3200 },
      { id: 'ach-tes-2', name: 'TES Escape Building TDMRC Ulee Lheue', coords: [5.5465, 95.2985], elevM: 21, capacity: 1600 },
      { id: 'ach-tes-3', name: 'TES Zona Aman Ketapang', coords: [5.526, 95.3105], elevM: 24, capacity: 2200 },
      { id: 'ach-tes-4', name: 'TES Dataran Tinggi Lampeuneurut', coords: [5.5225, 95.3335], elevM: 25, capacity: 2800 },
      { id: 'ach-tes-5', name: 'TES Bukit Ulee Kareng', coords: [5.5485, 95.356], elevM: 24, capacity: 2500 },
    ],
  },

  bengkulu: {
    id: 'bengkulu',
    name: 'Bengkulu',
    subtitle: 'BENGKULU — PANTAI PANJANG & PULAU BAAI',
    center: [-3.806, 102.274],
    zoom: 13,
    seaSide: 'west',
    defaultOrigin: [-3.8095, 102.256],
    etaMinutes: 22,
    coastLngAtLat(lat) {
      return 102.256 + (-3.81 - lat) * 0.44 + 0.002 * Math.cos((lat + 3.81) * 90);
    },
    riverCorridors: [
      { p1: [-3.77, 102.241], p2: [-3.766, 102.275], widthKm: 0.4 },
      { p1: [-3.836, 102.268], p2: [-3.829, 102.296], widthKm: 0.36 },
    ],
    highGroundHills: [
      { center: [-3.798, 102.294], radiusKm: 1.25, peakElevM: 32 },
      { center: [-3.774, 102.285], radiusKm: 1.15, peakElevM: 29 },
      { center: [-3.824, 102.306], radiusKm: 1.35, peakElevM: 35 },
    ],
    shelters: [
      { id: 'bkl-tes-1', name: 'TES Dataran Tinggi Lingkar Timur', coords: [-3.7985, 102.2925], elevM: 29, capacity: 2600 },
      { id: 'bkl-tes-2', name: 'TES Bukit Sawah Lebar', coords: [-3.776, 102.2835], elevM: 26, capacity: 2200 },
      { id: 'bkl-tes-3', name: 'TES Zona Aman Selebar', coords: [-3.823, 102.3035], elevM: 31, capacity: 3000 },
      { id: 'bkl-tes-4', name: 'TES Balai Raya Tinggi Semarak', coords: [-3.792, 102.2765], elevM: 21, capacity: 1800 },
    ],
  },

  sibolga: {
    id: 'sibolga',
    name: 'Sibolga',
    subtitle: 'SIBOLGA — PELABUHAN & PERBUKITAN AEK HABIL',
    center: [1.7395, 98.7865],
    zoom: 14,
    seaSide: 'west',
    defaultOrigin: [1.739, 98.7765],
    etaMinutes: 21,
    coastLngAtLat(lat) {
      return 98.7775 + (1.74 - lat) * 0.38 + 0.0018 * Math.sin((lat - 1.74) * 140);
    },
    riverCorridors: [
      { p1: [1.7425, 98.776], p2: [1.745, 98.793], widthKm: 0.25 },
      { p1: [1.7245, 98.783], p2: [1.7235, 98.801], widthKm: 0.3 },
    ],
    highGroundHills: [
      { center: [1.7485, 98.7885], radiusKm: 0.85, peakElevM: 56 },
      { center: [1.7335, 98.7955], radiusKm: 0.95, peakElevM: 48 },
      { center: [1.7185, 98.802], radiusKm: 0.95, peakElevM: 44 },
    ],
    shelters: [
      { id: 'sbg-tes-1', name: 'TES Bukit Ketapang', coords: [1.7465, 98.7875], elevM: 45, capacity: 2200 },
      { id: 'sbg-tes-2', name: 'TES Panomboman / Tangga Seratus', coords: [1.7505, 98.786], elevM: 52, capacity: 2500 },
      { id: 'sbg-tes-3', name: 'TES Perbukitan Aek Habil', coords: [1.7335, 98.7935], elevM: 38, capacity: 2400 },
      { id: 'sbg-tes-4', name: 'TES Bukit Sarudik Timur', coords: [1.72, 98.7995], elevM: 36, capacity: 2000 },
    ],
  },

  bandar_lampung: {
    id: 'bandar_lampung',
    name: 'Bandar Lampung',
    subtitle: 'BANDAR LAMPUNG — TELUK BETUNG & PANJANG',
    center: [-5.442, 105.268],
    zoom: 13,
    seaSide: 'south',
    defaultOrigin: [-5.4525, 105.2655],
    etaMinutes: 23,
    coastLatAtLng(lng) {
      return -5.452 - Math.max(0, lng - 105.268) * 0.45 + 0.0022 * Math.cos((lng - 105.265) * 110);
    },
    riverCorridors: [
      { p1: [-5.452, 105.265], p2: [-5.426, 105.267], widthKm: 0.38 },
      { p1: [-5.4535, 105.249], p2: [-5.43, 105.248], widthKm: 0.32 },
    ],
    highGroundHills: [
      { center: [-5.421, 105.257], radiusKm: 1.15, peakElevM: 42 },
      { center: [-5.418, 105.235], radiusKm: 1.25, peakElevM: 54 },
      { center: [-5.414, 105.286], radiusKm: 1.35, peakElevM: 35 },
      { center: [-5.442, 105.308], radiusKm: 1.05, peakElevM: 38 },
    ],
    shelters: [
      { id: 'bdl-tes-1', name: 'TES Bukit Randu Tanjung Karang', coords: [-5.4225, 105.2575], elevM: 36, capacity: 2800 },
      { id: 'bdl-tes-2', name: 'TES Dataran Tinggi Sukadanaham', coords: [-5.42, 105.2375], elevM: 46, capacity: 3200 },
      { id: 'bdl-tes-3', name: 'TES Zona Aman Sukarame', coords: [-5.4155, 105.285], elevM: 31, capacity: 3000 },
      { id: 'bdl-tes-4', name: 'TES Perbukitan Panjang Utara', coords: [-5.4425, 105.3065], elevM: 33, capacity: 2100 },
    ],
  },
};

/**
 * ============================================================================
 * 2. HEXAGONAL SPATIAL GRID ENGINE (HexTsunamiGridEngine)
 * ============================================================================
 */
export class HexTsunamiGridEngine {
  constructor() {
    this.resolutions = {
      fine: { radiusM: 280, label: 'Fine (~280m)', h3ResPrefix: '89', spanKm: 6.2 },
      medium: { radiusM: 420, label: 'Medium (~420m)', h3ResPrefix: '88', spanKm: 6.8 },
      coarse: { radiusM: 650, label: 'Coarse (~650m)', h3ResPrefix: '87', spanKm: 7.5 },
    };
    this.cells = [];
    this.cellMap = new Map();
    this.rows = 0;
    this.cols = 0;
  }

  generateH3CellId(cityIdx, resPrefix, row, col) {
    const baseCodes = ['6528a', '6528b', '6528c', '6528d', '6528e'];
    const base = baseCodes[cityIdx % baseCodes.length];
    const hashVal = ((row * 73856093) ^ (col * 19349663) ^ (cityIdx * 83492791)) >>> 0;
    const midHex = (hashVal & 0xffff).toString(16).padStart(4, '0');
    return `${resPrefix}${base}${midHex}ffff`;
  }

  distanceToSegmentKm(lat, lng, p1, p2) {
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const x = lng * 111.32 * cosLat;
    const y = lat * 111.32;
    const x1 = p1[1] * 111.32 * cosLat;
    const y1 = p1[0] * 111.32;
    const x2 = p2[1] * 111.32 * cosLat;
    const y2 = p2[0] * 111.32;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((x - x1) * dx + (y - y1) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(x - projX, y - projY);
  }

  haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  sampleTerrainAndUrban(city, lat, lng) {
    const cosLat = Math.cos((city.center[0] * Math.PI) / 180);
    let signedInlandKm = 0;

    if (city.seaSide === 'west') {
      const cLng = city.coastLngAtLat(lat);
      signedInlandKm = (lng - cLng) * 111.32 * cosLat;
    } else if (city.seaSide === 'northwest') {
      const cLat = city.coastLatAtLng(lng);
      signedInlandKm = (cLat - lat) * 111.32 * 0.85;
    } else if (city.seaSide === 'south') {
      const cLat = city.coastLatAtLng(lng);
      signedInlandKm = (lat - cLat) * 111.32;
    }

    let minRiverDistKm = 99;
    for (const r of city.riverCorridors) {
      const d = this.distanceToSegmentKm(lat, lng, r.p1, r.p2);
      if (d < minRiverDistKm) minRiverDistKm = d;
    }

    let elevationM = 0;
    if (signedInlandKm < 0) {
      elevationM = Math.max(-25, signedInlandKm * 7.5);
    } else {
      elevationM = 1.2 + signedInlandKm * 3.15;

      for (const hill of city.highGroundHills) {
        const distHill = this.haversineKm(lat, lng, hill.center[0], hill.center[1]);
        if (distHill < hill.radiusKm * 1.45) {
          const factor = Math.max(0, 1 - distHill / (hill.radiusKm * 1.45));
          elevationM += hill.peakElevM * Math.pow(factor, 1.4);
        }
      }

      if (minRiverDistKm < 0.55 && signedInlandKm < 3.8) {
        const riverCut = (1 - minRiverDistKm / 0.55) * 4.8;
        elevationM = Math.max(0.4, elevationM - riverCut);
      }

      const microRelief = 0.85 * Math.sin(lat * 950) * Math.cos(lng * 950);
      elevationM = Math.max(0.3, elevationM + microRelief);
    }

    let urbanDensity = 0;
    if (signedInlandKm > 0.05 && elevationM < 28) {
      const distCenter = this.haversineKm(lat, lng, city.center[0], city.center[1]);
      const urbanCore = Math.max(0, 1 - distCenter / 4.8);
      const blockNoise = 0.5 + 0.5 * Math.sin(lat * 1400 + lng * 800);
      urbanDensity = Math.min(1, Math.max(0.08, urbanCore * 0.75 + blockNoise * 0.35));
    }

    return {
      signedInlandKm,
      minRiverDistKm,
      elevationM: Number(elevationM.toFixed(1)),
      urbanDensity,
    };
  }

  buildGrid(cityId, resolutionKey = 'fine') {
    const cityKeys = Object.keys(SUMATRA_COASTAL_MODELS);
    const cityIdx = Math.max(0, cityKeys.indexOf(cityId));
    const city = SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang;
    const resCfg = this.resolutions[resolutionKey] || this.resolutions.fine;

    const R = resCfg.radiusM;
    const hexW = Math.sqrt(3) * R;
    const dx = hexW;
    const dy = 1.5 * R;

    const halfSpanM = (resCfg.spanKm * 1000) / 2;
    const cols = Math.floor((halfSpanM * 2) / dx) + 2;
    const rows = Math.floor((halfSpanM * 2) / dy) + 2;

    this.rows = rows;
    this.cols = cols;
    this.cells = [];
    this.cellMap.clear();

    const lat0 = city.center[0];
    const lng0 = city.center[1];
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);

    const startX = -((cols - 1) * dx) / 2;
    const startY = -((rows - 1) * dy) / 2;

    for (let r = 0; r < rows; r++) {
      const rowOffsetX = r % 2 !== 0 ? hexW / 2 : 0;
      for (let c = 0; c < cols; c++) {
        const cxM = startX + c * dx + rowOffsetX;
        const cyM = startY + r * dy;

        const centerLat = lat0 + cyM / metersPerDegLat;
        const centerLng = lng0 + cxM / metersPerDegLng;

        const vertices = [];
        for (let k = 0; k < 6; k++) {
          const angleRad = Math.PI / 6 + (k * Math.PI) / 3;
          const vxM = cxM + R * Math.cos(angleRad);
          const vyM = cyM + R * Math.sin(angleRad);
          vertices.push([
            lat0 + vyM / metersPerDegLat,
            lng0 + vxM / metersPerDegLng,
          ]);
        }

        const terrain = this.sampleTerrainAndUrban(city, centerLat, centerLng);
        const h3Index = this.generateH3CellId(cityIdx, resCfg.h3ResPrefix, r, c);

        const urbanMicroDots = [];
        if (terrain.signedInlandKm > 0.08 && terrain.urbanDensity > 0.25) {
          const dotCount = Math.min(8, Math.floor(terrain.urbanDensity * 9));
          for (let d = 0; d < dotCount; d++) {
            const pseudoAngle = ((r * 37 + c * 91 + d * 53) % 360) * (Math.PI / 180);
            const pseudoRad = R * (0.18 + (((r + c + d * 7) % 10) / 10) * 0.56);
            const dotLat = centerLat + (pseudoRad * Math.sin(pseudoAngle)) / metersPerDegLat;
            const dotLng = centerLng + (pseudoRad * Math.cos(pseudoAngle)) / metersPerDegLng;
            urbanMicroDots.push([dotLat, dotLng]);
          }
        }

        const cell = {
          key: `${r},${c}`,
          row: r,
          col: c,
          h3Index,
          center: [centerLat, centerLng],
          vertices,
          signedInlandKm: terrain.signedInlandKm,
          minRiverDistKm: terrain.minRiverDistKm,
          elevationM: terrain.elevationM,
          urbanDensity: terrain.urbanDensity,
          urbanMicroDots,
          inundationDepthM: 0,
          exposedBuildings: 0,
          riskClass: 3,
          classLabel: 'Kelas 3 • Penyangga (5–18 mdpl)',
          fillColor: '#65a30d',
          fillOpacity: 0.42,
        };

        this.cells.push(cell);
        this.cellMap.set(cell.key, cell);
      }
    }

    return this.cells;
  }

  updateSimulation(cityId, magnitude, timelineMin) {
    const city = SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang;
    const eta = city.etaMinutes;

    const maxCoastalWaveM = 1.45 * Math.pow(10, 0.42 * (magnitude - 7.0));

    let inlandWaveFactor = 0.25;
    if (timelineMin >= eta) {
      const surgeProgress = Math.min(1, (timelineMin - eta) / 14);
      inlandWaveFactor = 0.55 + surgeProgress * 0.55;
    } else if (timelineMin > 0) {
      inlandWaveFactor = 0.22 + (timelineMin / eta) * 0.28;
    }

    const effectiveSurgeM = maxCoastalWaveM * inlandWaveFactor;
    let totalExposedPopulation = 0;

    for (const cell of this.cells) {
      let depthM = 0;

      if (cell.signedInlandKm <= 0) {
        depthM = Math.max(3.5, Math.abs(cell.elevationM) + effectiveSurgeM * 0.6);
      } else {
        const inlandDecay = cell.signedInlandKm * 1.45;
        const riverAmplifier =
          cell.minRiverDistKm < 0.45 ? (1 - cell.minRiverDistKm / 0.45) * 1.65 : 0;
        const waterSurfaceLevel = effectiveSurgeM + riverAmplifier - inlandDecay;

        if (waterSurfaceLevel > cell.elevationM) {
          depthM = Number((waterSurfaceLevel - cell.elevationM).toFixed(2));
        } else {
          depthM = 0;
        }
      }

      cell.inundationDepthM = depthM;

      if (cell.signedInlandKm > 0 && depthM > 0.15) {
        cell.exposedBuildings = Math.round(
          cell.urbanDensity * 165 * Math.min(1.4, 0.5 + depthM * 0.25)
        );
        totalExposedPopulation += cell.exposedBuildings * 4;
      } else {
        cell.exposedBuildings = 0;
      }

      if (cell.signedInlandKm <= 0 || depthM > 3.0) {
        cell.riskClass = 1;
        cell.classLabel = 'Kelas 1 • Rendaman Ekstrem (>3.0m)';
        cell.fillColor = '#7f1d1d';
        cell.fillOpacity = 0.64;
      } else if (depthM >= 0.45 || (cell.signedInlandKm < 1.35 && cell.elevationM < 6.5)) {
        cell.riskClass = 2;
        cell.classLabel = 'Kelas 2 • Bahaya Tinggi (0.5–3.0m)';
        cell.fillColor = depthM >= 1.5 ? '#ea580c' : '#f97316';
        cell.fillOpacity = 0.56;
      } else if (cell.elevationM <= 18.0) {
        cell.riskClass = 3;
        cell.classLabel = 'Kelas 3 • Penyangga (5–18 mdpl)';
        cell.fillColor = cell.elevationM > 12 ? '#65a30d' : '#84cc16';
        cell.fillOpacity = 0.42;
      } else {
        cell.riskClass = 4;
        cell.classLabel = 'Kelas 4 • Zona Aman (>18 mdpl)';
        cell.fillColor = cell.elevationM > 26 ? '#06b6d4' : '#14b8a6';
        cell.fillOpacity = 0.58;
      }
    }

    return {
      maxCoastalWaveM: Number(maxCoastalWaveM.toFixed(2)),
      totalExposedPopulation,
    };
  }

  findNearestCell(lat, lng) {
    let bestCell = null;
    let minDistSq = Infinity;
    for (const cell of this.cells) {
      const dLat = cell.center[0] - lat;
      const dLng = cell.center[1] - lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestCell = cell;
      }
    }
    return bestCell;
  }

  getNeighbors(cell) {
    const { row, col } = cell;
    const isOdd = row % 2 !== 0;
    const offsets = isOdd
      ? [
          [0, -1],
          [0, 1],
          [-1, 0],
          [-1, 1],
          [1, 0],
          [1, 1],
        ]
      : [
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 0],
          [1, -1],
          [1, 0],
        ];

    const neighbors = [];
    for (const [dr, dc] of offsets) {
      const neighbor = this.cellMap.get(`${row + dr},${col + dc}`);
      if (neighbor) neighbors.push(neighbor);
    }
    return neighbors;
  }

  toGeoJson({ cityId, magnitude, timelineMin, resolution, activeRoute }) {
    const features = this.cells.map((cell) => {
      const ring = cell.vertices.map(([lat, lng]) => [
        Number(lng.toFixed(6)),
        Number(lat.toFixed(6)),
      ]);
      ring.push(ring[0]);

      return {
        type: 'Feature',
        properties: {
          h3Index: cell.h3Index,
          riskClass: cell.riskClass,
          classLabel: cell.classLabel,
          elevationM: cell.elevationM,
          inundationDepthM: cell.inundationDepthM,
          exposedBuildings: cell.exposedBuildings,
          fillColor: cell.fillColor,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      };
    });

    if (activeRoute && Array.isArray(activeRoute.waypoints)) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'evacuation_route_astar',
          targetShelter: activeRoute.shelter?.name || 'TES Terdekat',
          distanceKm: activeRoute.distanceKm,
          walkMinutes: activeRoute.walkMinutes,
        },
        geometry: {
          type: 'LineString',
          coordinates: activeRoute.waypoints.map(([lat, lng]) => [
            Number(lng.toFixed(6)),
            Number(lat.toFixed(6)),
          ]),
        },
      });
    }

    return {
      type: 'FeatureCollection',
      metadata: {
        platform: 'COASTAL-RESCUE H3 Hexagonal Tsunami Impact Model',
        city: (SUMATRA_COASTAL_MODELS[cityId] || SUMATRA_COASTAL_MODELS.padang).name,
        magnitude,
        timelineMin: Math.round(timelineMin),
        resolution,
        references: ['InaRISK BNPB', 'USGS Earthquake API', 'NOAA', 'GEBCO', 'Ina-Geoportal BIG'],
      },
      features,
    };
  }
}

/**
 * ============================================================================
 * 3. A* LEAST-COST HEXAGONAL EVACUATION ROUTER (AStarHexRouter)
 * ============================================================================
 */
export class AStarHexRouter {
  constructor(gridEngine) {
    this.grid = gridEngine;
  }

  getTraversalCost(cell, isStartCell) {
    if (cell.riskClass === 1) {
      return isStartCell ? 14.0 : 28.0;
    }
    if (cell.riskClass === 2) {
      return 3.6 + cell.inundationDepthM * 1.4;
    }
    if (cell.riskClass === 3) {
      return 1.15 - Math.min(0.25, cell.elevationM * 0.01);
    }
    return 0.85;
  }

  findPath(startCell, goalCell) {
    if (!startCell || !goalCell) return null;
    if (startCell.key === goalCell.key) {
      return { cells: [startCell], waypoints: [startCell.center], distanceKm: 0, walkMinutes: 0 };
    }

    const openSet = new Map();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const heuristic = (a, b) =>
      this.grid.haversineKm(a.center[0], a.center[1], b.center[0], b.center[1]) * 2.2;

    gScore.set(startCell.key, 0);
    fScore.set(startCell.key, heuristic(startCell, goalCell));
    openSet.set(startCell.key, startCell);

    let iterations = 0;
    const maxIterations = 4500;

    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;

      let current = null;
      let lowestF = Infinity;
      for (const [key, node] of openSet.entries()) {
        const f = fScore.get(key) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = node;
        }
      }

      if (!current) break;

      if (current.key === goalCell.key) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.delete(current.key);
      closedSet.add(current.key);

      const neighbors = this.grid.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor.key)) continue;

        const stepCost = this.getTraversalCost(neighbor, false);
        const tentativeG = (gScore.get(current.key) ?? Infinity) + stepCost;

        if (tentativeG < (gScore.get(neighbor.key) ?? Infinity)) {
          cameFrom.set(neighbor.key, current);
          gScore.set(neighbor.key, tentativeG);
          fScore.set(neighbor.key, tentativeG + heuristic(neighbor, goalCell));
          if (!openSet.has(neighbor.key)) {
            openSet.set(neighbor.key, neighbor);
          }
        }
      }
    }

    return null;
  }

  reconstructPath(cameFrom, current) {
    const pathCells = [current];
    while (cameFrom.has(current.key)) {
      current = cameFrom.get(current.key);
      pathCells.unshift(current);
    }

    let distanceKm = 0;
    for (let i = 1; i < pathCells.length; i++) {
      distanceKm += this.grid.haversineKm(
        pathCells[i - 1].center[0],
        pathCells[i - 1].center[1],
        pathCells[i].center[0],
        pathCells[i].center[1]
      );
    }

    const waypoints = this.smoothWaypoints(pathCells.map((c) => c.center));
    const walkMinutes = Math.max(1, Math.round((distanceKm / 7.2) * 60));

    return {
      cells: pathCells,
      waypoints,
      distanceKm: Number(distanceKm.toFixed(2)),
      walkMinutes,
    };
  }

  smoothWaypoints(pts) {
    if (pts.length <= 2) return pts;
    const smoothed = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      smoothed.push([p0[0] * 0.72 + p1[0] * 0.28, p0[1] * 0.72 + p1[1] * 0.28]);
      smoothed.push([p0[0] * 0.28 + p1[0] * 0.72, p0[1] * 0.28 + p1[1] * 0.72]);
    }
    smoothed.push(pts[pts.length - 1]);
    return smoothed;
  }
}

export const MODULAR_JS_EXPORT_TEMPLATE = `/**
 * COASTAL-RESCUE — H3 Hexagonal Spatial Grid & A* Evacuation Router
 * Siap diintegrasikan ke proyek WebGIS Leaflet.js / Next.js Anda
 */

export class HexTsunamiGridEngine {
  constructor(radiusMeters = 280) {
    this.radiusM = radiusMeters;
    this.cells = [];
    this.cellMap = new Map();
  }

  // Menghasilkan 6 titik sudut heksagon pointy-top dari pusat koordinat (lat0, lng0)
  createHexVertices(lat0, lng0, cxM, cyM) {
    const mPerLat = 111320;
    const mPerLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const vertices = [];
    for (let k = 0; k < 6; k++) {
      const angle = Math.PI / 6 + (k * Math.PI) / 3;
      vertices.push([
        lat0 + (cyM + this.radiusM * Math.sin(angle)) / mPerLat,
        lng0 + (cxM + this.radiusM * Math.cos(angle)) / mPerLng
      ]);
    }
    return vertices;
  }

  // Klasifikasi 4 warna sel H3 sesuai kedalaman rendaman tsunami & elevasi DEM
  classifyCell(elevationM, inundationDepthM, isSea) {
    if (isSea || inundationDepthM > 3.0) {
      return { riskClass: 1, fillColor: '#7f1d1d', fillOpacity: 0.64 }; // Maroon Ekstrem
    }
    if (inundationDepthM >= 0.45) {
      return { riskClass: 2, fillColor: '#ea580c', fillOpacity: 0.56 }; // Red-Orange Bahaya
    }
    if (elevationM <= 18.0) {
      return { riskClass: 3, fillColor: '#65a30d', fillOpacity: 0.42 }; // Olive Penyangga
    }
    return { riskClass: 4, fillColor: '#06b6d4', fillOpacity: 0.58 };   // Cyan Zona Aman
  }
}

export class AStarHexRouter {
  constructor(gridEngine) {
    this.grid = gridEngine;
  }

  getTraversalCost(cell) {
    if (cell.riskClass === 1) return 28.0; // Hindari rendaman ekstrem (>3m)
    if (cell.riskClass === 2) return 3.6 + cell.inundationDepthM * 1.4;
    if (cell.riskClass === 3) return 1.15;
    return 0.85; // Prioritaskan klaster zona aman Cyan (>18 mdpl)
  }
}`;
