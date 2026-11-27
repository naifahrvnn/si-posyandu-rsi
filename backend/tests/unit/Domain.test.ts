import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Kader } from '../../src/keamanan/Kader';
import { Koordinator } from '../../src/keamanan/Koordinator';
import { PabrikPengguna } from '../../src/keamanan/PabrikPengguna';
import { Password } from '../../src/keamanan/Password';
import { Akun } from '../../src/modules/akun/Akun';
import { RingkasanPerubahan } from '../../src/core/audit/RingkasanPerubahan';
import { AppError } from '../../src/core/errors/AppError';
import { Pengamat } from '../../src/core/peristiwa/Pengamat';
import { Peristiwa } from '../../src/core/peristiwa/Peristiwa';
import { PusatPeristiwa } from '../../src/core/peristiwa/PusatPeristiwa';
import { Balita } from '../../src/modules/balita/Balita';
import { PemeriksaanBalita } from '../../src/modules/balita/PemeriksaanBalita';
import { BalitaValidator } from '../../src/modules/balita/BalitaValidator';
import { Ibu } from '../../src/modules/ibu/Ibu';
import { PemeriksaanIbu } from '../../src/modules/ibu/PemeriksaanIbu';
import { Lansia } from '../../src/modules/lansia/Lansia';
import { PemeriksaanLansia } from '../../src/modules/lansia/PemeriksaanLansia';
import { IsianPendukung } from '../../src/modules/layanan/IsianPendukung';
import { IsianPendukungValidator } from '../../src/modules/layanan/IsianPendukungValidator';
import { LayananValidator } from '../../src/modules/layanan/LayananValidator';
import { TabelAcuan } from '../../src/modules/pemeriksaan/TabelAcuan';
import { Sasaran } from '../../src/modules/sasaran/Sasaran';

// Semua data dummy
const alamat = { no_kk: '3313010101010001', hubungan_keluarga: 'Anak' as const };
const balita = Balita.buat({
  nik: '3372010101990001',
  nama: 'Budi',
  jenis_kelamin: 'Laki-laki',
  tanggal_lahir: '2025-01-15',
  berat_lahir: 3.2,
  panjang_lahir: 49,
  nama_orang_tua: 'Siti',
  ...alamat,
});
const ibu = Ibu.buat({
  nik: '3372010101990002',
  nama: 'Dewi',
  tanggal_lahir: '1999-04-10',
  status_ibu: 'Hamil',
  nama_suami: 'Rudi',
  ...alamat,
});
const lansia = Lansia.buat({
  nik: '3372010101990003',
  nama: 'Parman',
  jenis_kelamin: 'Laki-laki',
  tanggal_lahir: '1955-07-01',
  ...alamat,
});

const acuan = new TabelAcuan([
  { indikator: 'TB/U', jenisKelamin: null, usiaMin: 6, usiaMax: 35, nilaiMin: null, nilaiMax: 70.99, kategori: 'Sangat pendek' },
  { indikator: 'TB/U', jenisKelamin: null, usiaMin: 6, usiaMax: 35, nilaiMin: 71, nilaiMax: null, kategori: 'Normal' },
  {
    indikator: 'LILA ibu hamil',
    jenisKelamin: null,
    usiaMin: null,
    usiaMax: null,
    nilaiMin: null,
    nilaiMax: 23.49,
    kategori: 'Berisiko KEK',
  },
  {
    indikator: 'LILA ibu hamil',
    jenisKelamin: null,
    usiaMin: null,
    usiaMax: null,
    nilaiMin: 23.5,
    nilaiMax: null,
    kategori: 'Tidak Berisiko',
  },
  { indikator: 'IMT lansia', jenisKelamin: null, usiaMin: null, usiaMax: null, nilaiMin: 18.5, nilaiMax: 25, kategori: 'Normal' },
]);

function kode(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof AppError);
    return e.details.map((d) => `${d.field}:${d.code}`).sort();
  }
  return [];
}

test('Polimorfisme: umur balita dalam bulan, ibu dan lansia dalam tahun (BR-10)', () => {
  const semua: Sasaran[] = [balita, ibu, lansia];
  assert.deepEqual(
    semua.map((s) => [s.kelompok, s.satuanUmur, s.hitungUmur('2026-01-15')]),
    [
      ['balita', 'bulan', 12],
      ['ibu', 'tahun', 26],
      ['lansia', 'tahun', 70],
    ],
  );
  assert.equal(ibu.jenisKelamin, 'Perempuan');
});

test('TabelAcuan: kategori sesuai rentang; di luar rentang -> Belum tersedia', () => {
  assert.equal(acuan.cari('TB/U', 'Laki-laki', 12, 75), 'Normal');
  assert.equal(acuan.cari('TB/U', 'Laki-laki', 12, 65), 'Sangat pendek');
  assert.equal(acuan.cari('TB/U', 'Laki-laki', 48, 75), TabelAcuan.BELUM_TERSEDIA);
  assert.equal(acuan.cari('TB/U', 'Laki-laki', 12, null), TabelAcuan.BELUM_TERSEDIA);
});

test('BR-19: status BB balita B (pertama), N (naik), T (tidak naik)', () => {
  const ukur = { tanggal_periksa: '2026-01-15', berat_badan: 9, tinggi_panjang_badan: 75, lila: 14, lika: 46 };
  assert.equal(PemeriksaanBalita.hitung(ukur, balita, null, acuan, 'u').props.statusBeratBadan, 'B');
  assert.equal(PemeriksaanBalita.hitung(ukur, balita, 8.5, acuan, 'u').props.statusBeratBadan, 'N');
  assert.equal(PemeriksaanBalita.hitung(ukur, balita, 9, acuan, 'u').props.statusBeratBadan, 'T');
  assert.equal(PemeriksaanBalita.hitung(ukur, balita, null, acuan, 'u').adaKategoriBelumTersedia, true); // ERR-DATA-02
});

test('Ibu hamil: usia kehamilan wajib; KEK dari LILA; anemia hanya bila Hb terisi (BR-16, BR-21)', () => {
  const dasar = {
    tanggal_periksa: '2026-01-15',
    berat_badan: 55,
    lila: 23,
    tekanan_darah_sistolik: 110,
    tekanan_darah_diastolik: 70,
    bb_sesuai_kurva_kia: true,
    td_sesuai_kurva_kia: true,
  };
  assert.deepEqual(
    kode(() => PemeriksaanIbu.hitung(dasar, ibu, acuan, 'u')),
    ['usia_kehamilan_minggu:ERR-VAL-01'],
  );
  const p = PemeriksaanIbu.hitung({ ...dasar, usia_kehamilan_minggu: 20 }, ibu, acuan, 'u');
  assert.equal(p.props.statusKek, 'Berisiko KEK');
  assert.equal(p.props.statusAnemia, null);
});

test('Lansia: IMT 1 desimal (BR-17) dan skor PUMA (BR-18)', () => {
  assert.equal(PemeriksaanLansia.hitungImt(62, 165), 22.8);
  // laki-laki 1 + usia >= 60 2 + > 30 bungkus 2 + 3 gejala = 8
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Laki-laki', 72, true, 35, [true, true, false, true]), 8);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 45, true, 10, [false, false, false, false]), 0);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Laki-laki', 72, false, null, []), null); // tidak merokok
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Laki-laki', 39, true, 35, [true]), null); // di bawah 40
  // umur sesuai lampiran kuesioner: 40-49 = 0, 50-60 = 1, > 60 = 2
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 60, true, 0, [false, false, false, false]), 1);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 61, true, 0, [false, false, false, false]), 2);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 50, true, 0, [false, false, false, false]), 1);
  // batas komponen pack years: 19.9 -> 0, 20 dan 30 -> 1, 30.1 -> 2
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 45, true, 19.9, [false, false, false, false]), 0);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 45, true, 30, [false, false, false, false]), 1);
  assert.equal(PemeriksaanLansia.hitungSkorPuma('Perempuan', 45, true, 30.1, [false, false, false, false]), 2);
});

test('Pack years = lama merokok x batang per hari / 20 (kuesioner PUMA)', () => {
  assert.equal(PemeriksaanLansia.hitungPackYears(20, 35), 35);
  assert.equal(PemeriksaanLansia.hitungPackYears(12, 15), 9);
  assert.equal(PemeriksaanLansia.hitungPackYears(7, 3), 1.1);
});

test('Lansia >= 40 tahun dan merokok: isian PUMA wajib lengkap (FSD-2.21 EF-3)', () => {
  const ukur = {
    tanggal_periksa: '2026-01-15',
    berat_badan: 62,
    tinggi_badan: 165,
    lingkar_perut: 88,
    tekanan_darah_sistolik: 150,
    tekanan_darah_diastolik: 90,
    gula_darah: 180,
    merokok: true,
    puma_gejala_1: true,
  };
  assert.deepEqual(
    kode(() => PemeriksaanLansia.hitung(ukur, lansia, acuan, 'u')),
    [
      'lama_merokok_tahun:ERR-VAL-01',
      'puma_gejala_2:ERR-VAL-01',
      'puma_gejala_3:ERR-VAL-01',
      'puma_gejala_4:ERR-VAL-01',
      'rokok_per_hari:ERR-VAL-01',
    ],
  );
});

test('Isian pendukung: default Tidak; tujuan rujukan wajib bila rujuk (ERR-VAL-06); catatan maks 500 (ERR-VAL-08)', () => {
  const isian = IsianPendukung.buat({}, 'p1').toJSON();
  assert.equal(isian.tbc_batuk, false);
  assert.equal(isian.status_rujukan, false);
  assert.deepEqual(
    kode(() => new IsianPendukungValidator().validasi({ status_rujukan: true, catatan_edukasi: 'x'.repeat(501) })),
    ['alasan_rujukan:ERR-VAL-01', 'catatan_edukasi:ERR-VAL-08', 'faskes_id:ERR-VAL-06'],
  );
  const v = new LayananValidator('balita');
  assert.deepEqual(
    kode(() => v.validasi({ layanan: [{ jenis_layanan: 'TTD', tanggal_layanan: '2026-01-01' }] })),
    [
      'layanan.0.jenis_layanan:ERR-VAL-01', // TTD hanya untuk ibu (BR-27)
    ],
  );
  assert.deepEqual(
    kode(() => v.validasi({ layanan: [] })),
    ['layanan:ERR-VAL-01'],
  ); // minimal satu layanan
});

test('Validator balita: semua isian salah dilaporkan sekaligus', () => {
  assert.deepEqual(
    kode(() => new BalitaValidator().validasiTambah({ nik: '123', kontak: '08ab', berat_lahir: 0 })),
    [
      'berat_lahir:ERR-VAL-02',
      'hubungan_keluarga:ERR-VAL-01',
      'jenis_kelamin:ERR-VAL-01',
      'kontak:ERR-VAL-09',
      'nama:ERR-VAL-01',
      'nama_orang_tua:ERR-VAL-01',
      'nik:ERR-VAL-04',
      'no_kk:ERR-VAL-01',
      'panjang_lahir:ERR-VAL-01',
      'tanggal_lahir:ERR-VAL-01',
    ],
  );
});

test('Permenkes 2/2020: kategori balita dari z-score sesuai garis KMS / Buku KIA', async () => {
  const { StandarAntropometri: S } = await import('../../src/modules/balita/StandarAntropometri');
  // Laki-laki umur 0 bulan: garis -3 SD = 2,1 kg; -2 SD = 2,5 kg; +1 SD = 3,9 kg (KMS laki-laki)
  assert.equal(S.klasifikasi('Laki-laki', 0, 2.0, 49.9, 34.5).bbu.kategori, 'Berat badan sangat kurang');
  assert.equal(S.klasifikasi('Laki-laki', 0, 2.3, 49.9, 34.5).bbu.kategori, 'Berat badan kurang');
  assert.equal(S.klasifikasi('Laki-laki', 0, 3.3, 49.9, 34.5).bbu.kategori, 'Berat badan normal');
  assert.equal(S.klasifikasi('Laki-laki', 0, 4.2, 49.9, 34.5).bbu.kategori, 'Risiko berat badan lebih');
  // Perempuan 12 bulan: median BB 8,9 kg; TB median 74,0 cm; LK median 44,9 cm
  const normal = S.klasifikasi('Perempuan', 12, 8.9, 74, 44.9);
  assert.deepEqual(
    [normal.bbu.kategori, normal.tbu.kategori, normal.bbTb.kategori, normal.lku.kategori],
    ['Berat badan normal', 'Normal', 'Gizi baik', 'Normal'],
  );
  assert.ok(Math.abs(normal.bbu.z ?? 9) < 0.1);
  // Stunting: perempuan 24 bulan, -3 SD = 76,0 cm dan -2 SD = 79,3 cm
  assert.equal(S.klasifikasi('Perempuan', 24, 10, 75.5, 47).tbu.kategori, 'Sangat pendek');
  assert.equal(S.klasifikasi('Perempuan', 24, 10, 78, 47).tbu.kategori, 'Pendek');
  // Lingkar kepala perempuan 12 bulan: < -2 SD (42,2 cm) -> mikrosefali
  assert.equal(S.klasifikasi('Perempuan', 12, 8.9, 74, 42).lku.kategori, 'Mikrosefali');
  // Di luar 0-60 bulan -> Belum tersedia
  assert.equal(S.klasifikasi('Perempuan', 61, 18, 110, 50).bbu.kategori, 'Belum tersedia');
  // Rujukan: di bawah garis merah (-2) atau di atas garis oranye (+1)
  assert.equal(S.perluDirujuk(-2.01), true);
  assert.equal(S.perluDirujuk(-2), false);
  assert.equal(S.perluDirujuk(1), false);
  assert.equal(S.perluDirujuk(1.01), true);
});

test('[OBSERVER] PusatPeristiwa memberi tahu semua pengamat; pengamat gagal tidak menghentikan yang lain', () => {
  const diterima: Peristiwa[] = [];
  const rusak: Pengamat = {
    terima: () => {
      throw new Error('rusak');
    },
  };
  const pencatat: Pengamat = { terima: (p) => diterima.push(p) };
  const pusat = new PusatPeristiwa().daftarkan(rusak).daftarkan(pencatat);
  const asli = console.error;
  console.error = () => {};
  pusat.terbitkan({ jenis: 'jadwal.diubah', userId: 'u1', aksi: 'tambah', jadwalId: 'j1' });
  console.error = asli;
  assert.equal(diterima.length, 1);
  assert.equal(diterima[0].jenis, 'jadwal.diubah');
  assert.ok(diterima[0].waktu.length > 0);
  pusat.lepaskan(pencatat);
  pusat.terbitkan({ jenis: 'jadwal.diubah', userId: 'u1', aksi: 'hapus', jadwalId: 'j1' });
  assert.equal(diterima.length, 1);
});

test('[OVERRIDING] perluDirujuk: balita mengikuti garis KMS, ibu memakai bawaan kelas dasar (false)', () => {
  const kurang = PemeriksaanBalita.hitung(
    { tanggal_periksa: '2026-11-10', berat_badan: 6.5, tinggi_panjang_badan: 78, lila: 12, lika: 44 },
    balita,
    null,
    acuan,
    'p1',
  );
  const normal = PemeriksaanBalita.hitung(
    { tanggal_periksa: '2026-11-10', berat_badan: 11, tinggi_panjang_badan: 84, lila: 14, lika: 46.5 },
    balita,
    null,
    acuan,
    'p1',
  );
  const periksaIbu = PemeriksaanIbu.hitung(
    {
      tanggal_periksa: '2026-11-10',
      berat_badan: 55,
      lila: 24,
      tekanan_darah_sistolik: 110,
      tekanan_darah_diastolik: 70,
      usia_kehamilan_minggu: 20,
      bb_sesuai_kurva_kia: true,
      td_sesuai_kurva_kia: true,
    },
    ibu,
    acuan,
    'p1',
  );
  assert.equal(kurang.perluDirujuk, true);
  assert.equal(normal.perluDirujuk, false);
  assert.equal(periksaIbu.perluDirujuk, false);
});

test('[RBAC / POLIMORFISME] PabrikPengguna.dari memilih subclass; Kader tidak boleh hapus dan lihat log', () => {
  const kader = PabrikPengguna.dari('u1', 'User (Kader)', 'p1');
  const koordinator = PabrikPengguna.dari('u2', 'Super User', 'p2');
  assert.ok(kader instanceof Kader);
  assert.ok(koordinator instanceof Koordinator);
  for (const hak of ['baca', 'tambah', 'ubah'] as const) assert.equal(kader.boleh(hak), true);
  assert.equal(kader.boleh('hapus'), false);
  assert.equal(kader.boleh('lihat_log'), false);
  assert.equal(koordinator.boleh('hapus'), true);
  assert.equal(koordinator.boleh('lihat_log'), true);
  assert.equal(kader.boleh('kelola_akun'), false); // BR-05
  assert.equal(koordinator.boleh('kelola_akun'), true);
});

test('[ENKAPSULASI] Password: kosong ERR-VAL-01, < 8 karakter ERR-VAL-07; hash bcrypt bisa dicocokkan', async () => {
  assert.deepEqual(
    kode(() => Password.baru('', 'password_baru')),
    ['password_baru:ERR-VAL-01'],
  );
  assert.deepEqual(
    kode(() => Password.baru('1234567', 'password_awal')),
    ['password_awal:ERR-VAL-07'],
  );
  const hash = await Password.baru('Rahasia#2026', 'password_baru').hash();
  assert.equal(await Password.cocok('Rahasia#2026', hash), true);
  assert.equal(await Password.cocok('Rahasia#2025', ` ${hash}`), false);
  assert.equal(await Password.cocok('Rahasia#2026', ` ${hash}`), true); // hash berawalan spasi di data contoh
});

test('Akun: Super User tidak bisa menonaktifkan akunnya sendiri (ERR-DATA-05); label peran dari subclass', () => {
  const akun = Akun.pulihkan({
    userId: 'u2',
    petugasId: 'p2',
    nama: 'Ibu Novita',
    username: 'kaderNovita01',
    peran: 'Super User',
    status: 'Aktif',
    jabatanKader: 'Kader',
    lastLogin: null,
    dibuatPada: null,
    diubahPada: null,
  });
  const diriSendiri = PabrikPengguna.dari('u2', 'Super User', 'p2');
  const superLain = PabrikPengguna.dari('u9', 'Super User', 'p9');
  assert.deepEqual(
    kode(() => akun.ubahStatus('Nonaktif', diriSendiri)),
    ['status_akun:ERR-DATA-05'],
  );
  assert.equal(akun.labelPeran, 'Koordinator');
  assert.deepEqual(
    kode(() => akun.terapkanPerubahan({ peran: 'User (Kader)' }, diriSendiri)),
    ['peran:ERR-DATA-10'],
  );
  akun.terapkanPerubahan({ nama: 'Ibu Novita S.' }, diriSendiri); // nama sendiri boleh diubah
  akun.terapkanPerubahan({ peran: 'User (Kader)' }, superLain);
  assert.equal(akun.labelPeran, 'Kader');
  akun.ubahStatus('Nonaktif', superLain);
  assert.equal(akun.status, 'Nonaktif');
  assert.equal(akun.toJSON(diriSendiri).akun_saya, true);
});

test('[AUDIT] RingkasanPerubahan: sebelum → sesudah, NIK disamarkan, teks dipotong 255 karakter', () => {
  const beda = RingkasanPerubahan.bandingkan(
    { nama: 'Ceisya', kontak: null, nik: '3313010000000103', updated_at: 'x' },
    { nama: 'Ceisya', kontak: '081234', nik: '3313010000000199', updated_at: 'y' },
  );
  assert.equal(beda, 'kontak: - → 081234; nik: ****0103 → ****0199');
  assert.equal(RingkasanPerubahan.potong('a'.repeat(300)).length, 255);
});

test('[OVERLOADING] Pengguna.boleh menerima satu hak atau daftar hak', () => {
  const kader = PabrikPengguna.dari('u1', 'User (Kader)', 'p1');
  assert.equal(kader.boleh(['baca', 'ubah']), true);
  assert.equal(kader.boleh(['baca', 'lihat_log']), false);
});
