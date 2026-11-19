// Elevasi permukaan (m) dari Open-Meteo Elevation API (tanpa kunci API).
// Koordinat dibulatkan ke 3 desimal (sekitar 100 m) agar cache data Next.js tidak membengkak.
// Mengembalikan null jika layanan gagal. Pemanggil harus menangani null.
export async function getElevation(lat, lon) {
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const value = (await res.json())?.elevation?.[0];
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
