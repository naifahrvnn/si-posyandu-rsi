/**
 * Batas isian di satu tempat, agar tidak ada angka "ajaib" di validator.
 * - PANJANG: jumlah karakter maksimal, mengikuti panjang kolom di 01_schema.sql.
 *   Kolom NVARCHAR(MAX) tetap diberi batas agar isian tetap wajar dibaca di layar.
 * - NILAI_MAKS: nilai angka maksimal, mengikuti presisi kolom DECIMAL atau batas wajar pengukuran.
 * Melewati PANJANG -> ERR-VAL-10; melewati NILAI_MAKS -> ERR-VAL-02.
 */
export const PANJANG = {
  /** NVARCHAR(100): nama warga, nama petugas. */
  NAMA: 100,
  /** VARCHAR(15): nomor HP. */
  KONTAK: 15,
  /** VARCHAR(50): pengguna.user_name. */
  USERNAME: 50,
  /** NVARCHAR(50): kader.jabatan_kader. */
  JABATAN_KADER: 50,
  /** NVARCHAR(255): kartu_keluarga.alamat. */
  ALAMAT: 255,
  /** NVARCHAR(50): kartu_keluarga.dusun, desa, kecamatan. */
  WILAYAH: 50,
  /** VARCHAR(5): kartu_keluarga.rt dan rw. */
  RT_RW: 5,
  /** VARCHAR(20): lansia.status_perkawinan. */
  STATUS_PERKAWINAN: 20,
  /** NVARCHAR(150): jadwal_kegiatan.nama_kegiatan dan lokasi. */
  JADWAL_NAMA_LOKASI: 150,
  /** NVARCHAR(MAX), dibatasi 500: jadwal_kegiatan.keterangan dan isian MT. */
  KETERANGAN_PANJANG: 500,
  /** NVARCHAR(MAX), dibatasi 255: layanan.keterangan. */
  KETERANGAN_PENDEK: 255,
  /** NVARCHAR(500): isian_pendukung.catatan_edukasi (ERR-VAL-08). */
  CATATAN_EDUKASI: 500,
  /** NVARCHAR(MAX), dibatasi 1000: rujukan.alasan_rujukan. */
  ALASAN_RUJUKAN: 1000,
  /** Kata kunci pencarian log aktivitas. */
  KATA_KUNCI: 100,
} as const;

export const NILAI_MAKS = {
  /** DECIMAL(5,2): berat lahir balita (kg). */
  BERAT_LAHIR_KG: 99.99,
  /** DECIMAL(5,2): panjang lahir balita (cm). */
  PANJANG_LAHIR_CM: 999.99,
  /** Batas wajar pengukuran tekanan darah (mmHg). */
  TEKANAN_DARAH: 300,
  /** Batas wajar usia kehamilan (minggu). */
  USIA_KEHAMILAN_MINGGU: 45,
  /** Batas wajar urutan kehamilan. */
  KEHAMILAN_KE: 30,
  /** Batas wajar kadar Hb (g/dL); kolom DECIMAL(4,1). */
  HB: 99.9,
  /** DECIMAL(5,1): gula darah (mg/dL). */
  GULA_DARAH: 9999.9,
  /** Batas wajar jumlah rokok per hari (batang). */
  ROKOK_PER_HARI: 200,
  /** Batas wajar lama merokok (tahun). */
  LAMA_MEROKOK_TAHUN: 100,
  /** DECIMAL(5,2): berat, tinggi, LILA, lingkar kepala dan sejenisnya. */
  UKURAN_UMUM: 999.99,
  /** Bilangan bulat umum (jumlah, urutan). */
  BULAT_UMUM: 9999,
  /** DECIMAL(5,1) yang boleh 0. */
  DESIMAL_SATU: 9999.9,
} as const;
