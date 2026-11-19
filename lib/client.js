// Pemanggil API untuk sisi klien. Semua kegagalan diubah menjadi ClientError dengan kode yang jelas,
// sehingga komponen cukup membaca `code` tanpa menebak penyebabnya.

export class ClientError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
  }
}

// GET ke route handler. Melempar ClientError untuk HTTP error dan jaringan yang putus.
// Jika permintaan dibatalkan (diganti permintaan baru atau batas waktu), AbortError diteruskan apa adanya
// supaya pemanggil bisa membedakannya dari galat sungguhan.
export async function apiGet(url, { signal } = {}) {
  let res;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ClientError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 'NETWORK');
  }

  let body = null;
  try {
    body = await res.json();
  } catch (err) {
    if (signal?.aborted) throw err;
    body = null; // bukan JSON, misalnya halaman galat dari platform hosting
  }

  if (!res.ok) {
    throw new ClientError(body?.detail || `Permintaan gagal (HTTP ${res.status}).`, body?.code || `HTTP_${res.status}`);
  }
  if (body === null) {
    throw new ClientError('Respons server tidak valid.', 'BAD_RESPONSE');
  }
  return body;
}

// Kode galat pencarian rute -> status tampilan.
export function routeFailureStatus(code) {
  switch (code) {
    case 'NO_ROUTE':
    case 'NO_SEGMENT':
      return 'unreachable'; // "Akses Jalan Tidak Terhubung"
    case 'NO_CANDIDATES':
      return 'no_shelter';
    case 'OUT_OF_COVERAGE':
    case 'BAD_COORDINATE':
    case 'BAD_PARAM':
      return 'invalid';
    default:
      return 'error'; // 429, 502, 504, jaringan, atau batas waktu klien
  }
}
