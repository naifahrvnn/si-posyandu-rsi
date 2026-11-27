# Backend — API Sistem Informasi Posyandu

Express 5 + TypeScript + SQL Server, ditulis dengan konsep OOP. Cara menjalankan ada di `README.md` folder utama.

## Struktur

Dikelompokkan per fitur (materi RSI-12: *group by feature*), satu kelas per file. Satu folder di `modules/` = satu kelompok fungsi FSD.

```
backend/
├── db/                         01 schema, 02 objects, 03 security, 04 seed, 05 uji hak akses (SSMS)
├── tests/unit/                 Unit test kelas OOP (tanpa database)
├── tests/api.test.ts           Uji API semua modul (server harus menyala)
├── scripts/peta-oop.ts         Peta lokasi tanda konsep OOP (npm.cmd run oop)
├── scripts/cek-arsitektur.ts   Pemeriksa aturan lapisan (npm.cmd run arsitektur)
└── src/
    ├── index.ts                Menjalankan server
    ├── App.ts                  Express: middleware global -> pasang semua Modul -> penangan error
    ├── RakitanModul.ts         Composition root: satu-satunya tempat objek dirakit (dependency injection)
    ├── config/Konfigurasi.ts   Satu-satunya pembaca .env (port, CORS, koneksi DB, masa sesi)
    ├── core/                   Infrastruktur bersama, tidak tahu modul mana pun
    │   ├── Database, Kueri     Koneksi (Singleton) dan pembungkus query berparameter
    │   ├── Modul               Interface { jalur, router } yang di-implements setiap controller
    │   ├── Logger              Satu-satunya penulis log server (JSON satu baris)
    │   ├── HttpStatus, BatasIsian   Nama untuk status HTTP dan batas isian (tidak ada angka ajaib)
    │   ├── ValidatorDasar, HttpResponse, ErrorHandler, Tanggal, Uuid
    │   ├── errors/             AppError (abstract) + 5 subclass, ErrorCatalog, PenerjemahGalat (galat SQL/JSON -> kode FSD)
    │   ├── audit/              PencatatAudit, RingkasanPerubahan, EntriAudit
    │   └── peristiwa/          Observer: PusatPeristiwa, Pengamat, PencatatAktivitas, PencatatGalat
    ├── keamanan/               Dipakai semua modul: Pengguna (abstract), Kader, Koordinator, PabrikPengguna,
    │                           Password (value object bcrypt), SesiMiddleware, SesiRepository, AksesPeran (RBAC)
    ├── docs/openapi.ts         Swagger di /docs
    └── modules/                                                         Fungsi FSD
        ├── auth/               AuthController, AuthService, LoginValidator    2.1, 2.2
        ├── akun/               Akun, AkunRepository, AkunValidator,           2.3, 2.4
        │                       GantiPasswordService, KelolaAkunService, AkunController
        ├── monitoring/         FilterLog, LogAktivitasRepository, MonitoringService, MonitoringValidator, MonitoringController   2.5
        ├── sasaran/            Sasaran (abstract), SasaranDewasa, Alamat, repository, service (generic), controller, KelompokRouter   2.6, 2.12, 2.19
        ├── balita/             Balita, PemeriksaanBalita, StandarAntropometri (z-score WHO), validator, repository, service   2.6–2.11
        ├── ibu/                Ibu, PemeriksaanIbu, validator, repository, service                                           2.12–2.18
        ├── lansia/             Lansia, PemeriksaanLansia (IMT, kuesioner PUMA), validator, repository, service               2.19–2.24
        ├── pemeriksaan/        Pemeriksaan (abstract), TabelAcuan, AturanRepository, PemeriksaanRepository, PemeriksaanService (abstract), controller
        ├── layanan/            Layanan, IsianPendukung, KunjunganService (abstract), LayananService, IsianPendukungService, Faskes
        ├── cari/               CariRepository, CariService, CariValidator, CariController   2.25
        ├── rekap/              RekapRepository, RekapService, RekapValidator, RekapController   2.26
        ├── status/             StatusService, StatusController (GET /status: server dan basis data)
        ├── jadwal/             JadwalKegiatan, validator, repository (view v_jadwal_mendatang), service, controller   Beranda
        └── dashboard/          DashboardService, DashboardController   Beranda
```

Alur satu request: `Router → Controller → Validator → Service → Repository → Kueri → SQL Server`.

Aturan lapisan (dicek otomatis oleh `npm.cmd run arsitektur`):

1. `core/` berdiri sendiri, tidak mengimpor `keamanan/` atau `modules/`.
2. `keamanan/` tidak mengimpor `modules/`.
3. Controller tidak menyentuh basis data (tidak mengimpor `Database`, `Kueri`, atau repository).
4. SQL hanya ditulis di Repository (ditambah `Kueri` dan `PencatatAudit` di core).
5. Controller tidak mengimpor controller lain; semua dirakit di `RakitanModul.ts`.
6. Hanya `core/Logger.ts` yang menulis ke konsol (tidak ada `console.log` sisa debug).
7. Hanya `config/Konfigurasi.ts` yang membaca `process.env`.
8. `config/` tidak mengimpor bagian lain proyek.

## Penanganan galat

Semua galat berakhir di satu penangan terpusat (`core/ErrorHandler.ts`) dengan format yang sama `{ status: 'error', data: null, message, errors: [{ code, field, message }] }`. `PenerjemahGalat` memetakan galat mentah ke kode katalog:

| Galat mentah | Kode | Status |
|---|---|---|
| `AppError` dari validator atau service | kode aslinya | sesuai katalog |
| Body bukan JSON / body > 100 kb | ERR-VAL-17 / ERR-VAL-18 | 400 / 413 |
| SQL 33504 (ditolak RLS) | ERR-AUTH-03 (+ dicatat jenis Ditolak) | 403 |
| SQL 547 saat DELETE (foreign key) | ERR-DATA-06 | 409 |
| SQL 2601/2627 (data ganda) | ERR-DATA-11 | 409 |
| Koneksi basis data putus / query lewat batas waktu | ERR-SYS-01 | 503 |
| Selain itu | ERR-SYS-04 | 500 |

Detail teknis (stack trace, pesan SQL) hanya ditulis `Logger` ke log server.

Menambah modul baru cukup tiga langkah: buat folder di `modules/`, buat controller yang `implements Modul`, lalu daftarkan di `RakitanModul.modul()`.

## Konsep OOP (materi RSI-12 Implementation)

Setiap konsep ditandai komentar di kode, misalnya `[ENKAPSULASI]`. Cari tanda itu (Ctrl+Shift+F di VS Code), atau jalankan `npm.cmd run oop` untuk daftar lokasi lengkap per konsep.

| Materi | Contoh di kode |
|---|---|
| Encapsulation: data hiding | Atribut `private` di `Sasaran`, `Pemeriksaan`, `IsianPendukung`, `JadwalKegiatan`; data hanya bisa diubah lewat method yang memvalidasi (`perbaruiIdentitas()`, `isiUlang()`, `terapkanPerubahan()`) |
| Encapsulation: information hiding | `Kueri` menyembunyikan library mssql; `Password` menyimpan teks password secara private dan hanya mengeluarkan hash bcrypt; `JadwalKegiatan` menyembunyikan cara jam disimpan di kolom keterangan; `StandarAntropometri` menyembunyikan tabel LMS dan rumus z-score |
| Access control (private, public, protected) | `private`: constructor entitas + factory method, `Database.instance`; `public`: getter dan method layanan; `protected`: constructor `Sasaran`/`Pemeriksaan`, `perbaruiIdentitas()`, `daftarKategori`, atribut `db` di `PemeriksaanService` yang dipakai subclass |
| Inheritance (is-a, maks. 3 tingkat) | `Kader`, `Koordinator extends Pengguna`; `OtorisasiError extends AppError`; `Balita extends Sasaran`; `Ibu`, `Lansia extends SasaranDewasa extends Sasaran`; `PemeriksaanBalita extends Pemeriksaan`; `ValidationError extends AppError extends Error`; constructor memanggil `super(...)` |
| Polymorphism compile-time (overloading) | Constructor `AppError` (satu kode atau daftar error); `HttpResponse.sukses()` (3 atau 4 parameter); `Pengguna.boleh()` dan `AksesPeran.wajib()` (satu hak atau daftar hak) |
| Polymorphism run-time (overriding) | `override` diwajibkan (`noImplicitOverride`): `Pengguna.boleh(hak)` dijawab `daftarHak` milik `Kader`/`Koordinator` (RBAC); `Pemeriksaan.ringkasan` untuk detail log; `hitungUmur()`, `toJSON()` memanggil `super.toJSON()`, `perluDirujuk` (bawaan `false` di `Pemeriksaan`, balita menimpa dengan aturan garis KMS), `buatPemeriksaan()` |
| Polymorphism abstract class / interface | Kelas `abstract`: `Sasaran`, `Pemeriksaan`, `PemeriksaanService`, `KunjunganService`, `SasaranRepository`, `ValidatorDasar`, `AppError`; interface `Modul` (di-`implements` semua controller), `PenanganSasaran`, `PenanganPemeriksaan`, `PenanganSimpan`, `Pengamat` (di-`implements` `PencatatAktivitas`, `PencatatGalat`) |
| Polymorphism parametrik (generics) | `SasaranService<T, I>`, `SasaranRepository<T>`, `PemeriksaanService<S, P, In>`, `KunjunganService<P>`, `Database.transaksi<T>()` |
| Design pattern | Singleton (`Database`), Factory method (`Balita.buat()`, `PemeriksaanBalita.hitung()`, `JadwalKegiatan.dariBaris()`), Observer (`PusatPeristiwa` + pengamat), Repository, Template method (`PemeriksaanService.catat()`) |
| Coupling rendah (data coupling) | Objek dikirim lewat constructor di `RakitanModul.ts` (dependency injection); `App.ts` hanya mengenal interface `Modul`; service menerbitkan peristiwa tanpa tahu siapa pengamatnya; `KelompokRouter` hanya bergantung pada interface |
| Cohesion tinggi (functional) | Satu kelas satu tugas: validator hanya validasi, repository hanya SQL, service hanya aturan bisnis, `StandarAntropometri` hanya klasifikasi gizi |
| Asosiasi, agregasi, komposisi | Asosiasi: `Pengguna` dikirim sebagai parameter ke service; agregasi: service menyimpan `Database` dan `PusatPeristiwa` dari luar; komposisi: `Sasaran` membuat objek `Alamat` sendiri |
| Asinkron | `async/await` di semua service dan repository; `Promise.all` di `DashboardService` dan `PemeriksaanService.riwayat()`; antrean query di `Kueri` |
| Coding standards | Kelas PascalCase, method/variabel camelCase, konstanta UPPER_SNAKE (`BATAS_DAFTAR`, `GARIS_MERAH`); komentar JSDoc; error dicatat dengan konteks (user, waktu, operasi) lewat `PencatatGalat`; query berparameter; password DB di `.env`, tidak di kode |

## Basis data

- Database `posyandu_db` (EER: `warga` superclass, `balita`/`ibu`/`lansia` subclass dengan PK `warga_id`; alamat di `kartu_keluarga`; rujukan ke `faskes`).
- Skrip dikelompokkan per jenis, seperti struktur umum proyek basis data: `01_schema` (tabel), `02_objects` (function, view, stored procedure, trigger), `03_security` (role, login `posyandu_app`, kebijakan RLS), `04_seed` (data contoh), dan `05_uji_hak_akses` (opsional). Isi skrip kelompok tetap utuh; tambahan aplikasi ditaruh sebagai bagian terpisah di file yang sesuai jenisnya.
- `02_objects` dan `03_security` aman dijalankan ulang, jadi pembaruan objek atau hak akses cukup menjalankan ulang dua file itu.
- Backend memakai objek basis data kelompok: view `v_jadwal_mendatang` (daftar jadwal) dan trigger `trg_warga_hapus` (hapus sasaran).
- User yang login dikirim ke trigger log lewat `sp_set_session_context` (`app_user_id`).
- Kategori balita dihitung dengan z-score WHO (Permenkes 2/2020) di `StandarAntropometri`; kategori lain membaca tabel acuan `aturan_kategori` (BR-24). Nilai ambang `aturan_kategori` adalah contoh untuk uji.

## Usulan revisi FSD dan TSD

Kode error baru dan aturan yang belum tertulis di FSD/TSD (kuesioner PUMA, Kelola Akun, jenis log Ditolak, logout otomatis, dan lain-lain) dikumpulkan di `../USULAN_REVISI_FSD_TSD.md`. Di kode, kode error baru ditandai komentar `usulan` di `src/core/errors/ErrorCatalog.ts`.
