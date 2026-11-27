# Sistem Informasi Posyandu — Kelompok 6 Kelas B

Proyek ini terdiri dari **dua folder yang dijalankan terpisah**:

| Folder | Isi | Berjalan di | Dibuka di browser? |
|---|---|---|---|
| `backend/` | API (Express + TypeScript + SQL Server), konsep OOP | http://localhost:3000 | Hanya untuk Swagger: http://localhost:3000/docs |
| `frontend/` | Tampilan web (React + Vite) yang dipakai kader | http://localhost:5173 | **Ya, ini yang dibuka** |

Frontend tidak mengakses database. Semua data lewat backend (AC-01). Karena itu **backend harus menyala dulu**, baru frontend.

```
Browser  ──>  frontend (5173)  ──/api──>  backend (3000)  ──>  SQL Server (posyandu_db)
```

## A. Persiapan (cukup sekali)

### 1. Database (SSMS)

1. Buka SSMS, hubungkan ke SQL Server.
2. Buka dan jalankan (F5) berurutan file di `backend/db/`:

   | File | Isi | Dijalankan ulang? |
   |---|---|---|
   | `01_schema.sql` | Database `posyandu_db`, tabel, constraint, index | Tidak (hapus database dulu bila ingin mengulang) |
   | `02_objects.sql` | Function, view, stored procedure, trigger; di akhir menjalankan `sp_hitung_ulang_status_bb` untuk memperbaiki status berat badan balita data lama | Aman |
   | `03_security.sql` | Role basis data kelompok, login backend `posyandu_app`, kebijakan RLS (hapus khusus Koordinator, kelola akun khusus Super User) | Aman |
   | `04_seed.sql` | Data contoh dummy, contoh `aturan_kategori`, password uji `Posyandu#2026`, satu kader tanpa akun | Tidak |
   | `05_uji_hak_akses.sql` | Opsional: skenario uji hak akses Super User dan User Kader (laporan SMBD) | Tidak |

   Bila hanya ada pembaruan kode basis data (bukan data), cukup jalankan ulang `02_objects.sql` dan `03_security.sql`.
3. Pastikan SQL Server memakai mode **SQL Server and Windows Authentication** (klik kanan server → Properties → Security), lalu restart service SQL Server.

### 2. Backend

Buka terminal (Command Prompt / PowerShell):

```
cd backend
copy .env.example .env
npm.cmd install
```

Buka file `.env`, samakan `DB_PASSWORD` dengan password login `posyandu_app` di `03_security.sql` Bagian B (tulis dengan tanda kutip).
Untuk SQL Server Express, isi `DB_INSTANCE=SQLEXPRESS` dan kosongkan `DB_PORT`.

### 3. Frontend

```
cd frontend
npm.cmd install
```

## B. Menjalankan (setiap kali dipakai)

Perlu **dua terminal** yang dibiarkan terbuka.

**Terminal 1 — backend**

```
cd backend
npm.cmd start
```

Tunggu sampai muncul `API Posyandu berjalan di http://localhost:3000`.

**Terminal 2 — frontend**

```
cd frontend
npm.cmd run dev
```

Lalu buka **http://localhost:5173** di browser.

Aplikasi hanya punya 2 peran: **Koordinator** (Super User) dan **Kader** (User). Login memakai username dan password.

| Username | Peran | Password |
|---|---|---|
| `kaderNovita01` | Koordinator (Ibu Novita) | `Posyandu#2026` |
| `kaderEndah02` | Kader (Ibu Endah) | `Posyandu#2026` |
| `kaderListiyani03` | Kader (Ibu Listiyani) | `Posyandu#2026` |
| `kaderSuwanti04` | Kader (Ibu Suwanti) | `Posyandu#2026` |
| `kaderTitin03` | Kader (Ibu Titin) | `Posyandu#2026` |

Password di atas diatur `04_seed.sql` Bagian C. Kader `Ibu Sari` sengaja belum punya akun, untuk mencoba Tambah Akun dari kader terdaftar.
Akun Warga dan tenaga kesehatan (Bidan) ditolak saat login: hanya petugas yang terdaftar di tabel `kader` yang bisa masuk.

Untuk berhenti: tekan `Ctrl + C` di kedua terminal.

## C. Pengujian

Rincian semua endpoint, status HTTP, dan tabel skenario uji (sukses dan gagal) ada di `backend/docs/ENDPOINT_DAN_SKENARIO_UJI.md`.

Di folder `backend`:

| Perintah | Yang diperiksa | Hasil |
|---|---|---|
| `npm.cmd run typecheck` | Tipe TypeScript, termasuk kewajiban `override` | Tanpa error |
| `npm.cmd test` | 17 unit test kelas OOP (tanpa database) | 17 lulus |
| `npm.cmd run test:api` | 67 kasus uji API semua modul, sukses dan gagal (backend menyala, database baru) | 67 lulus |
| `npm.cmd run test:postman` | Koleksi Postman `tests/postman/Posyandu.postman_collection.json` (75 request, bisa juga di-Import ke Postman lalu Run collection) | 75 lulus |
| `npm.cmd run oop` | Lokasi setiap konsep OOP di kode | 11 konsep ditemukan |
| `npm.cmd run arsitektur` | 8 aturan lapisan: controller tidak menyentuh database, SQL hanya di repository, `console` hanya di Logger, `.env` hanya dibaca Konfigurasi, dst. | 0 pelanggaran |
| `npm.cmd run format:cek` | Format kode seragam (Prettier) | Semua file rapi |

Di folder `frontend` (uji tampilan di browser sungguhan):

| Perintah | Yang diperiksa | Hasil |
|---|---|---|
| `npx.cmd playwright install chromium` | Persiapan sekali | - |
| `npm.cmd run test:e2e` | 13 uji: menu per peran, pesan galat (kode, asal masalah, proses), Ganti Password, Kelola Akun, PUMA, Log Aktivitas, serta koneksi putus, server mengirim HTML 500, dan basis data mati. Backend dan `npm.cmd run dev` harus menyala. | 13 lulus |

Jalankan uji API dan Postman pada database yang baru dibuat, karena kedua uji mengganti password dan membuat data uji.

## D. Kalau ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Halaman frontend muncul tapi login gagal "Layanan tidak tersedia" | Backend belum menyala, atau `.env` salah. Cek terminal 1, lalu buka `http://localhost:3000/api/v1/status`: `basis_data: terhubung` berarti database siap. |
| `Access denied ... (using password: NO)` / `Login failed for user` | `DB_PASSWORD` di `backend/.env` belum diisi atau berbeda dengan password `posyandu_app` di `03_security.sql`. |
| `npm.ps1 cannot be loaded` | Pakai `npm.cmd`, bukan `npm`. |
| `'tsx' is not recognized` | Jalankan `npm.cmd install --include=dev` di folder backend. |
| Port 3000 sudah dipakai | Tutup server lama: `taskkill /F /IM node.exe`, lalu jalankan lagi. |
| Diarahkan ke login terus | Sesi berlaku 8 jam. Login ulang. |

## E. Cakupan fungsi

| FSD | Fungsi | Backend | Frontend (layar) |
|---|---|---|---|
| 2.1, 2.2 | Login, Logout | `/auth/login`, `/auth/logout` | SCR-01, tombol Keluar di header |
| 2.3 | Ganti password akun sendiri (Kader dan Koordinator) | `PUT /akun/saya/password` | SCR-17 `/akun/password` (dibuka dari menu avatar di header) |
| 2.4 | Kelola akun: tambah (kader terdaftar / petugas baru), ubah, nonaktifkan/aktifkan (hanya Koordinator) | `GET/POST /akun`, `GET /akun/kader-tanpa-akun`, `PATCH /akun/{id}`, `PATCH /akun/{id}/status` | SCR-18 `/admin/akun` |
| 2.6, 2.12, 2.19 | Kelola data balita, ibu, lansia | `POST/GET/PATCH/DELETE /{kelompok}` | SCR-04, SCR-08, SCR-12 |
| 2.7–2.8, 2.13–2.15, 2.20–2.22 | Catat pemeriksaan + hitung kategori | `POST /{kelompok}/{id}/pemeriksaan` | SCR-05, SCR-09, SCR-13 |
| 2.9, 2.16 | Catat layanan (balita, ibu) | `POST /{balita\|ibu}/{id}/pemeriksaan/{pid}/layanan` | SCR-07, SCR-11 |
| 2.10, 2.17, 2.23 | Catat isian pendukung + rujukan ke faskes | `POST /{kelompok}/{id}/pemeriksaan/{pid}/isian-pendukung`, `GET /faskes` | SCR-07, SCR-11, SCR-15 |
| 2.11, 2.18, 2.24 | Riwayat dan grafik | `GET /{kelompok}/{id}/riwayat` | SCR-06, SCR-10, SCR-14 |
| 2.25 | Cari data sasaran | `GET /sasaran?nama=` | SCR-03 |
| 2.26 | Rekapitulasi bulanan | `GET /rekap?bulan=&tahun=` | SCR-16 |
| – | Dashboard bulan lalu (sasaran hadir, stunting, status gizi, balita dirujuk) | `GET /dashboard` | SCR-02 Beranda |
| – | Jadwal kegiatan yang akan datang (tambah, ubah; hapus hanya Koordinator) | `GET/POST /jadwal`, `PATCH/DELETE /jadwal/{id}` | SCR-02 Beranda |
| 2.5 | Dashboard Monitoring & Log Aktivitas (hanya Koordinator) | `GET /monitoring/ringkasan`, `GET /monitoring/log` | SCR-19 `/admin/log` |

## F. Aturan klasifikasi balita

Mengacu Permenkes No. 2 Tahun 2020 (grafik KMS dan Buku KIA), dihitung dengan z-score tabel WHO di `backend/src/modules/balita/StandarAntropometri.ts`:

| Indikator | Kategori |
|---|---|
| BB/U | < -3 SD sangat kurang; -3 s.d. < -2 SD kurang; -2 s.d. +1 SD normal; > +1 SD risiko berat badan lebih |
| BB/PB, BB/TB | < -3 SD gizi buruk; -3 s.d. < -2 SD gizi kurang; -2 s.d. +1 SD gizi baik; > +1 s.d. +2 SD berisiko gizi lebih; > +2 s.d. +3 SD gizi lebih; > +3 SD obesitas |
| LK/U | < -2 SD mikrosefali; -2 s.d. +2 SD normal; > +2 SD makrosefali |
| TB/U (stunting) | < -3 SD sangat pendek; -3 s.d. < -2 SD pendek; -2 s.d. +3 SD normal; > +3 SD tinggi (tidak ada di foto acuan, diambil dari Permenkes 2/2020) |

Rujukan otomatis: balita **wajib Dirujuk** bila BB/U di bawah garis merah KMS (< -2 SD) atau di atas garis oranye (> +1 SD). Setelah pemeriksaan disimpan, aplikasi langsung membuka form rujukan dengan status rujukan terkunci "Ya".

Jam jadwal kegiatan disimpan di kolom `keterangan` (baris pertama `Jam: 08:00-11:00`) karena tabel `jadwal_kegiatan` tidak punya kolom jam.


## G. Hak akses (RBAC) dan audit trail

| Aksi | Kader (User) | Koordinator (Super User) |
|---|---|---|
| Login, logout | Ya | Ya |
| Lihat data (Read) | Ya | Ya |
| Isi data baru (Create) | Ya | Ya |
| Ubah data (Update) | Ya | Ya |
| Hapus data (Delete), termasuk membatalkan rujukan | **Tidak** | Ya |
| Ganti password akun sendiri (`/akun/password`) | Ya | Ya |
| Kelola Akun (`/admin/akun`) | **Tidak** (ERR-AUTH-03) | Ya |
| Dashboard Monitoring & Log Aktivitas (`/admin/log`) | **Tidak** (ERR-AUTH-03) | Ya |

Larangan hapus untuk Kader dijaga di tiga lapis:

1. **Tampilan:** tombol Hapus dan menu Log Aktivitas tidak dirender untuk Kader. Rute `/admin/log` dijaga `HanyaKoordinator` dan mengarahkan Kader kembali ke beranda dengan pesan ERR-AUTH-03.
2. **Backend/API:** middleware `AksesPeran.wajib('hapus' | 'lihat_log')` menolak dengan 403 ERR-AUTH-03 walaupun request ditembak langsung (Postman/curl) atau `localStorage` diubah lewat inspect element. Peran dibaca dari sesi di basis data, bukan dari browser.
3. **Basis data:** kebijakan Row-Level Security di `03_security.sql` (Bagian C dan D). Backend mengisi `SESSION_CONTEXT('app_peran')` dan `('app_user_id')` di setiap transaksi.
   - `kebijakan_hapus_koordinator`: DELETE oleh login `posyandu_app` hanya lolos bila perannya `Super User`.
   - `kebijakan_kelola_akun`: tambah akun/petugas/kader hanya `Super User`; ubah baris `pengguna` hanya `Super User` atau pemilik akun itu sendiri (Ganti Password).

Pemetaan skema (tabel kelompok dipakai apa adanya, tidak dibuat tabel baru):

| Spesifikasi | Tabel di `posyandu_db` | Kolom penting |
|---|---|---|
| `users` dengan kolom `role` | `pengguna` | `user_name`, `password_hash`, `peran` (`User (Kader)` / `Super User`), `status_akun`, `petugas_id` |
| `audit_logs` | `log_aktivitas` | `waktu_aktivitas`, `jenis_aktivitas` (`Login`, `Logout`, `Input`=Create, `Edit`=Update, `Delete`), `entitas_terkait` (modul), `id_data_terkait`, `keterangan` (detail), `user_id` |

Pencatatan otomatis:

- Percobaan akses tanpa hak dicatat dengan jenis **Ditolak** (ERR-AUTH-03), tampil sebagai badge oranye dan kartu KPI di Log Aktivitas.
- Sesi yang lewat 8 jam diakhiri otomatis dan dicatat sebagai **Logout** ("Logout otomatis"), baik saat pengguna kembali maupun lewat penyapuan setiap 10 menit.
- `PencatatAudit` dipanggil di dalam transaksi yang sama dengan perubahan data, sehingga data dan log tersimpan bersama atau batal bersama (FSD-2.5 EF-3). Detail update berisi perubahan `kolom: sebelum → sesudah`; NIK dan No. KK disamarkan (`****0101`). Kolom `keterangan` hanya 255 karakter, jadi detail panjang dipotong.

## H. Pesan galat dan usulan revisi dokumen

Setiap pesan galat di layar menampilkan kode error, asal masalah (Isian formulir, Sesi login, Hak akses, Data, Sistem, atau Koneksi), proses yang gagal, dan saran tindakan.

Kode error baru (ERR-VAL-11 s.d. 16, ERR-DATA-06 s.d. 10, ERR-SYS-03) serta aturan yang belum tertulis di FSD/TSD dikumpulkan di `USULAN_REVISI_FSD_TSD.md`, sebagai bahan revisi dokumen kelompok.

## I. Tampilan (frontend)

- Desain "Hutan & Sage": satu warna utama hijau hutan, aksen hijau pucuk untuk menu aktif, warna makna merah (perlu perhatian/rujuk), kuning (dipantau), hijau (normal), biru (info). Font Plus Jakarta Sans, jarak kelipatan 4px. Token warna ada di awal `frontend/src/styles.css`.
- Efek kaca buram pada kartu login, kotak cari, menu atas, dan menu bawah HP. Tingkat transparansi dan blur diatur lewat `--kaca`, `--kaca-kilau`, dan `--kaca-blur`.
- Menu: Beranda, Cari Sasaran, Rekapitulasi (semua peran) + Kelola Akun dan Log Aktivitas (Koordinator). Ganti Password ada di menu avatar. Di HP menu pindah ke bawah layar.
- Pesan galat: galat isian hanya tampil merah di bawah isiannya (layar otomatis bergeser ke isian salah pertama). Galat lain tampil sebagai kotak dengan judul singkat sesuai jenisnya (Gagal masuk, Sesi berakhir, Tidak punya izin, Koneksi terputus, Server sedang bermasalah, dan seterusnya) + pesan dari server. Kode galat tidak ditampilkan, tetapi tersimpan di atribut `data-kode` untuk pengembang dan uji e2e.
- Placeholder isian generik (Masukkan nama, Masukkan NIK, Pilih jenis kelamin, Masukkan angka), tidak memakai contoh data warga.
- Warna status: hijau normal, kuning dipantau, merah perlu perhatian, ungu data pertama (Pertama Kali Ditimbang), abu belum bisa dinilai.
- Notifikasi sukses memakai toast (paket `sonner`).
- Log Aktivitas memakai paginasi: halaman pertama/sebelumnya/berikutnya/terakhir dan nomor halaman yang bisa diketik.
