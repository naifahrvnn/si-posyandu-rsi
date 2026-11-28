# Daftar Endpoint dan Skenario Uji API

Dokumen ini dibuat dari data skenario yang sama dengan koleksi Postman `tests/postman/Posyandu.postman_collection.json`. Semua skenario sudah dijalankan pada database baru (db/01 s.d. 04) dan **75/75 lulus**. Bukti tambahan: `npm.cmd run test:api` (67 kasus) dan `npm.cmd test` (17 unit test).

Alamat dasar: `http://localhost:3000/api/v1`. Endpoint selain `/status` dan `/auth/login` wajib header `x-id-sesi` (dari respons login).

Semua respons memakai format yang sama:

```json
{ "status": "success" | "error", "data": ..., "message": "...", "errors": null | [{ "code": "ERR-...", "field": "nama_isian" | null, "message": "..." }] }
```

## 1. Daftar endpoint

`{kelompok}` = `balita`, `ibu`, atau `lansia`. Jadi 27 baris di bawah mewakili 42 endpoint.

| No | Method | Path | Fungsi FSD | Akses | Request | Response sukses |
|---|---|---|---|---|---|---|
| 1 | GET | `/status` | - | Publik | - | 200 `{server, basis_data, waktu}`; 503 ERR-SYS-01 bila basis data mati |
| 2 | POST | `/auth/login` | 2.1 | Publik | `{username, password}` | 200 `{id_sesi, kedaluwarsa_pada, pengguna}` |
| 3 | POST | `/auth/logout` | 2.2 | Semua peran | - | 200 `null` |
| 4 | PUT | `/akun/saya/password` | 2.3 | Semua peran | `{password_baru}` | 200 `null` |
| 5 | GET | `/akun` | 2.4 | Koordinator | - | 200 daftar akun (`akun_saya` menandai akun sendiri) |
| 6 | GET | `/akun/kader-tanpa-akun` | 2.4 | Koordinator | - | 200 daftar kader tanpa akun |
| 7 | POST | `/akun` | 2.4 | Koordinator | `{sumber, username, password_awal, peran?, petugas_id \| nama, jenis_kelamin, jabatan_kader}` | 201 akun baru (Aktif) |
| 8 | PATCH | `/akun/{id}` | 2.4 AF-1 | Koordinator | `{nama?, username?, peran?}` | 200 akun |
| 9 | PATCH | `/akun/{id}/status` | 2.4 AF-2 | Koordinator | `{status_akun}` | 200 akun |
| 10 | GET | `/monitoring/ringkasan` | 2.5 | Koordinator | - | 200 KPI hari ini |
| 11 | GET | `/monitoring/log` | 2.5 | Koordinator | query `cari, jenis, dari, sampai, halaman, per_halaman` | 200 `{baris, total, halaman, per_halaman, total_halaman}` |
| 12 | POST | `/{kelompok}` | 2.6, 2.12, 2.19 | Semua peran | identitas + `no_kk`, `hubungan_keluarga` (+ alamat bila KK baru) | 201 sasaran |
| 13 | GET | `/{kelompok}/{id}` | 2.11, 2.18, 2.24 | Semua peran | - | 200 sasaran |
| 14 | PATCH | `/{kelompok}/{id}` | 2.6, 2.12, 2.19 AF-1 | Semua peran | isian yang diubah saja | 200 sasaran |
| 15 | DELETE | `/{kelompok}/{id}` | 2.6, 2.12, 2.19 AF-3 | Koordinator | - | 200 `null` (riwayat ikut terhapus) |
| 16 | POST | `/{kelompok}/{id}/pemeriksaan` | 2.7-2.8, 2.13-2.15, 2.20-2.22 | Semua peran | hasil ukur (beda per kelompok) | 201 pemeriksaan + kategori; `peringatan` ERR-DATA-02 bila kategori belum bisa dihitung |
| 17 | GET | `/{kelompok}/{id}/riwayat` | 2.11, 2.18, 2.24 | Semua peran | - | 200 `{sasaran, pemeriksaan_terakhir, pemeriksaan, layanan}` |
| 18 | POST | `/{kelompok}/{id}/pemeriksaan/{pid}/isian-pendukung` | 2.10, 2.17, 2.23 | Semua peran | `{status_rujukan, faskes_id?, alasan_rujukan?, catatan_edukasi?, tbc_*}` | 201 isian baru / 200 isian diperbarui |
| 19 | POST | `/{balita\|ibu}/{id}/pemeriksaan/{pid}/layanan` | 2.9, 2.16 | Semua peran | `{layanan: [{jenis_layanan, tanggal_layanan, ...}]}` | 201 daftar layanan |
| 20 | GET | `/faskes` | 2.10 | Semua peran | - | 200 daftar faskes |
| 21 | GET | `/sasaran` | 2.25 | Semua peran | query `nama` | 200 hasil (tanpa No. KK); 404 ERR-DATA-01 bila kosong |
| 22 | GET | `/rekap` | 2.26 | Semua peran | query `bulan, tahun` | 200 `{bulan, tahun, ada_data, baris}` |
| 23 | GET | `/dashboard` | Beranda | Semua peran | - | 200 ringkasan bulan lalu + jadwal |
| 24 | GET | `/jadwal` | Beranda | Semua peran | - | 200 jadwal mulai hari ini |
| 25 | POST | `/jadwal` | Beranda | Semua peran | `{nama_kegiatan, jenis_kegiatan, tanggal_pelaksanaan, jam_mulai, jam_selesai, lokasi, keterangan?}` | 201 jadwal |
| 26 | PATCH | `/jadwal/{id}` | Beranda | Semua peran | isian yang diubah saja | 200 jadwal |
| 27 | DELETE | `/jadwal/{id}` | Beranda | Koordinator | - | 200 `null` |

## 2. Arti status HTTP

| Status | Dipakai bila | Contoh kode |
|---|---|---|
| 200 OK | Berhasil membaca, mengubah, atau menghapus | - |
| 201 Created | Data baru berhasil dibuat | - |
| 400 Bad Request | Body bukan JSON yang sah | ERR-VAL-17 |
| 401 Unauthorized | Belum login, sesi habis, atau login salah | ERR-AUTH-01, ERR-AUTH-02 |
| 403 Forbidden | Peran tidak berhak (Kader menghapus, membuka log, atau kelola akun) | ERR-AUTH-03 |
| 404 Not Found | Data atau alamat API tidak ada | ERR-DATA-01, 07, 09, ERR-SYS-03 |
| 409 Conflict | Data bentrok dengan data lain | ERR-VAL-05, ERR-VAL-13, ERR-DATA-03, 06, 08, 11 |
| 413 Payload Too Large | Body melebihi 100 kb | ERR-VAL-18 |
| 422 Unprocessable Entity | Isian tidak memenuhi aturan | ERR-VAL-01 s.d. 16, ERR-DATA-05, 10 |
| 500 Internal Server Error | Galat tak terduga di kode server | ERR-SYS-04 |
| 503 Service Unavailable | Basis data mati atau query melewati batas waktu | ERR-SYS-01 |

Validasi selalu di backend (kelas `*Validator` turunan `ValidatorDasar`, memakai zod). Semua isian yang salah dilaporkan sekaligus, satu error per isian. Validasi di frontend hanya membantu, bukan pengganti.

## 3. Skenario uji per endpoint

Kolom "Bukti" menunjuk folder koleksi Postman. Request berurutan: variabel seperti `{{idBalita}}` diisi otomatis oleh request sebelumnya.

| No | Endpoint | Skenario | Input | Status | Kode dan pesan yang diharapkan | Bukti (folder Postman) |
|---|---|---|---|---|---|---|
| 1 | GET `/status` | Status layanan: server dan basis data siap (tanpa sesi) | - | 200 | - (sukses) | 0 |
| 2 | POST `/auth/login` | Login: isian kosong (tanpa sesi) | username="", password="" | 422 | ERR-VAL-01: Bagian ini wajib diisi | 0 |
| 3 | POST `/auth/login` | Login: password salah (tanpa sesi) | username="kaderEndah02", password="salah" | 401 | ERR-AUTH-02: Username atau password tidak valid. | 0 |
| 4 | POST `/auth/login` | Login: body JSON rusak (tanpa sesi) | body rusak `{"username": "kaderEndah02", ` | 400 | ERR-VAL-17: Format data yang dikirim tidak valid. | 0 |
| 5 | POST `/auth/login` | Login Koordinator (tanpa sesi) | username="kaderNovita01", password="Posyandu#2026" | 200 | - (sukses) | 0 |
| 6 | POST `/auth/login` | Login Kader (tanpa sesi) | username="kaderEndah02", password="Posyandu#2026" | 200 | - (sukses) | 0 |
| 7 | POST `/balita` | Tambah balita tanpa sesi (tanpa sesi) | `{}` | 401 | ERR-AUTH-01: Sesi Anda sudah berakhir. Silakan login kembali. | 1 |
| 8 | POST `/balita` | Tambah balita: NIK, No. KK, tanggal, kontak salah (Kader) | nama="Uji Postman Balita", jenis_kelamin="Perempuan", tanggal_lahir="2999-01-01", berat_lahir=3.1, ... | 422 | ERR-VAL-04: NIK harus terdiri dari 16 angka | 1 |
| 9 | POST `/balita` | Tambah balita (KK baru) (Kader) | nama="Uji Postman Balita", jenis_kelamin="Perempuan", tanggal_lahir="2025-01-10", berat_lahir=3.1, ... | 201 | - (sukses) | 1 |
| 10 | POST `/balita` | Tambah balita: NIK sudah terdaftar (Kader) | nama="Uji Postman Balita", jenis_kelamin="Perempuan", tanggal_lahir="2025-01-10", berat_lahir=3.1, ... | 409 | ERR-VAL-05: Data dengan NIK ini sudah terdaftar | 1 |
| 11 | GET `/balita/{{idBalita}}` | Detail balita (Kader) | - | 200 | - (sukses) | 1 |
| 12 | GET `/balita/bukan-uuid` | Detail balita: ID bukan UUID (Kader) | - | 404 | ERR-DATA-01: Data sasaran tidak ditemukan. | 1 |
| 13 | PATCH `/balita/{{idBalita}}` | Ubah balita: kontak (Kader) | kontak="081211112222" | 200 | - (sukses) | 1 |
| 14 | PATCH `/balita/{{idBalita}}` | Ubah balita: nama dikosongkan (Kader) | nama="" | 422 | ERR-VAL-01: Bagian ini wajib diisi | 1 |
| 15 | PATCH `/balita/{{idBalita}}` | Ubah balita: NIK milik warga lain (Kader) | nik="3313010000000101" | 409 | ERR-VAL-05: Data dengan NIK ini sudah terdaftar | 1 |
| 16 | POST `/balita/{{idBalita}}/pemeriksaan` | Pemeriksaan balita: berat 0 (Kader) | tanggal_periksa="2026-10-01", berat_badan=0, tinggi_panjang_badan=76, lila=13, ... | 422 | ERR-VAL-02: Masukkan angka yang valid lebih dari 0 | 1 |
| 17 | POST `/balita/{{idBalita}}/pemeriksaan` | Pemeriksaan balita: tanggal sebelum lahir (Kader) | tanggal_periksa="2000-01-01", berat_badan=9, tinggi_panjang_badan=76, lila=13, ... | 422 | ERR-VAL-11: Tanggal pemeriksaan tidak boleh sebelum tanggal lahir | 1 |
| 18 | POST `/balita/{{idBalita}}/pemeriksaan` | Pemeriksaan balita (hitung z-score) (Kader) | tanggal_periksa="2026-10-01", berat_badan=9, tinggi_panjang_badan=76, lila=13, ... | 201 | - (sukses) | 1 |
| 19 | GET `/balita/{{idBalita}}/riwayat` | Riwayat balita (Kader) | - | 200 | - (sukses) | 1 |
| 20 | POST `/balita/{{idBalita}}/pemeriksaan/{{idPeriksaBalita}}/layanan` | Layanan balita: daftar kosong (Kader) | layanan=[] | 422 | ERR-VAL-01: Bagian ini wajib diisi | 1 |
| 21 | POST `/balita/{{idBalita}}/pemeriksaan/{{idPeriksaBalita}}/layanan` | Layanan balita: Vitamin A (Kader) | layanan=[{"jenis_layanan": "Vitamin A", "tanggal_layanan": "2026-10-01"}] | 201 | - (sukses) | 1 |
| 22 | GET `/faskes` | Daftar faskes tujuan rujukan (Kader) | - | 200 | - (sukses) | 1 |
| 23 | POST `/balita/{{idBalita}}/pemeriksaan/{{idPeriksaBalita}}/isian-pendukung` | Isian pendukung: rujuk tanpa faskes (Kader) | status_rujukan=true | 422 | ERR-VAL-06: Isi tujuan rujukan | 1 |
| 24 | POST `/balita/{{idBalita}}/pemeriksaan/{{idPeriksaBalita}}/isian-pendukung` | Isian pendukung: rujuk ke faskes (Kader) | status_rujukan=true, faskes_id="{{idFaskes}}", alasan_rujukan="Uji rujukan" | 201 | - (sukses) | 1 |
| 25 | POST `/balita/{{idBalita}}/pemeriksaan/{{idPeriksaBalita}}/isian-pendukung` | Isian pendukung: Kader membatalkan rujukan (Kader) | catatan_edukasi="ubah" | 403 | ERR-AUTH-03: Anda tidak memiliki izin untuk mengakses ini. | 1 |
| 26 | POST `/ibu` | Tambah ibu hamil (Kader) | nama="Uji Postman Ibu", tanggal_lahir="1998-02-02", status_ibu="Hamil", nama_suami="Suami Uji", ... | 201 | - (sukses) | 2 |
| 27 | POST `/ibu/{{idIbu}}/pemeriksaan` | Pemeriksaan ibu hamil: usia kehamilan kosong (Kader) | tanggal_periksa="2026-10-01", berat_badan=55, lila=23, tekanan_darah_sistolik=110, ... | 422 | ERR-VAL-01: Bagian ini wajib diisi | 2 |
| 28 | POST `/ibu/{{idIbu}}/pemeriksaan` | Pemeriksaan ibu (KEK dan anemia) (Kader) | tanggal_periksa="2026-10-01", berat_badan=55, lila=23, tekanan_darah_sistolik=110, ... | 201 | - (sukses) | 2 |
| 29 | POST `/ibu/{{idIbu}}/pemeriksaan/{{idPeriksaIbu}}/layanan` | Layanan ibu: TTD dan MT (Kader) | layanan=[{"jenis_layanan": "TTD", "tanggal_layanan": "2026-10-01", "jumlah_tablet": 30, "konsumsi_harian": true}] | 201 | - (sukses) | 2 |
| 30 | GET `/ibu/{{idIbu}}/riwayat` | Riwayat ibu (Kader) | - | 200 | - (sukses) | 2 |
| 31 | POST `/lansia` | Tambah lansia (Kader) | nama="Uji Postman Lansia", jenis_kelamin="Laki-laki", tanggal_lahir="1955-03-03", status_perkawinan="Kawin", ... | 201 | - (sukses) | 3 |
| 32 | POST `/lansia/{{idLansia}}/pemeriksaan` | Pemeriksaan lansia: merokok tanpa kuesioner PUMA (Kader) | tanggal_periksa="2026-10-01", berat_badan=62, tinggi_badan=165, lingkar_perut=88, ... | 422 | ERR-VAL-01: Bagian ini wajib diisi | 3 |
| 33 | POST `/lansia/{{idLansia}}/pemeriksaan` | Pemeriksaan lansia (IMT dan skor PUMA) (Kader) | tanggal_periksa="2026-10-01", berat_badan=62, tinggi_badan=165, lingkar_perut=88, ... | 201 | - (sukses) | 3 |
| 34 | POST `/lansia/{{idLansia}}/pemeriksaan/{{idPeriksaLansia}}/layanan` | Layanan lansia (tidak ada jalurnya) (Kader) | layanan=[] | 404 | ERR-SYS-03: Alamat layanan tidak ditemukan. | 3 |
| 35 | POST `/lansia/{{idLansia}}/pemeriksaan/{{idPeriksaLansia}}/isian-pendukung` | Isian pendukung lansia (TBC) (Kader) | tbc_batuk=true | 201 | - (sukses) | 3 |
| 36 | GET `/lansia/{{idLansia}}/riwayat` | Riwayat lansia (Kader) | - | 200 | - (sukses) | 3 |
| 37 | GET `/sasaran?nama=` | Cari: kata kunci kosong (Kader) | - | 422 | ERR-VAL-01: Bagian ini wajib diisi | 4 |
| 38 | GET `/sasaran?nama=zzzzzz` | Cari: nama tidak ada (Kader) | - | 404 | ERR-DATA-01: Data sasaran tidak ditemukan. | 4 |
| 39 | GET `/sasaran?nama=Uji%20Postman` | Cari: nama ada (Kader) | - | 200 | - (sukses) | 4 |
| 40 | GET `/rekap?bulan=13&tahun=2026` | Rekap: bulan 13 (Kader) | - | 422 | ERR-VAL-01: Bagian ini wajib diisi | 4 |
| 41 | GET `/rekap?bulan=1&tahun=2000` | Rekap: periode tanpa data (pesan ERR-DATA-04) (Kader) | - | 200 | - (sukses) | 4 |
| 42 | GET `/rekap?bulan=10&tahun=2026` | Rekap: Oktober 2026 (Kader) | - | 200 | - (sukses) | 4 |
| 43 | GET `/dashboard` | Dashboard beranda (Kader) | - | 200 | - (sukses) | 4 |
| 44 | GET `/jadwal` | Daftar jadwal mendatang (Kader) | - | 200 | - (sukses) | 5 |
| 45 | POST `/jadwal` | Tambah jadwal: jam selesai sebelum jam mulai (Kader) | nama_kegiatan="Posyandu Uji Postman", jenis_kegiatan="Posyandu", tanggal_pelaksanaan="2099-12-10", jam_mulai="11:00", ... | 422 | ERR-VAL-14: Waktu selesai harus setelah waktu mulai | 5 |
| 46 | POST `/jadwal` | Tambah jadwal: tanggal lampau (Kader) | nama_kegiatan="Posyandu Uji Postman", jenis_kegiatan="Posyandu", tanggal_pelaksanaan="2020-01-01", jam_mulai="08:00", ... | 422 | ERR-VAL-15: Tanggal jadwal tidak boleh sebelum hari ini | 5 |
| 47 | POST `/jadwal` | Tambah jadwal (Kader) | nama_kegiatan="Posyandu Uji Postman", jenis_kegiatan="Posyandu", tanggal_pelaksanaan="2099-12-10", jam_mulai="08:00", ... | 201 | - (sukses) | 5 |
| 48 | PATCH `/jadwal/{{idJadwal}}` | Ubah jadwal (Kader) | lokasi="Posyandu Melati" | 200 | - (sukses) | 5 |
| 49 | DELETE `/jadwal/{{idJadwal}}` | Hapus jadwal oleh Kader (Kader) | - | 403 | ERR-AUTH-03: Anda tidak memiliki izin untuk mengakses ini. | 5 |
| 50 | DELETE `/jadwal/{{idJadwal}}` | Hapus jadwal oleh Koordinator (Koordinator) | - | 200 | - (sukses) | 5 |
| 51 | DELETE `/jadwal/{{idJadwal}}` | Hapus jadwal yang sudah dihapus (Koordinator) | - | 404 | ERR-DATA-09: Jadwal kegiatan tidak ditemukan. | 5 |
| 52 | DELETE `/balita/{{idBalita}}` | Kader menghapus balita lewat API (Kader) | - | 403 | ERR-AUTH-03: Anda tidak memiliki izin untuk mengakses ini. | 6 |
| 53 | GET `/monitoring/ringkasan` | Kader membuka KPI monitoring (Kader) | - | 403 | ERR-AUTH-03: Anda tidak memiliki izin untuk mengakses ini. | 6 |
| 54 | GET `/monitoring/ringkasan` | KPI monitoring hari ini (Koordinator) | - | 200 | - (sukses) | 6 |
| 55 | GET `/monitoring/log?jenis=Salah` | Log: jenis tidak dikenal (Koordinator) | - | 422 | ERR-VAL-01: Bagian ini wajib diisi | 6 |
| 56 | GET `/monitoring/log?dari=2026-12-01&sampai=2026-11-01` | Log: rentang tanggal terbalik (Koordinator) | - | 422 | ERR-VAL-14: Waktu selesai harus setelah waktu mulai | 6 |
| 57 | GET `/monitoring/log?jenis=Ditolak` | Log: percobaan akses ditolak (Koordinator) | - | 200 | - (sukses) | 6 |
| 58 | PUT `/akun/saya/password` | Ganti password: kurang dari 8 karakter (Kader) | password_baru="abc" | 422 | ERR-VAL-07: Password baru minimal 8 karakter | 7 |
| 59 | GET `/akun` | Kader membuka daftar akun (Kader) | - | 403 | ERR-AUTH-03: Anda tidak memiliki izin untuk mengakses ini. | 7 |
| 60 | GET `/akun` | Daftar akun (Koordinator) | - | 200 | - (sukses) | 7 |
| 61 | GET `/akun/kader-tanpa-akun` | Kader terdaftar yang belum punya akun (Koordinator) | - | 200 | - (sukses) | 7 |
| 62 | POST `/akun` | Tambah akun: isian kosong (Koordinator) | sumber="petugas_baru" | 422 | ERR-VAL-01: Bagian ini wajib diisi | 7 |
| 63 | POST `/akun` | Tambah akun petugas baru (Koordinator) | sumber="petugas_baru", nama="Ibu Uji Postman", jenis_kelamin="Perempuan", jabatan_kader="Kader", ... | 201 | - (sukses) | 7 |
| 64 | POST `/akun` | Tambah akun: username sudah dipakai (Koordinator) | sumber="petugas_baru", nama="Ibu Kembar", jenis_kelamin="Perempuan", jabatan_kader="Kader", ... | 409 | ERR-DATA-03: Username/NIK sudah digunakan akun lain. | 7 |
| 65 | PATCH `/akun/{{idAkunSaya}}` | Ubah peran akun sendiri (Koordinator) | peran="User (Kader)" | 422 | ERR-DATA-10: Anda tidak dapat mengubah peran akun Anda sendiri. | 7 |
| 66 | PATCH `/akun/{{idAkunSaya}}/status` | Nonaktifkan akun sendiri (Koordinator) | status_akun="Nonaktif" | 422 | ERR-DATA-05: Anda tidak dapat menonaktifkan akun Anda sendiri. | 7 |
| 67 | PATCH `/akun/{{idAkunBaru}}/status` | Nonaktifkan akun lain (Koordinator) | status_akun="Nonaktif" | 200 | - (sukses) | 7 |
| 68 | PATCH `/akun/bukan-uuid` | Ubah akun: ID bukan UUID (Koordinator) | nama="X" | 404 | ERR-DATA-07: Akun tidak ditemukan. | 7 |
| 69 | DELETE `/lansia/{{idLansia}}` | Koordinator menghapus lansia (Koordinator) | - | 200 | - (sukses) | 8 |
| 70 | DELETE `/ibu/{{idIbu}}` | Koordinator menghapus ibu (Koordinator) | - | 200 | - (sukses) | 8 |
| 71 | DELETE `/balita/{{idBalita}}` | Koordinator menghapus balita (Koordinator) | - | 200 | - (sukses) | 8 |
| 72 | GET `/balita/{{idBalita}}` | Balita yang sudah dihapus (Koordinator) | - | 404 | ERR-DATA-01: Data sasaran tidak ditemukan. | 8 |
| 73 | GET `/tidak-ada` | Alamat API tidak terdaftar (Kader) | - | 404 | ERR-SYS-03: Alamat layanan tidak ditemukan. | 8 |
| 74 | POST `/auth/logout` | Logout Kader (Kader) | - | 200 | - (sukses) | 8 |
| 75 | GET `/jadwal` | Memakai sesi yang sudah logout (Kader) | - | 401 | ERR-AUTH-01: Sesi Anda sudah berakhir. Silakan login kembali. | 8 |

## 4. Skenario galat server dan basis data

| Skenario | Cara menguji | Status | Kode | Yang tampil di layar |
|---|---|---|---|---|
| Basis data mati | Hentikan service SQL Server, lalu buka `GET /status` atau halaman mana pun | 503 | ERR-SYS-01 | Layanan tidak tersedia. Silakan coba lagi. (asal: Sistem) |
| Basis data hidup lagi | Nyalakan SQL Server; tanpa restart backend | 200 | - | Aplikasi kembali normal (pool koneksi dibuat ulang) |
| Query terlalu lama | Melewati `DB_QUERY_TIMEOUT_MS` (bawaan 15 detik) | 503 | ERR-SYS-01 | Layanan tidak tersedia |
| Data ganda dari dua kader bersamaan | Dua request menyimpan data unik yang sama pada waktu bersamaan | 409 | ERR-DATA-11 | Data yang sama sudah tersimpan. Muat ulang halaman... |
| Galat tak terduga di kode | Exception yang tidak dikenal | 500 | ERR-SYS-04 | Terjadi kesalahan pada server. Silakan coba lagi. |
| Backend mati / proxy salah | Matikan backend, frontend tetap menyala | - | ERR-SYS-01 | Layanan tidak tersedia (diuji e2e: respons HTML 500) |
| Koneksi internet putus | Matikan jaringan | - | ERR-SYS-02 | Koneksi terputus dan data belum tersimpan (diuji e2e) |
| Server tidak menjawab | Tidak ada jawaban dalam 20 detik | - | ERR-SYS-05 | Server terlalu lama merespons. Muat ulang halaman... |
| Halaman gagal digambar | Galat render React | - | - | Halaman gagal ditampilkan + tombol muat ulang (BatasGalat) |

Di semua skenario, stack trace, nama tabel, dan query SQL hanya tercatat di log server (`Logger`), tidak pernah dikirim ke layar.

## 5. Endpoint yang perlu dipahami sebelum presentasi

Endpoint di bawah sudah diuji dan lulus, tetapi hasilnya bergantung pada aturan yang tidak terlihat dari request saja. Bagian ini menjelaskan alasan hasil ujinya, supaya bisa dijawab dengan yakin saat ditanya.

| Endpoint | Hasil yang sering ditanyakan | Penjelasan singkat |
|---|---|---|
| `POST /{kelompok}/{id}/pemeriksaan` | Kenapa 201 padahal ada `peringatan: ERR-DATA-02`? | Pemeriksaan tetap tersimpan; hanya kategori yang nilainya di luar tabel acuan ditampilkan "Belum tersedia" (FSD 6.1: ERR-DATA-02 berstatus 200, tanpa rollback). |
| `POST /{kelompok}/{id}/pemeriksaan` | Kenapa isian yang salah dilaporkan dulu, padahal sasaran tidak ada? | Urutan: validasi isian (controller) lalu cek data (service). Isian benar + sasaran tidak ada -> 404 ERR-DATA-01. |
| `POST .../isian-pendukung` | Kenapa kadang 201, kadang 200? | 201 bila isian kunjungan itu baru dibuat, 200 bila isian lama diperbarui (AF-2). |
| `POST .../isian-pendukung` | Kenapa Kader mendapat 403 saat mengubah isian? | Mengosongkan status rujukan yang sudah tersimpan berarti menghapus baris rujukan; menghapus hanya hak Koordinator. |
| `POST .../isian-pendukung` (balita) | Kenapa 422 ERR-VAL-16? | Balita dengan BB/U < -2 SD atau > +1 SD wajib berstatus dirujuk (garis merah dan oranye KMS). |
| `DELETE /{kelompok}/{id}` | Kenapa Kader ditolak dua kali? | Ditolak `AksesPeran` (403) dan, bila lolos, oleh kebijakan RLS SQL Server (error 33504 -> 403). Percobaan dicatat jenis Ditolak. |
| `DELETE /jadwal/{id}` | Kenapa 409 ERR-DATA-06? | Jadwal yang sudah dipakai pemeriksaan/layanan tidak boleh hilang dari riwayat. |
| `PATCH /akun/{id}/status` | Kenapa akun yang dinonaktifkan langsung keluar? | Semua baris sesi akun itu dihapus dalam transaksi yang sama; request berikutnya 401. |
| `GET /monitoring/ringkasan` | Dari mana angka "kader sedang login"? | Jumlah akun Kader yang punya sesi belum kedaluwarsa di tabel `sesi`. |
| `GET /dashboard` | Kenapa datanya bulan lalu, bukan bulan ini? | Beranda menampilkan ringkasan bulan sebelumnya (bulan yang sudah selesai); bulan berjalan ada di Rekap. |
| `GET /rekap` | Kenapa periode kosong tetap 200? | Tidak ada data bukan galat; FSD 6.1 ERR-DATA-04 berstatus 200 dan pesannya dikirim di `message`. |
| `GET /sasaran` | Kenapa tidak ditemukan malah 404, bukan 200 kosong? | Mengikuti FSD-2.25 EF-2: ERR-DATA-01 (404), lalu layar menawarkan registrasi sasaran baru. |

## 6. Cara menjalankan bukti uji

| Bukti | Perintah (folder `backend`) | Hasil |
|---|---|---|
| Unit test kelas OOP | `npm.cmd test` | 17 lulus |
| Uji API otomatis | `npm.cmd run test:api` (backend menyala, database baru) | 67 lulus |
| Koleksi Postman | Postman: Import `tests/postman/Posyandu.postman_collection.json` -> Run collection; atau `npm.cmd run test:postman` | 75 request, semua lulus |
| Uji tampilan (folder `frontend`) | `npm.cmd run test:e2e` | 13 lulus |
| Aturan lapisan | `npm.cmd run arsitektur` | 0 pelanggaran |
