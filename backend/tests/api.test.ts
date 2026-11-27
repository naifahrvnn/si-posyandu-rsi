/*
 * Uji API seluruh modul. Server harus menyala dan basis data baru berisi skrip db/01 s.d. 04.
 * Jalankan: npm.cmd run test:api
 * Semua data uji adalah data dummy.
 */
import assert from 'node:assert/strict';

const BASE = (process.env.BASE_URL ?? 'http://localhost:3000') + '/api/v1';
let sesi = '';
/** Sesi Koordinator (Super User): satu-satunya peran yang boleh DELETE dan membuka monitoring. */
let sesiKoordinator = '';

interface Respon {
  status: number;
  json: { status: string; data: any; message: string; errors: { code: string; field: string | null }[] | null };
}

async function api(method: string, path: string, body?: unknown, idSesi = sesi): Promise<Respon> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(idSesi ? { 'x-id-sesi': idSesi } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Respon['json'] };
}

const kodeErr = (r: Respon) => (r.json.errors ?? []).map((e) => `${e.field}:${e.code}`).sort();
const nikAcak = () => '33' + String(Date.now()).slice(-10) + String(Math.floor(Math.random() * 9000) + 1000);
const kkBaru = nikAcak();
const alamatKk = { alamat: 'Jl. Uji 1', dusun: 'Uji', rt: '01', rw: '01', desa: 'Sukamaju', kecamatan: 'Karanganyar' };
/** Balita masuk KK baru (alamat diisi); ibu dan lansia masuk KK yang sudah ada di data contoh SMBD. */
const alamat = { no_kk: kkBaru, hubungan_keluarga: 'Anak', ...alamatKk };
const kkLama = (hubungan: string) => ({ no_kk: '3302240101010002', hubungan_keluarga: hubungan });

const kasus: [string, () => Promise<void>][] = [];
const uji = (nama: string, fn: () => Promise<void>) => kasus.push([nama, fn]);
const id: Record<string, string> = {};

/** Kirim body mentah (bukan JSON.stringify) untuk menguji body rusak atau terlalu besar. */
async function apiMentah(method: string, path: string, bodyMentah: string, idSesi = sesi): Promise<Respon> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(idSesi ? { 'x-id-sesi': idSesi } : {}) },
    body: bodyMentah,
  });
  return { status: res.status, json: (await res.json()) as Respon['json'] };
}

uji('Status layanan: server dan basis data siap -> 200 (tanpa login)', async () => {
  const r = await api('GET', '/status', undefined, '');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.basis_data, 'terhubung');
});
uji('Body JSON rusak -> 400 ERR-VAL-17; body terlalu besar -> 413 ERR-VAL-18 (format error tetap sama)', async () => {
  const rusak = await apiMentah('POST', '/auth/login', '{"username": "kaderEndah02", ', '');
  assert.equal(rusak.status, 400);
  assert.deepEqual(kodeErr(rusak), ['null:ERR-VAL-17']);
  const besar = await apiMentah('POST', '/auth/login', JSON.stringify({ username: 'x'.repeat(200_000), password: 'y' }), '');
  assert.equal(besar.status, 413);
  assert.deepEqual(kodeErr(besar), ['null:ERR-VAL-18']);
  for (const r of [rusak, besar]) {
    assert.equal(r.json.status, 'error');
    assert.ok(!/SyntaxError|stack|entity/i.test(JSON.stringify(r.json)), 'detail teknis tidak boleh bocor');
  }
});
uji('Login: isian kosong -> 422 ERR-VAL-01', async () => {
  const r = await api('POST', '/auth/login', { username: '', password: '' }, '');
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['password:ERR-VAL-01', 'username:ERR-VAL-01']);
});
uji('Login: password salah dan akun tidak ada -> 401 ERR-AUTH-02 (pesan sama, tanpa kata NIK)', async () => {
  const a = await api('POST', '/auth/login', { username: 'kaderEndah02', password: 'salah' }, '');
  const b = await api('POST', '/auth/login', { username: 'tidakada99', password: 'Posyandu#2026' }, '');
  for (const r of [a, b]) assert.equal(r.status, 401);
  assert.equal(a.json.message, b.json.message);
  assert.ok(!a.json.message.includes('NIK'));
});
uji('Login Koordinator (Super User) berhasil', async () => {
  const r = await api('POST', '/auth/login', { username: 'kaderNovita01', password: 'Posyandu#2026' }, '');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.pengguna.peran, 'Super User');
  sesiKoordinator = r.json.data.id_sesi;
});
uji('Login berhasil -> id_sesi 64 karakter', async () => {
  const r = await api('POST', '/auth/login', { username: 'kaderEndah02', password: 'Posyandu#2026' }, '');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.pengguna.nama_pengguna, 'Ibu Endah');
  assert.equal(r.json.data.id_sesi.length, 64);
  sesi = r.json.data.id_sesi;
});
uji('Tanpa sesi -> 401 ERR-AUTH-01', async () => {
  const r = await api('GET', '/sasaran?nama=raka', undefined, '');
  assert.equal(r.status, 401);
  assert.equal(r.json.errors![0].code, 'ERR-AUTH-01');
});

// ---------- Balita ----------
uji('Balita: KK baru tanpa alamat -> 422 (alamat KK wajib)', async () => {
  const r = await api('POST', '/balita', {
    nik: nikAcak(),
    nama: 'X',
    jenis_kelamin: 'Perempuan',
    tanggal_lahir: '2025-01-10',
    berat_lahir: 3,
    panjang_lahir: 48,
    nama_orang_tua: 'Y',
    no_kk: nikAcak(),
    hubungan_keluarga: 'Anak',
  });
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), [
    'alamat:ERR-VAL-01',
    'desa:ERR-VAL-01',
    'dusun:ERR-VAL-01',
    'kecamatan:ERR-VAL-01',
    'rt:ERR-VAL-01',
    'rw:ERR-VAL-01',
  ]);
});
uji('Balita: tambah (KK baru dibuat) -> 201, umur dalam bulan, alamat dari KK', async () => {
  const r = await api('POST', '/balita', {
    nik: nikAcak(),
    nama: 'Uji Balita',
    jenis_kelamin: 'Perempuan',
    tanggal_lahir: '2025-01-10',
    berat_lahir: 3.1,
    panjang_lahir: 48,
    nama_orang_tua: 'Ibu Uji',
    ...alamat,
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.satuan_umur, 'bulan');
  assert.equal(r.json.data.dusun_rt_rw, 'Dusun Uji RT 01/RW 01');
  id.balita = r.json.data.id;
  id.nikBalita = r.json.data.nik;
});
uji('Balita: NIK ganda -> 409 ERR-VAL-05', async () => {
  const r = await api('POST', '/balita', {
    nik: id.nikBalita,
    nama: 'X',
    jenis_kelamin: 'Perempuan',
    tanggal_lahir: '2025-01-10',
    berat_lahir: 3,
    panjang_lahir: 48,
    nama_orang_tua: 'Y',
    ...alamat,
  });
  assert.equal(r.status, 409);
});
uji('Kepala Keluarga kedua dalam satu KK -> 422 hubungan_keluarga', async () => {
  const r = await api('POST', '/lansia', {
    nik: nikAcak(),
    nama: 'Kepala Ganda',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: '1950-01-01',
    ...kkLama('Kepala Keluarga'),
  });
  assert.deepEqual(kodeErr(r), ['hubungan_keluarga:ERR-VAL-13']);
});
uji('Balita: validasi (NIK, No. KK, tanggal depan, kontak) -> 422', async () => {
  const r = await api('POST', '/balita', {
    nik: '12',
    nama: 'X',
    jenis_kelamin: 'Perempuan',
    tanggal_lahir: '2999-01-01',
    berat_lahir: 3,
    panjang_lahir: 48,
    nama_orang_tua: 'Y',
    kontak: '08ab',
    ...alamat,
    no_kk: '123',
  });
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['kontak:ERR-VAL-09', 'nik:ERR-VAL-04', 'no_kk:ERR-VAL-12', 'tanggal_lahir:ERR-VAL-03']);
});
uji('Balita: ubah -> 200 dan updated_at terisi', async () => {
  const r = await api('PATCH', `/balita/${id.balita}`, { kontak: '081211112222' });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.kontak, '081211112222');
  assert.ok(r.json.data.updated_at);
});
uji('Balita: pemeriksaan pertama -> status B (Pertama Kali Ditimbang), created_at terisi', async () => {
  const r = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 9,
    tinggi_panjang_badan: 76,
    lila: 13,
    lika: 45,
  });
  assert.equal(r.status, 201);
  assert.ok(r.json.data.created_at);
  assert.equal(r.json.data.status_berat_badan, 'B');
  id.pb = r.json.data.id;
});
uji('Balita: pemeriksaan kedua BB naik -> status N', async () => {
  const r = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    tanggal_periksa: '2026-11-01',
    berat_badan: 9.4,
    tinggi_panjang_badan: 77,
    lila: 13.2,
    lika: 45.3,
  });
  assert.equal(r.json.data.status_berat_badan, 'N');
});
uji('Balita: pemeriksaan nilai 0, tanggal kosong, dan tanggal sebelum lahir -> 422', async () => {
  const r = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    berat_badan: 0,
    tinggi_panjang_badan: 77,
    lila: 13,
    lika: 45,
  });
  assert.deepEqual(kodeErr(r), ['berat_badan:ERR-VAL-02', 'tanggal_periksa:ERR-VAL-01']);
  const sebelumLahir = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    tanggal_periksa: '2000-01-01',
    berat_badan: 9,
    tinggi_panjang_badan: 77,
    lila: 13,
    lika: 45,
  });
  assert.deepEqual(kodeErr(sebelumLahir), ['tanggal_periksa:ERR-VAL-11']);
});
uji('Balita: rujuk tanpa faskes dan alasan -> 422 ERR-VAL-06 / ERR-VAL-01', async () => {
  const r = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/isian-pendukung`, { status_rujukan: true });
  assert.deepEqual(kodeErr(r), ['alasan_rujukan:ERR-VAL-01', 'faskes_id:ERR-VAL-06']);
});
uji('Balita: layanan kosong -> 422; layanan TTD (khusus ibu) -> 422', async () => {
  const a = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/layanan`, { layanan: [] });
  assert.deepEqual(kodeErr(a), ['layanan:ERR-VAL-01']);
  const b = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/layanan`, {
    layanan: [{ jenis_layanan: 'TTD', tanggal_layanan: '2026-10-01' }],
  });
  assert.deepEqual(kodeErr(b), ['layanan.0.jenis_layanan:ERR-VAL-01']);
});
uji('Balita: layanan Vitamin A -> 201', async () => {
  const r = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/layanan`, {
    layanan: [{ jenis_layanan: 'Vitamin A', tanggal_layanan: '2026-10-01' }],
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.length, 1);
});
uji('Faskes: daftar untuk pilihan tujuan rujukan', async () => {
  const r = await api('GET', '/faskes');
  assert.equal(r.status, 200);
  assert.ok(r.json.data.length >= 3);
  id.faskes = r.json.data[0].faskes_id;
});
uji('Balita: isian + rujukan -> 201; batal rujuk: Kader 403, Koordinator 200 (rujukan terhapus)', async () => {
  const a = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/isian-pendukung`, {
    status_rujukan: true,
    faskes_id: id.faskes,
    alasan_rujukan: 'Uji rujukan',
  });
  assert.equal(a.status, 201);
  assert.equal(a.json.data.faskes_id, id.faskes);
  assert.ok(a.json.data.nama_faskes);
  // Membatalkan rujukan = menghapus baris rujukan -> hanya Koordinator
  const tolak = await api('POST', `/balita/${id.balita}/pemeriksaan/${id.pb}/isian-pendukung`, { catatan_edukasi: 'ubah' });
  assert.equal(tolak.status, 403);
  const b = await api(
    'POST',
    `/balita/${id.balita}/pemeriksaan/${id.pb}/isian-pendukung`,
    { catatan_edukasi: 'ubah' },
    sesiKoordinator,
  );
  assert.equal(b.status, 200);
  assert.equal(a.json.data.id, b.json.data.id);
  assert.equal(b.json.data.status_rujukan, false);
  assert.equal(b.json.data.faskes_id, null);
});
uji('Balita: riwayat terbaru di atas + layanan', async () => {
  const r = await api('GET', `/balita/${id.balita}/riwayat`);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.pemeriksaan.length, 2);
  assert.equal(r.json.data.pemeriksaan[0].tanggal_periksa, '2026-11-01');
  assert.equal(r.json.data.layanan.length, 1);
});

// ---------- Ibu ----------
uji('Ibu: tambah -> 201, umur dalam tahun', async () => {
  const r = await api('POST', '/ibu', {
    nik: nikAcak(),
    nama: 'Uji Ibu',
    tanggal_lahir: '1998-02-02',
    status_ibu: 'Hamil',
    nama_suami: 'Suami Uji',
    kehamilan_ke: 1,
    ...kkLama('Famili Lain'),
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.satuan_umur, 'tahun');
  id.ibu = r.json.data.id;
});
uji('Ibu hamil: usia kehamilan kosong -> 422 ERR-VAL-01', async () => {
  const r = await api('POST', `/ibu/${id.ibu}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 55,
    lila: 23,
    tekanan_darah_sistolik: 110,
    tekanan_darah_diastolik: 70,
    bb_sesuai_kurva_kia: true,
    td_sesuai_kurva_kia: false,
  });
  assert.deepEqual(kodeErr(r), ['usia_kehamilan_minggu:ERR-VAL-01']);
});
uji('Ibu hamil: kurva KIA kosong -> 422; ibu menyusui tanpa kurva KIA -> 201', async () => {
  const r = await api('POST', `/ibu/${id.ibu}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 55,
    lila: 24,
    tekanan_darah_sistolik: 110,
    tekanan_darah_diastolik: 70,
    usia_kehamilan_minggu: 20,
  });
  assert.deepEqual(kodeErr(r), ['bb_sesuai_kurva_kia:ERR-VAL-01', 'td_sesuai_kurva_kia:ERR-VAL-01']);
  // Dina Astri (data contoh 04_seed.sql) berstatus Menyusui
  const m = await api('POST', '/ibu/C0000000-0000-0000-0000-000000000302/pemeriksaan', {
    tanggal_periksa: '2026-11-13',
    berat_badan: 55,
    lila: 25,
    tekanan_darah_sistolik: 120,
    tekanan_darah_diastolik: 80,
  });
  assert.equal(m.status, 201);
  assert.equal(m.json.data.bb_sesuai_kurva_kia, null);
});
uji('Ibu: pemeriksaan -> KEK dari LILA, anemia dari Hb', async () => {
  const r = await api('POST', `/ibu/${id.ibu}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 55,
    lila: 23,
    tekanan_darah_sistolik: 110,
    tekanan_darah_diastolik: 70,
    usia_kehamilan_minggu: 20,
    bb_sesuai_kurva_kia: true,
    td_sesuai_kurva_kia: false,
    hb: 10.5,
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.status_kek, 'Berisiko KEK');
  assert.equal(r.json.data.status_anemia, 'Anemia');
  id.pi = r.json.data.id;
});
uji('Ibu: layanan TTD dan MT -> 201', async () => {
  const r = await api('POST', `/ibu/${id.ibu}/pemeriksaan/${id.pi}/layanan`, {
    layanan: [
      { jenis_layanan: 'TTD', tanggal_layanan: '2026-10-01', jumlah_tablet: 30, konsumsi_harian: true },
      { jenis_layanan: 'MT', tanggal_layanan: '2026-10-01', komposisi_mt: 'Biskuit', porsi_mt: '2 keping', konsumsi_mt: true },
    ],
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.length, 2);
});

// ---------- Lansia ----------
uji('Lansia: tambah -> 201', async () => {
  const r = await api('POST', '/lansia', {
    nik: nikAcak(),
    nama: 'Uji Lansia',
    jenis_kelamin: 'Laki-laki',
    tanggal_lahir: '1955-03-03',
    status_perkawinan: 'Kawin',
    ...kkLama('Famili Lain'),
  });
  assert.equal(r.status, 201);
  id.lansia = r.json.data.id;
});
uji('Lansia: merokok tanpa isian PUMA -> 422', async () => {
  const r = await api('POST', `/lansia/${id.lansia}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 62,
    tinggi_badan: 165,
    lingkar_perut: 88,
    tekanan_darah_sistolik: 150,
    tekanan_darah_diastolik: 90,
    gula_darah: 180,
    merokok: true,
  });
  assert.equal(r.status, 422);
  assert.equal(r.json.errors!.length, 6); // rokok_per_hari, lama_merokok_tahun, 4 gejala
});
uji('Lansia: pemeriksaan -> IMT, kategori, skor PUMA > 6 ditandai', async () => {
  const r = await api('POST', `/lansia/${id.lansia}/pemeriksaan`, {
    tanggal_periksa: '2026-10-01',
    berat_badan: 62,
    tinggi_badan: 165,
    lingkar_perut: 88,
    tekanan_darah_sistolik: 150,
    tekanan_darah_diastolik: 90,
    gula_darah: 180,
    merokok: true,
    rokok_per_hari: 20,
    lama_merokok_tahun: 35,
    puma_gejala_1: true,
    puma_gejala_2: true,
    puma_gejala_3: false,
    puma_gejala_4: true,
  });
  assert.equal(r.json.data.imt, 22.8);
  assert.equal(r.json.data.kategori_tekanan_darah, 'Tinggi');
  assert.equal(r.json.data.bungkus_per_tahun, 35);
  assert.equal(r.json.data.skor_puma, 8);
  assert.equal(r.json.data.perlu_rujuk_puma, true);
  id.pl = r.json.data.id;
});
uji('Lansia: isian pendukung -> 201; lansia tidak punya jalur layanan (404 JSON)', async () => {
  const a = await api('POST', `/lansia/${id.lansia}/pemeriksaan/${id.pl}/isian-pendukung`, { tbc_batuk: true });
  assert.equal(a.status, 201);
  const b = await api('POST', `/lansia/${id.lansia}/pemeriksaan/${id.pl}/layanan`, { layanan: [] });
  assert.equal(b.status, 404);
  assert.equal(b.json.status, 'error'); // tetap envelope JSON (AC-03)
  assert.deepEqual(kodeErr(b), ['null:ERR-SYS-03']);
});
uji('Pemeriksaan milik sasaran lain -> 404 ERR-DATA-01', async () => {
  const r = await api('POST', `/lansia/${id.lansia}/pemeriksaan/${id.pb}/isian-pendukung`, {});
  assert.equal(r.status, 404);
});

// ---------- Cari, Rekap, Hapus ----------
uji('Cari: kata kunci kosong -> 422; tidak ada -> 404; ada -> 200 (ketiga kelompok)', async () => {
  assert.equal((await api('GET', '/sasaran?nama=')).status, 422);
  assert.equal((await api('GET', '/sasaran?nama=zzqqxx')).status, 404);
  const r = await api('GET', '/sasaran?nama=UJI');
  assert.equal(r.status, 200);
  const kelompok = new Set(r.json.data.map((s: { kelompok: string }) => s.kelompok));
  assert.deepEqual([...kelompok].sort(), ['balita', 'ibu', 'lansia']);
});
uji('Rekap: bulan kosong -> 422; periode kosong -> 200 ERR-DATA-04; Oktober 2026 berisi', async () => {
  assert.equal((await api('GET', '/rekap?tahun=2026')).status, 422);
  const kosong = await api('GET', '/rekap?bulan=1&tahun=2001');
  assert.equal(kosong.json.data.ada_data, false);
  const isi = await api('GET', '/rekap?bulan=10&tahun=2026');
  assert.equal(isi.json.data.ada_data, true);
});
// ---------- Aturan rujukan balita (KMS: garis merah -2 SD, garis oranye +1 SD) ----------
uji('Balita BB/U < -2 SD -> perlu_dirujuk; isian tanpa status Dirujuk -> 422', async () => {
  const p = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    tanggal_periksa: '2026-11-10',
    berat_badan: 7.0,
    tinggi_panjang_badan: 80,
    lila: 12.0,
    lika: 44,
  });
  assert.equal(p.status, 201);
  assert.equal(p.json.data.kategori_bbu, 'Berat badan sangat kurang');
  assert.equal(p.json.data.perlu_dirujuk, true);
  const tolak = await api('POST', `/balita/${id.balita}/pemeriksaan/${p.json.data.id}/isian-pendukung`, {
    status_rujukan: false,
  });
  assert.equal(tolak.status, 422);
  assert.deepEqual(kodeErr(tolak), ['status_rujukan:ERR-VAL-16']);
  const ok = await api('POST', `/balita/${id.balita}/pemeriksaan/${p.json.data.id}/isian-pendukung`, {
    status_rujukan: true,
    faskes_id: 'D0000000-0000-0000-0000-000000000001',
    alasan_rujukan: 'BB/U di bawah garis merah KMS',
  });
  assert.equal(ok.status, 201);
});
uji('Balita BB/U antara -2 SD dan +1 SD -> tidak wajib dirujuk', async () => {
  const p = await api('POST', `/balita/${id.balita}/pemeriksaan`, {
    tanggal_periksa: '2026-11-11',
    berat_badan: 11.0,
    tinggi_panjang_badan: 84,
    lila: 14.5,
    lika: 46.5,
  });
  assert.equal(p.status, 201);
  assert.equal(p.json.data.kategori_bbu, 'Berat badan normal');
  assert.equal(p.json.data.perlu_dirujuk, false);
});
uji('Cari: hasil tidak memuat Nomor KK', async () => {
  const r = await api('GET', '/sasaran?nama=uji');
  assert.equal(r.status, 200);
  assert.ok(r.json.data.every((h: Record<string, unknown>) => !('no_kk' in h)));
});

// ---------- Dashboard dan jadwal ----------
uji('Dashboard: ringkasan bulan sebelumnya + jadwal mendatang', async () => {
  const r = await api('GET', '/dashboard');
  assert.equal(r.status, 200);
  const d = r.json.data;
  assert.ok(d.periode.bulan >= 1 && d.periode.bulan <= 12);
  assert.equal(d.sasaran_hadir.total, d.sasaran_hadir.balita + d.sasaran_hadir.ibu + d.sasaran_hadir.lansia);
  assert.equal(typeof d.balita.wajib_dirujuk, 'number');
  assert.ok(Array.isArray(d.jadwal_mendatang));
});
uji('Jadwal: validasi (jam selesai <= mulai, tanggal lampau) -> 422', async () => {
  const r = await api('POST', '/jadwal', {
    nama_kegiatan: 'Uji',
    jenis_kegiatan: 'Posyandu',
    tanggal_pelaksanaan: '2099-12-10',
    jam_mulai: '11:00',
    jam_selesai: '08:00',
    lokasi: 'Balai RW 02',
  });
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['jam_selesai:ERR-VAL-14']);
  const lampau = await api('POST', '/jadwal', {
    nama_kegiatan: 'Uji',
    jenis_kegiatan: 'Posyandu',
    tanggal_pelaksanaan: '2020-01-01',
    jam_mulai: '08:00',
    jam_selesai: '11:00',
    lokasi: 'Balai RW 02',
  });
  assert.equal(lampau.status, 422);
  assert.deepEqual(kodeErr(lampau), ['tanggal_pelaksanaan:ERR-VAL-15']);
  assert.deepEqual(kodeErr(await api('PATCH', '/jadwal/bukan-uuid', { lokasi: 'X' })), ['null:ERR-DATA-09']);
});
uji('Jadwal: tambah, ubah, tampil di daftar, hapus', async () => {
  const t = await api('POST', '/jadwal', {
    nama_kegiatan: 'Posyandu Uji',
    jenis_kegiatan: 'Posyandu',
    tanggal_pelaksanaan: '2099-12-10',
    jam_mulai: '08:00',
    jam_selesai: '11:00',
    lokasi: 'Balai RW 02',
    keterangan: 'Bawa Buku KIA',
  });
  assert.equal(t.status, 201);
  assert.equal(t.json.data.jam_mulai, '08:00');
  assert.equal(t.json.data.keterangan, 'Bawa Buku KIA');
  assert.equal(t.json.data.penanggung_jawab, 'Ibu Endah');
  const u = await api('PATCH', `/jadwal/${t.json.data.id}`, { jam_selesai: '12:00', lokasi: 'Posyandu Melati' });
  assert.equal(u.status, 200);
  assert.equal(u.json.data.jam_selesai, '12:00');
  assert.equal(u.json.data.jam_mulai, '08:00');
  const daftar = await api('GET', '/jadwal');
  assert.ok(daftar.json.data.some((j: { id: string }) => j.id === t.json.data.id));
  // RBAC: Kader dilarang menghapus (403 ERR-AUTH-03), Koordinator boleh
  const tolak = await api('DELETE', `/jadwal/${t.json.data.id}`);
  assert.equal(tolak.status, 403);
  assert.equal(tolak.json.errors![0].code, 'ERR-AUTH-03');
  assert.equal((await api('DELETE', `/jadwal/${t.json.data.id}`, undefined, sesiKoordinator)).status, 200);
  assert.equal((await api('DELETE', `/jadwal/${t.json.data.id}`, undefined, sesiKoordinator)).status, 404);
});
// ---------- Skenario gagal tambahan per endpoint ----------
uji('Ubah sasaran (balita, ibu, lansia): nama dikosongkan 422, NIK bentrok 409, body kosong 422, ID tidak ada 404', async () => {
  for (const k of ['balita', 'ibu', 'lansia']) {
    assert.deepEqual(kodeErr(await api('PATCH', `/${k}/${id[k]}`, { nama: '' })), ['nama:ERR-VAL-01']);
    const bentrok = await api('PATCH', `/${k}/${id[k]}`, { nik: '3313010000000101' }); // NIK Hermawan (data contoh)
    assert.equal(bentrok.status, 409);
    assert.deepEqual(kodeErr(bentrok), ['nik:ERR-VAL-05']);
    assert.equal((await api('PATCH', `/${k}/${id[k]}`, {})).status, 422);
    const hilang = await api('PATCH', `/${k}/00000000-0000-0000-0000-000000000000`, { nama: 'X' });
    assert.equal(hilang.status, 404);
    assert.deepEqual(kodeErr(hilang), ['null:ERR-DATA-01']);
  }
});
uji('Detail, riwayat, dan pemeriksaan sasaran: ID bukan UUID atau tidak terdaftar -> 404 ERR-DATA-01', async () => {
  for (const k of ['balita', 'ibu', 'lansia']) {
    for (const path of [`/${k}/bukan-uuid`, `/${k}/00000000-0000-0000-0000-000000000000/riwayat`]) {
      const r = await api('GET', path);
      assert.equal(r.status, 404, path);
      assert.deepEqual(kodeErr(r), ['null:ERR-DATA-01']);
    }
  }
  // Isian divalidasi lebih dulu; bila isian benar tetapi sasaran tidak ada -> 404
  const r = await api('POST', '/balita/00000000-0000-0000-0000-000000000000/pemeriksaan', {
    tanggal_periksa: '2026-10-01',
    berat_badan: 9,
    tinggi_panjang_badan: 75,
    lila: 14,
    lika: 45,
  });
  assert.equal(r.status, 404);
  assert.deepEqual(kodeErr(r), ['null:ERR-DATA-01']);
});
uji('Semua endpoint yang butuh login menolak tanpa sesi -> 401 ERR-AUTH-01', async () => {
  const daftar: [string, string][] = [
    ['GET', '/faskes'],
    ['GET', '/dashboard'],
    ['GET', '/jadwal'],
    ['GET', '/rekap?bulan=10&tahun=2026'],
    ['GET', '/sasaran?nama=a'],
    ['PUT', '/akun/saya/password'],
    ['GET', '/akun'],
    ['GET', '/monitoring/log'],
    ['POST', '/auth/logout'],
    ['POST', '/balita'],
    ['GET', `/ibu/${id.ibu}`],
    ['GET', `/lansia/${id.lansia}/riwayat`],
  ];
  for (const [m, path] of daftar) {
    const r = await api(m, path, m === 'GET' ? undefined : {}, '');
    assert.equal(r.status, 401, `${m} ${path}`);
    assert.deepEqual(kodeErr(r), ['null:ERR-AUTH-01']);
  }
  const palsu = await api('GET', '/jadwal', undefined, 'a'.repeat(64)); // sesi 64 karakter tapi tidak terdaftar
  assert.equal(palsu.status, 401);
});
uji('Rekap: bulan 13 dan tahun bukan angka -> 422 ERR-VAL-01', async () => {
  const r = await api('GET', '/rekap?bulan=13&tahun=abc');
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['bulan:ERR-VAL-01', 'tahun:ERR-VAL-01']);
});
uji('Jadwal: hapus atau ubah ID tidak terdaftar -> 404 ERR-DATA-09', async () => {
  const r = await api('DELETE', '/jadwal/00000000-0000-0000-0000-000000000000', undefined, sesiKoordinator);
  assert.equal(r.status, 404);
  assert.deepEqual(kodeErr(r), ['null:ERR-DATA-09']);
});
uji('Alamat API tidak terdaftar -> 404 ERR-SYS-03 dengan format error yang sama', async () => {
  const r = await api('GET', '/tidak-ada');
  assert.equal(r.status, 404);
  assert.equal(r.json.status, 'error');
  assert.deepEqual(kodeErr(r), ['null:ERR-SYS-03']);
});
// ---------- RBAC dan audit trail ----------
uji('Kader: DELETE sasaran ditembak langsung ke API -> 403 ERR-AUTH-03, data tetap ada', async () => {
  for (const k of ['balita', 'ibu', 'lansia']) {
    const r = await api('DELETE', `/${k}/${id[k]}`);
    assert.equal(r.status, 403);
    assert.equal(r.json.message, 'Anda tidak memiliki izin untuk mengakses ini.');
    assert.equal((await api('GET', `/${k}/${id[k]}`)).status, 200);
  }
});
uji('Percobaan akses ditolak tercatat di log aktivitas dengan jenis Ditolak (ERR-AUTH-03)', async () => {
  await new Promise((r) => setTimeout(r, 300)); // log ditulis pengamat di latar belakang
  const log = await api('GET', '/monitoring/log?jenis=Ditolak&cari=kaderEndah02', undefined, sesiKoordinator);
  assert.equal(log.status, 200);
  assert.ok(log.json.data.baris.some((b: any) => /^Akses ditolak: DELETE \/api\/v1\/balita\//.test(b.keterangan)));
  const kpi = await api('GET', '/monitoring/ringkasan', undefined, sesiKoordinator);
  assert.ok(kpi.json.data.akses_ditolak_hari_ini >= 3);
});
uji('Kader: dashboard monitoring dan log aktivitas -> 403 ERR-AUTH-03', async () => {
  assert.equal((await api('GET', '/monitoring/ringkasan')).status, 403);
  assert.equal((await api('GET', '/monitoring/log')).status, 403);
});
uji('Koordinator: KPI hari ini terisi', async () => {
  const r = await api('GET', '/monitoring/ringkasan', undefined, sesiKoordinator);
  assert.equal(r.status, 200);
  assert.ok(r.json.data.total_aktivitas_hari_ini > 0);
  assert.ok(r.json.data.data_baru_hari_ini > 0);
  assert.ok(r.json.data.perubahan_data_hari_ini > 0);
  assert.ok(r.json.data.kader_sedang_login >= 1);
});
uji('Koordinator: log mencatat Login, Input, dan Edit dengan detail sebelum → sesudah', async () => {
  const login = await api('GET', '/monitoring/log?jenis=Login&cari=endah', undefined, sesiKoordinator);
  assert.ok(login.json.data.baris.length > 0);
  assert.ok(
    login.json.data.baris.every(
      (b: { jenis_aktivitas: string; nama_pengguna: string }) => b.jenis_aktivitas === 'Login' && b.nama_pengguna === 'Ibu Endah',
    ),
  );
  const edit = await api('GET', '/monitoring/log?jenis=Edit&per_halaman=50', undefined, sesiKoordinator);
  const ubahBalita = edit.json.data.baris.find(
    (b: { modul: string; id_data: string }) => b.modul === 'balita' && b.id_data.toLowerCase() === id.balita.toLowerCase(),
  );
  assert.ok(ubahBalita, 'log Edit balita ada');
  assert.match(ubahBalita.keterangan, /→/);
  const input = await api('GET', '/monitoring/log?jenis=Input&per_halaman=50', undefined, sesiKoordinator);
  assert.ok(
    input.json.data.baris.some(
      (b: { modul: string; keterangan: string }) => b.modul === 'pemeriksaan_balita' && /BB\/U/.test(b.keterangan),
    ),
  );
  // NIK tidak ditulis utuh di log
  assert.ok(input.json.data.baris.every((b: { keterangan: string }) => !b.keterangan.includes(id.nikBalita)));
});
uji('Koordinator: filter tanggal, pagination, dan validasi filter', async () => {
  const kosong = await api('GET', '/monitoring/log?dari=2001-01-01&sampai=2001-01-31', undefined, sesiKoordinator);
  assert.equal(kosong.status, 200);
  assert.equal(kosong.json.data.total, 0);
  assert.equal(kosong.json.message, 'Belum ada data untuk ditampilkan');
  const h1 = await api('GET', '/monitoring/log?per_halaman=10&halaman=1', undefined, sesiKoordinator);
  assert.equal(h1.json.data.baris.length, Math.min(10, h1.json.data.total));
  const salah = await api('GET', '/monitoring/log?jenis=Hapus&per_halaman=7', undefined, sesiKoordinator);
  assert.equal(salah.status, 422);
  assert.deepEqual(kodeErr(salah), ['jenis:ERR-VAL-01', 'per_halaman:ERR-VAL-01']);
  const terbalik = await api('GET', '/monitoring/log?dari=2026-12-01&sampai=2026-11-01', undefined, sesiKoordinator);
  assert.deepEqual(kodeErr(terbalik), ['sampai:ERR-VAL-14']);
});
uji('Koordinator: hapus balita/ibu/lansia -> 200; riwayat ikut terhapus (BR-40); log Delete tercatat', async () => {
  for (const k of ['balita', 'ibu', 'lansia']) {
    assert.equal((await api('DELETE', `/${k}/${id[k]}`, undefined, sesiKoordinator)).status, 200);
    assert.equal((await api('GET', `/${k}/${id[k]}/riwayat`)).status, 404);
  }
  const del = await api('GET', '/monitoring/log?jenis=Delete', undefined, sesiKoordinator);
  assert.ok(del.json.data.baris.length >= 3);
});
// ---------- FSD-2.3 Ganti Password dan FSD-2.4 Kelola Akun ----------
const akhiran = String(Date.now()).slice(-6);
uji('Kelola Akun: Kader ditolak 403 ERR-AUTH-03 (FSD-2.4 EF-3, BR-05)', async () => {
  for (const [m, path, body] of [
    ['GET', '/akun'],
    ['GET', '/akun/kader-tanpa-akun'],
    ['POST', '/akun', {}],
  ] as const) {
    const r = await api(m, path, body);
    assert.equal(r.status, 403);
    assert.deepEqual(kodeErr(r), ['null:ERR-AUTH-03']);
  }
});
uji('Ganti Password: kosong ERR-VAL-01, < 8 karakter ERR-VAL-07, tanpa sesi 401', async () => {
  assert.deepEqual(kodeErr(await api('PUT', '/akun/saya/password', { password_baru: '' })), ['password_baru:ERR-VAL-01']);
  const pendek = await api('PUT', '/akun/saya/password', { password_baru: 'abc1234' });
  assert.equal(pendek.status, 422);
  assert.deepEqual(kodeErr(pendek), ['password_baru:ERR-VAL-07']);
  assert.equal((await api('PUT', '/akun/saya/password', { password_baru: 'BaruSekali#1' }, '')).status, 401);
});
uji('Ganti Password: berhasil, password baru dipakai login, log Edit tercatat', async () => {
  assert.equal((await api('PUT', '/akun/saya/password', { password_baru: 'BaruSekali#1' })).status, 200);
  assert.equal((await api('POST', '/auth/login', { username: 'kaderEndah02', password: 'Posyandu#2026' }, '')).status, 401);
  assert.equal((await api('POST', '/auth/login', { username: 'kaderEndah02', password: 'BaruSekali#1' }, '')).status, 200);
  assert.equal((await api('PUT', '/akun/saya/password', { password_baru: 'Posyandu#2026' })).status, 200); // kembalikan
  const log = await api('GET', '/monitoring/log?cari=kaderEndah02&jenis=Edit', undefined, sesiKoordinator);
  assert.ok(log.json.data.baris.filter((b: any) => b.keterangan.startsWith('Ganti password')).length >= 2);
  assert.ok(!JSON.stringify(log.json.data).includes('BaruSekali'));
});
uji('Kelola Akun: daftar akun, akun sendiri ditandai akun_saya', async () => {
  const r = await api('GET', '/akun', undefined, sesiKoordinator);
  assert.equal(r.status, 200);
  const saya = r.json.data.find((a: any) => a.username === 'kaderNovita01');
  assert.equal(saya.akun_saya, true);
  assert.equal(saya.label_peran, 'Koordinator');
  id.akunSaya = saya.id;
  id.akunEndah = r.json.data.find((a: any) => a.username === 'kaderEndah02').id;
  assert.ok(Array.isArray((await api('GET', '/akun/kader-tanpa-akun', undefined, sesiKoordinator)).json.data));
});
uji('Tambah Akun: isian wajib kosong ERR-VAL-01, password awal < 8 ERR-VAL-07', async () => {
  const tanpaSumber = await api('POST', '/akun', { username: 'x' }, sesiKoordinator);
  assert.deepEqual(kodeErr(tanpaSumber), ['sumber:ERR-VAL-01']);
  const r = await api(
    'POST',
    '/akun',
    { sumber: 'petugas_baru', nama: '', username: '', password_awal: 'pendek' },
    sesiKoordinator,
  );
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), [
    'jabatan_kader:ERR-VAL-01',
    'jenis_kelamin:ERR-VAL-01',
    'nama:ERR-VAL-01',
    'password_awal:ERR-VAL-07',
    'username:ERR-VAL-01',
  ]);
});
uji('Tambah Akun petugas baru -> 201, otomatis User (Kader) dan Aktif, bisa login', async () => {
  const r = await api(
    'POST',
    '/akun',
    {
      sumber: 'petugas_baru',
      nama: 'Ibu Uji Akun',
      jenis_kelamin: 'Perempuan',
      jabatan_kader: 'Kader',
      username: `kaderUji${akhiran}`,
      password_awal: 'AwalUji#2026',
    },
    sesiKoordinator,
  );
  assert.equal(r.status, 201);
  assert.equal(r.json.data.peran, 'User (Kader)');
  assert.equal(r.json.data.status_akun, 'Aktif');
  id.akunBaru = r.json.data.id;
  const login = await api('POST', '/auth/login', { username: `kaderUji${akhiran}`, password: 'AwalUji#2026' }, '');
  assert.equal(login.status, 200);
  assert.equal(login.json.data.pengguna.nama_pengguna, 'Ibu Uji Akun');
  id.sesiAkunBaru = login.json.data.id_sesi;
});
uji('Tambah Akun: username dipakai -> 409 ERR-DATA-03; kader yang sudah punya akun -> 409 ERR-DATA-08', async () => {
  const r = await api(
    'POST',
    '/akun',
    {
      sumber: 'petugas_baru',
      nama: 'Ibu Kembar',
      jenis_kelamin: 'Perempuan',
      jabatan_kader: 'Kader',
      username: `KADERUJI${akhiran}`,
      password_awal: 'AwalUji#2026',
    },
    sesiKoordinator,
  );
  assert.equal(r.status, 409);
  assert.deepEqual(kodeErr(r), ['username:ERR-DATA-03']);
  const kader = await api(
    'POST',
    '/akun',
    {
      sumber: 'kader_terdaftar',
      petugas_id: 'A0000000-0000-0000-0000-000000000002',
      username: `endahDua${akhiran}`,
      password_awal: 'AwalUji#2026',
    },
    sesiKoordinator,
  );
  assert.equal(kader.status, 409);
  assert.deepEqual(kodeErr(kader), ['petugas_id:ERR-DATA-08']);
});
uji('Tambah Akun kader terdaftar (bila ada kader tanpa akun) -> 201', async () => {
  const pilihan = (await api('GET', '/akun/kader-tanpa-akun', undefined, sesiKoordinator)).json.data as any[];
  if (pilihan.length === 0) return; // data contoh: semua kader sudah punya akun
  const r = await api(
    'POST',
    '/akun',
    {
      sumber: 'kader_terdaftar',
      petugas_id: pilihan[0].petugas_id,
      username: `kaderLama${akhiran}`,
      password_awal: 'AwalUji#2026',
    },
    sesiKoordinator,
  );
  assert.equal(r.status, 201);
  assert.equal(r.json.data.nama, pilihan[0].nama);
});
uji('Ubah Akun: username bentrok 409 ERR-DATA-03; ubah nama dan peran -> 200 + log Edit sebelum → sesudah', async () => {
  const bentrok = await api('PATCH', `/akun/${id.akunBaru}`, { username: 'kaderEndah02' }, sesiKoordinator);
  assert.deepEqual(kodeErr(bentrok), ['username:ERR-DATA-03']);
  assert.deepEqual(kodeErr(await api('PATCH', `/akun/${id.akunBaru}`, { nama: '' }, sesiKoordinator)), ['nama:ERR-VAL-01']);
  const r = await api('PATCH', `/akun/${id.akunBaru}`, { nama: 'Ibu Uji Akun Dua', peran: 'Super User' }, sesiKoordinator);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.label_peran, 'Koordinator');
  const log = await api('GET', '/monitoring/log?cari=kaderNovita01&jenis=Edit&per_halaman=50', undefined, sesiKoordinator);
  assert.ok(log.json.data.baris.some((b: any) => /peran: Kader → Koordinator/.test(b.keterangan)));
  assert.equal((await api('PATCH', `/akun/${id.akunBaru}`, { peran: 'User (Kader)' }, sesiKoordinator)).status, 200);
});
uji('Nonaktifkan akun sendiri -> 422 ERR-DATA-05 (FSD-2.4 EF-4)', async () => {
  const r = await api('PATCH', `/akun/${id.akunSaya}/status`, { status_akun: 'Nonaktif' }, sesiKoordinator);
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['status_akun:ERR-DATA-05']);
});
uji('Nonaktifkan akun lain: sesinya berakhir dan tidak bisa login (BR-06); aktifkan kembali bisa login', async () => {
  const r = await api('PATCH', `/akun/${id.akunBaru}/status`, { status_akun: 'Nonaktif' }, sesiKoordinator);
  assert.equal(r.status, 200);
  assert.equal(r.json.data.status_akun, 'Nonaktif');
  assert.equal((await api('GET', '/jadwal', undefined, id.sesiAkunBaru)).status, 401);
  assert.equal((await api('POST', '/auth/login', { username: `kaderUji${akhiran}`, password: 'AwalUji#2026' }, '')).status, 401);
  assert.equal((await api('PATCH', `/akun/${id.akunBaru}/status`, { status_akun: 'Aktif' }, sesiKoordinator)).status, 200);
  assert.equal((await api('POST', '/auth/login', { username: `kaderUji${akhiran}`, password: 'AwalUji#2026' }, '')).status, 200);
  assert.deepEqual(kodeErr(await api('PATCH', `/akun/${id.akunBaru}/status`, { status_akun: 'Hapus' }, sesiKoordinator)), [
    'status_akun:ERR-VAL-01',
  ]);
});
uji('Ubah peran akun sendiri -> 422 ERR-DATA-10; ubah nama sendiri tetap boleh', async () => {
  const r = await api('PATCH', `/akun/${id.akunSaya}`, { peran: 'User (Kader)' }, sesiKoordinator);
  assert.equal(r.status, 422);
  assert.deepEqual(kodeErr(r), ['peran:ERR-DATA-10']);
  assert.equal((await api('PATCH', `/akun/${id.akunSaya}`, { nama: 'Ibu Novita' }, sesiKoordinator)).status, 200);
});
uji('Kelola Akun: ID tidak dikenal -> 404 ERR-DATA-07; tidak ada DELETE akun', async () => {
  const r = await api('PATCH', '/akun/bukan-uuid', { nama: 'X' }, sesiKoordinator);
  assert.equal(r.status, 404);
  assert.deepEqual(kodeErr(r), ['null:ERR-DATA-07']);
  assert.equal((await api('DELETE', `/akun/${id.akunBaru}`, undefined, sesiKoordinator)).status, 404);
});
uji('Logout -> 200, sesi lama -> 401', async () => {
  assert.equal((await api('POST', '/auth/logout')).status, 200);
  assert.equal((await api('GET', '/sasaran?nama=raka')).status, 401);
});

(async () => {
  let lulus = 0;
  for (const [nama, fn] of kasus) {
    try {
      await fn();
      lulus++;
      console.log(`  LULUS  ${nama}`);
    } catch (e) {
      console.log(`  GAGAL  ${nama}\n         ${(e as Error).message.split('\n').join('\n         ')}`);
    }
  }
  console.log(`\n${lulus}/${kasus.length} kasus lulus`);
  process.exit(lulus === kasus.length ? 0 : 1);
})();
