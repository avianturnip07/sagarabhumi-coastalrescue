# COASTAL-RESCUE

Platform WebGIS untuk mitigasi dan evakuasi bencana pesisir di Sumatra. Aplikasi menggunakan Next.js 14 App Router, React Leaflet, dan route handler Next.js; tidak memerlukan server Python terpisah.

## Menjalankan lokal

Persyaratan: Node.js 18.18 atau lebih baru.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Pilih lokasi perangkat atau ketuk peta untuk mengatur titik awal, lalu cari shelter atau pilih marker shelter untuk membuat rute.

`ROUTER=demo` menggunakan garis lurus untuk pengembangan saja; garis tersebut bukan jalan sebenarnya. Untuk rute jalan, gunakan `ROUTER=osrm` dan isi `OSRM_URL` dengan layanan OSRM yang Anda kelola. Server OSRM demo publik hanya fallback dan memiliki batas penggunaan.

## Deploy ke Vercel

1. Push repository ini ke GitHub.
2. Di Vercel, pilih **Add New → Project**, lalu impor repository.
3. Biarkan **Root Directory** di `./` dan framework terdeteksi sebagai **Next.js**.
4. Tambahkan environment variables untuk Production (dan Preview bila diperlukan):
   - `ROUTER=osrm`
   - `OSRM_URL=https://alamat-server-osrm-anda` — gunakan layanan yang Anda kelola untuk menghindari batas server demo publik.
   - `NEXT_PUBLIC_BPBD_PHONE` — opsional, nomor BPBD setempat yang sudah diverifikasi.
5. Pilih **Deploy**. Deploy berikutnya akan berjalan otomatis setiap kali perubahan di-push ke branch yang terhubung.

Setelah mengubah environment variables di Vercel, lakukan redeploy agar perubahan berlaku. `vercel.json` sudah menyatakan framework Next.js dan mengatur beberapa response security headers.

## Konfigurasi

Salin `.env.example` menjadi `.env.local` untuk pengembangan lokal. Variabel `NEXT_PUBLIC_BPBD_PHONE` tampil di browser; jangan masukkan rahasia atau kredensial ke dalam variabel `NEXT_PUBLIC_*`.

## Data dan keselamatan

**Aplikasi ini belum layak dipakai untuk navigasi atau keputusan evakuasi nyata.** Data shelter, garis pantai, dan sejumlah koordinat pada arsip ini adalah data contoh. Zona bahaya hanya tersedia sebagai demonstrasi di Padang; data telemetri dan jalur eksternal bukan pengganti informasi resmi. Verifikasi serta ganti seluruh data dengan sumber BPBD, BMKG, Basarnas, BIG, atau sumber resmi setempat sebelum digunakan untuk keselamatan warga. Cari `>>> SWAP` di kode untuk titik integrasi yang perlu diperbarui.
