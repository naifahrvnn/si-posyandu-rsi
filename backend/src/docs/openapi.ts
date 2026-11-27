/*
 * Dokumentasi OpenAPI 3.0 untuk Swagger UI di http://localhost:3000/docs
 * Cara uji: POST /auth/login (kaderEndah02 / Posyandu#2026) -> salin id_sesi -> klik Authorize -> isi x-id-sesi.
 */

const err = (code: string, field: string | null, message: string) => ({
  status: 'error',
  data: null,
  message,
  errors: [{ code, field, message }],
});

const resp = (description: string, example?: unknown) => ({
  description,
  ...(example ? { content: { 'application/json': { example } } } : {}),
});

const r401 = resp(
  'Belum login atau sesi berakhir (ERR-AUTH-01)',
  err('ERR-AUTH-01', null, 'Sesi Anda sudah berakhir. Silakan login kembali.'),
);
const r404 = resp('Data tidak ditemukan (ERR-DATA-01)', err('ERR-DATA-01', null, 'Data sasaran tidak ditemukan.'));
const r422 = resp('Validasi gagal (ERR-VAL-xx)', err('ERR-VAL-01', 'nama', 'Bagian ini wajib diisi'));
const r409 = resp('NIK sudah terdaftar (ERR-VAL-05)', err('ERR-VAL-05', 'nik', 'Data dengan NIK ini sudah terdaftar'));
const r403 = resp(
  'Peran tidak berhak, mis. Kader menghapus data atau membuka monitoring (ERR-AUTH-03)',
  err('ERR-AUTH-03', null, 'Anda tidak memiliki izin untuk mengakses ini.'),
);
const r503 = resp('Layanan tidak tersedia (ERR-SYS-01)', err('ERR-SYS-01', null, 'Layanan tidak tersedia. Silakan coba lagi.'));
const ok = (d: string) => resp(d);

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const pidParam = {
  name: 'pid',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'ID pemeriksaan',
};
const body = (example: unknown) => ({ required: true, content: { 'application/json': { example } } });

const contoh = {
  // KK baru: isi alamat KK. KK sudah ada (mis. 3313010101010002): kolom alamat boleh dihapus.
  balita: {
    no_kk: '3313010101019999',
    nik: '3313010000009901',
    nama: 'Bayu Uji',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: '2025-01-15',
    hubungan_keluarga: 'Anak',
    berat_lahir: 3.2,
    panjang_lahir: 49,
    nama_orang_tua: 'Siti Uji',
    kontak: '081234567890',
    alamat: 'Jl. Uji 1',
    dusun: 'Krajan',
    rt: '01',
    rw: '02',
    desa: 'Sukamaju',
    kecamatan: 'Karanganyar',
  },
  ibu: {
    no_kk: '3313010101010002',
    nik: '3313010000009902',
    nama: 'Dewi Uji',
    tanggal_lahir: '1999-04-10',
    hubungan_keluarga: 'Famili Lain',
    status_ibu: 'Hamil',
    nama_suami: 'Rudi Uji',
    kehamilan_ke: 1,
    kontak: '081298760009',
  },
  lansia: {
    no_kk: '3313010101010002',
    nik: '3313010000009903',
    nama: 'Parman Uji',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: '1955-07-01',
    hubungan_keluarga: 'Famili Lain',
    status_perkawinan: 'Kawin',
    pekerjaan: 'Petani',
  },
};

const pemeriksaan = {
  balita: { tanggal_periksa: '2026-11-10', berat_badan: 10.8, tinggi_panjang_badan: 85, lila: 14.2, lika: 46.9 },
  ibu: {
    tanggal_periksa: '2026-11-10',
    berat_badan: 59,
    lila: 24.8,
    tekanan_darah_sistolik: 112,
    tekanan_darah_diastolik: 72,
    usia_kehamilan_minggu: 28,
    bb_sesuai_kurva_kia: true,
    td_sesuai_kurva_kia: true,
    hb: 11.5,
  },
  lansia: {
    tanggal_periksa: '2026-11-10',
    berat_badan: 63,
    tinggi_badan: 165,
    lingkar_perut: 89,
    tekanan_darah_sistolik: 140,
    tekanan_darah_diastolik: 88,
    gula_darah: 150,
    hitung_jari_kanan: 'Normal',
    hitung_jari_kiri: 'Normal',
    berbisik_kanan: 'Normal',
    berbisik_kiri: 'Normal',
    merokok: true,
    rokok_per_hari: 20,
    lama_merokok_tahun: 25,
    puma_gejala_1: false,
    puma_gejala_2: true,
    puma_gejala_3: false,
    puma_gejala_4: false,
  },
};

const isianContoh = {
  tbc_batuk: false,
  tbc_demam: false,
  tbc_bb_tidak_naik: false,
  tbc_kontak_erat: false,
  status_rujukan: true,
  faskes_id: 'D0000000-0000-0000-0000-000000000001',
  alasan_rujukan: 'BB tidak naik',
  catatan_edukasi: 'Pantau berat badan bulan depan.',
};

function pathsKelompok(k: 'balita' | 'ibu' | 'lansia', fsdKelola: string, fsdPeriksa: string, fsdRiwayat: string) {
  const tag = k[0].toUpperCase() + k.slice(1);
  const sec = [{ sesi: [] }];
  const fsdIsian = { balita: 'FSD-2.10', ibu: 'FSD-2.17', lansia: 'FSD-2.23' }[k];
  const layananContoh =
    k === 'balita'
      ? [{ jenis_layanan: 'Vitamin A', tanggal_layanan: '2026-11-10', keterangan: 'Kapsul merah' }]
      : [{ jenis_layanan: 'TTD', tanggal_layanan: '2026-11-10', jumlah_tablet: 30, konsumsi_harian: true }];
  return {
    [`/api/v1/${k}`]: {
      post: {
        tags: [tag],
        summary: `Tambah data ${k} (${fsdKelola})`,
        security: sec,
        requestBody: body(contoh[k]),
        responses: { 201: ok('Tersimpan'), 401: r401, 409: r409, 422: r422, 503: r503 },
      },
    },
    [`/api/v1/${k}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Detail ${k}`,
        security: sec,
        parameters: [idParam],
        responses: { 200: ok('Ditemukan'), 401: r401, 404: r404 },
      },
      patch: {
        tags: [tag],
        summary: `Ubah data ${k} (${fsdKelola} AF-1)`,
        security: sec,
        parameters: [idParam],
        requestBody: body({ kontak: '081200001111' }),
        responses: { 200: ok('Diperbarui'), 401: r401, 404: r404, 409: r409, 422: r422 },
      },
      delete: {
        tags: [tag],
        summary: `Hapus ${k} beserta riwayat (${fsdKelola} AF-3, BR-40) — hanya Koordinator`,
        security: sec,
        parameters: [idParam],
        responses: { 200: ok('Dihapus'), 401: r401, 403: r403, 404: r404 },
      },
    },
    [`/api/v1/${k}/{id}/pemeriksaan`]: {
      post: {
        tags: [tag],
        summary: `Catat pemeriksaan ${k} + hitung kategori (${fsdPeriksa})`,
        security: sec,
        parameters: [idParam],
        requestBody: body(pemeriksaan[k]),
        responses: {
          201: ok('Tersimpan; message ERR-DATA-02 bila ada kategori "Belum tersedia"'),
          401: r401,
          404: r404,
          422: r422,
        },
      },
    },
    [`/api/v1/${k}/{id}/riwayat`]: {
      get: {
        tags: [tag],
        summary: `Riwayat pemeriksaan dan layanan ${k} (${fsdRiwayat})`,
        security: sec,
        parameters: [idParam],
        responses: { 200: ok('Riwayat (message ERR-DATA-04 bila belum ada pemeriksaan)'), 401: r401, 404: r404 },
      },
    },
    [`/api/v1/${k}/{id}/pemeriksaan/{pid}/isian-pendukung`]: {
      post: {
        tags: [tag],
        summary: `Isian pendukung ${k}: skrining TBC, rujukan, edukasi (${fsdIsian})`,
        security: sec,
        parameters: [idParam, pidParam],
        requestBody: body(isianContoh),
        responses: {
          201: ok('Isian baru tersimpan'),
          200: ok('Isian yang sama diperbarui'),
          401: r401,
          404: r404,
          422: resp('ERR-VAL-01/06/08', err('ERR-VAL-06', 'faskes_id', 'Isi tujuan rujukan')),
        },
      },
    },
    ...(k === 'lansia'
      ? {}
      : {
          [`/api/v1/${k}/{id}/pemeriksaan/{pid}/layanan`]: {
            post: {
              tags: [tag],
              summary: `Layanan ${k} (${k === 'balita' ? 'FSD-2.9' : 'FSD-2.16'})`,
              security: sec,
              parameters: [idParam, pidParam],
              requestBody: body({ layanan: layananContoh }),
              responses: {
                201: ok('Tersimpan, satu baris per jenis layanan'),
                401: r401,
                404: r404,
                422: resp('ERR-VAL-01/02/03', err('ERR-VAL-01', 'layanan', 'Bagian ini wajib diisi')),
              },
            },
          },
        }),
  };
}

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API Sistem Informasi Posyandu',
    version: '5.0.0',
    description:
      'Backend Kelompok 6 (konsep OOP, SQL Server). Semua respons memakai envelope {status, data, message, errors}. ' +
      'Basis data: posyandu_db. Akun uji: kaderEndah02 / Posyandu#2026 (data dummy).',
  },
  servers: [{ url: '/' }],
  components: { securitySchemes: { sesi: { type: 'apiKey', in: 'header', name: 'x-id-sesi' } } },
  paths: {
    '/api/v1/status': {
      get: {
        tags: ['Auth'],
        summary: 'Status layanan: server dan basis data (tanpa login)',
        responses: { 200: ok('Server aktif, basis data terhubung'), 503: r503 },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (FSD-2.1)',
        requestBody: body({ username: 'kaderEndah02', password: 'Posyandu#2026' }),
        responses: {
          200: ok('Berisi id_sesi untuk header x-id-sesi'),
          401: resp('ERR-AUTH-02', err('ERR-AUTH-02', null, 'Username atau password tidak valid.')),
          422: r422,
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (FSD-2.2)',
        security: [{ sesi: [] }],
        responses: { 200: ok('Sesi berakhir'), 401: r401 },
      },
    },
    '/api/v1/sasaran': {
      get: {
        tags: ['Cari & Rekap'],
        summary: 'Cari data sasaran berdasarkan nama (FSD-2.25)',
        security: [{ sesi: [] }],
        parameters: [{ name: 'nama', in: 'query', required: true, schema: { type: 'string' }, example: 'raka' }],
        responses: { 200: ok('Daftar sasaran'), 401: r401, 404: r404, 422: r422 },
      },
    },
    '/api/v1/faskes': {
      get: {
        tags: ['Cari & Rekap'],
        summary: 'Daftar faskes untuk tujuan rujukan',
        security: [{ sesi: [] }],
        responses: { 200: ok('Daftar faskes'), 401: r401 },
      },
    },
    '/api/v1/rekap': {
      get: {
        tags: ['Cari & Rekap'],
        summary: 'Rekapitulasi bulanan (FSD-2.26)',
        security: [{ sesi: [] }],
        parameters: [
          { name: 'bulan', in: 'query', required: true, schema: { type: 'integer', minimum: 1, maximum: 12 }, example: 10 },
          { name: 'tahun', in: 'query', required: true, schema: { type: 'integer' }, example: 2026 },
        ],
        responses: { 200: ok('Rekap (message ERR-DATA-04 bila tidak ada data)'), 401: r401, 422: r422 },
      },
    },
    '/api/v1/dashboard': {
      get: {
        tags: ['Dashboard & Jadwal'],
        summary: 'Ringkasan bulan sebelumnya + 5 jadwal mendatang',
        security: [{ sesi: [] }],
        responses: {
          200: ok('sasaran_hadir, balita (stunting, bbu, bb_tb, wajib_dirujuk, sudah_dirujuk), jadwal_mendatang'),
          401: r401,
        },
      },
    },
    '/api/v1/jadwal': {
      get: {
        tags: ['Dashboard & Jadwal'],
        summary: 'Jadwal kegiatan mulai hari ini (maks. 20)',
        security: [{ sesi: [] }],
        responses: { 200: ok('Daftar jadwal'), 401: r401 },
      },
      post: {
        tags: ['Dashboard & Jadwal'],
        summary: 'Tambah jadwal (penanggung jawab = petugas yang login)',
        security: [{ sesi: [] }],
        requestBody: body({
          nama_kegiatan: 'Posyandu Balita Desember',
          jenis_kegiatan: 'Posyandu',
          tanggal_pelaksanaan: '2026-12-10',
          jam_mulai: '08:00',
          jam_selesai: '11:00',
          lokasi: 'Balai Desa Sukamaju',
          keterangan: 'Bawa Buku KIA',
        }),
        responses: { 201: ok('Tersimpan'), 401: r401, 422: r422 },
      },
    },
    '/api/v1/jadwal/{id}': {
      patch: {
        tags: ['Dashboard & Jadwal'],
        summary: 'Ubah jadwal mendatang',
        security: [{ sesi: [] }],
        parameters: [idParam],
        requestBody: body({ jam_mulai: '09:00', jam_selesai: '12:00' }),
        responses: { 200: ok('Diperbarui'), 401: r401, 404: r404, 422: r422 },
      },
      delete: {
        tags: ['Dashboard & Jadwal'],
        summary: 'Hapus jadwal mendatang — hanya Koordinator',
        security: [{ sesi: [] }],
        parameters: [idParam],
        responses: {
          200: ok('Dihapus'),
          401: r401,
          403: r403,
          404: r404,
          409: resp(
            'Jadwal sudah dipakai pemeriksaan/layanan (ERR-DATA-06)',
            err('ERR-DATA-06', 'jadwal_id', 'Data tidak dapat dihapus karena masih dipakai oleh data lain.'),
          ),
        },
      },
    },
    '/api/v1/akun/saya/password': {
      put: {
        tags: ['Akun'],
        summary: 'Ganti password akun sendiri (FSD-2.3) — Kader dan Koordinator',
        security: [{ sesi: [] }],
        requestBody: body({ password_baru: 'PasswordBaru#1' }),
        responses: {
          200: ok('Password berhasil diganti'),
          401: r401,
          422: resp(
            'Kosong (ERR-VAL-01) atau kurang dari 8 karakter (ERR-VAL-07)',
            err('ERR-VAL-07', 'password_baru', 'Password baru minimal 8 karakter'),
          ),
        },
      },
    },
    '/api/v1/akun': {
      get: {
        tags: ['Akun'],
        summary: 'Daftar akun (FSD-2.4, SCR-18) — hanya Koordinator',
        security: [{ sesi: [] }],
        responses: { 200: ok('Nama, username, peran, status, akun_saya'), 401: r401, 403: r403 },
      },
      post: {
        tags: ['Akun'],
        summary: 'Tambah akun (FSD-2.4): dari kader terdaftar atau petugas baru — hanya Koordinator',
        security: [{ sesi: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              examples: {
                petugas_baru: {
                  value: {
                    sumber: 'petugas_baru',
                    nama: 'Ibu Contoh',
                    jenis_kelamin: 'Perempuan',
                    jabatan_kader: 'Kader',
                    username: 'kaderContoh06',
                    password_awal: 'AwalKader#1',
                  },
                },
                kader_terdaftar: {
                  value: {
                    sumber: 'kader_terdaftar',
                    petugas_id: 'A0000000-0000-0000-0000-000000000099',
                    username: 'kaderContoh07',
                    password_awal: 'AwalKader#1',
                    peran: 'User (Kader)',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: ok('Akun baru, status Aktif, peran bawaan User (Kader)'),
          401: r401,
          403: r403,
          409: resp(
            'Username/NIK dipakai atau kader sudah punya akun (ERR-DATA-03)',
            err('ERR-DATA-03', 'username', 'Username/NIK sudah digunakan akun lain.'),
          ),
          422: r422,
        },
      },
    },
    '/api/v1/akun/kader-tanpa-akun': {
      get: {
        tags: ['Akun'],
        summary: 'Kader terdaftar yang belum punya akun — hanya Koordinator',
        security: [{ sesi: [] }],
        responses: { 200: ok('Daftar petugas_id, nama, jenis_kelamin, jabatan_kader'), 401: r401, 403: r403 },
      },
    },
    '/api/v1/akun/{id}': {
      patch: {
        tags: ['Akun'],
        summary:
          'Ubah nama, username, atau peran (FSD-2.4 AF-1; peran akun sendiri tidak bisa diubah, ERR-DATA-10) — hanya Koordinator',
        security: [{ sesi: [] }],
        parameters: [idParam],
        requestBody: body({ nama: 'Ibu Endah Sari', peran: 'User (Kader)' }),
        responses: { 200: ok('Akun setelah diubah'), 401: r401, 403: r403, 404: r404, 409: resp('ERR-DATA-03'), 422: r422 },
      },
    },
    '/api/v1/akun/{id}/status': {
      patch: {
        tags: ['Akun'],
        summary: 'Nonaktifkan / aktifkan kembali akun (FSD-2.4 AF-2) — hanya Koordinator',
        security: [{ sesi: [] }],
        parameters: [idParam],
        requestBody: body({ status_akun: 'Nonaktif' }),
        responses: {
          200: ok('Status baru; sesi akun nonaktif langsung berakhir'),
          401: r401,
          403: r403,
          404: r404,
          422: resp(
            'Menonaktifkan akun sendiri (ERR-DATA-05)',
            err('ERR-DATA-05', 'status_akun', 'Anda tidak dapat menonaktifkan akun Anda sendiri.'),
          ),
        },
      },
    },
    '/api/v1/monitoring/ringkasan': {
      get: {
        tags: ['Monitoring (Koordinator)'],
        summary: 'KPI hari ini: total aktivitas, kader sedang login, create, update (FSD-2.5)',
        security: [{ sesi: [] }],
        responses: { 200: ok('Ringkasan'), 401: r401, 403: r403 },
      },
    },
    '/api/v1/monitoring/log': {
      get: {
        tags: ['Monitoring (Koordinator)'],
        summary: 'Riwayat aktivitas, terbaru di atas (FSD-2.5, SCR-19)',
        security: [{ sesi: [] }],
        parameters: [
          { name: 'cari', in: 'query', schema: { type: 'string' }, example: 'endah', description: 'Sebagian nama/username' },
          {
            name: 'jenis',
            in: 'query',
            schema: { type: 'string', enum: ['Login', 'Logout', 'Input', 'Edit', 'Delete', 'Ditolak'] },
          },
          { name: 'dari', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-11-01' },
          { name: 'sampai', in: 'query', schema: { type: 'string', format: 'date' }, example: '2026-11-30' },
          { name: 'halaman', in: 'query', schema: { type: 'integer', minimum: 1 }, example: 1 },
          { name: 'per_halaman', in: 'query', schema: { type: 'integer', enum: [10, 20, 50] }, example: 20 },
        ],
        responses: {
          200: ok('{ baris, total, halaman, per_halaman, total_halaman }; message ERR-DATA-04 bila kosong'),
          401: r401,
          403: r403,
          422: r422,
        },
      },
    },
    ...pathsKelompok('balita', 'FSD-2.6', 'FSD-2.7, 2.8', 'FSD-2.11'),
    ...pathsKelompok('ibu', 'FSD-2.12', 'FSD-2.13 s.d. 2.15', 'FSD-2.18'),
    ...pathsKelompok('lansia', 'FSD-2.19', 'FSD-2.20 s.d. 2.22', 'FSD-2.24'),
  },
};
