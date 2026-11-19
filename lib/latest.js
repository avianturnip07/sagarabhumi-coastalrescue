// Penjaga "hanya permintaan terbaru yang boleh diterapkan".
// Setiap permintaan baru membatalkan permintaan sebelumnya dan menaikkan nomor urut.
// Hasil dengan nomor lama dibuang, walaupun sudah selesai diunduh.

// Alasan pembatalan untuk batas waktu klien. Dibedakan dari pembatalan karena permintaan baru.
const TIMEOUT_REASON = 'timeout';

export function createLatestGate() {
  let seq = 0;
  let controller = null;
  let timer = null;

  const clearTimer = () => {
    clearTimeout(timer);
    timer = null;
  };

  return {
    // Memulai permintaan baru dan membatalkan yang sebelumnya.
    start(timeoutMs) {
      clearTimer();
      controller?.abort();
      seq += 1;
      const id = seq;
      const ctrl = new AbortController();
      controller = ctrl;
      timer = setTimeout(() => ctrl.abort(TIMEOUT_REASON), timeoutMs);
      return {
        id,
        signal: ctrl.signal,
        timedOut: () => ctrl.signal.reason === TIMEOUT_REASON,
        // Dipanggil di blok finally. Timer dihentikan hanya jika ini masih permintaan terbaru,
        // supaya permintaan usang tidak menghapus timer milik permintaan yang lebih baru.
        done: () => {
          if (id === seq) clearTimer();
        },
      };
    },
    isCurrent: (id) => id === seq,
    // Membatalkan semua permintaan yang berjalan dan membuat hasilnya usang (dipakai saat unmount atau reset).
    cancel() {
      clearTimer();
      seq += 1;
      controller?.abort();
      controller = null;
    },
  };
}
