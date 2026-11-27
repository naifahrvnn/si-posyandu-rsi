import { HttpStatus } from '../HttpStatus';

/**
 * Katalog error. Kode, pesan, dan HTTP status mengikuti FSD Bagian 6.1
 * (ERR-VAL-09 dan ERR-VAL-10 dari FSD revisi 6).
 * Kode bertanda "usulan" belum ada di FSD; daftar dan alasannya ada di USULAN_REVISI_FSD_TSD.md.
 */
const {
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  PAYLOAD_TOO_LARGE,
  UNPROCESSABLE_ENTITY,
  OK,
  INTERNAL_SERVER_ERROR,
  SERVICE_UNAVAILABLE,
} = HttpStatus;

export const ERROR_CATALOG = {
  // ---------- Input validation (FSD 6.1) ----------
  'ERR-VAL-01': { http: UNPROCESSABLE_ENTITY, message: 'Bagian ini wajib diisi' },
  'ERR-VAL-02': { http: UNPROCESSABLE_ENTITY, message: 'Masukkan angka yang valid lebih dari 0' },
  'ERR-VAL-03': { http: UNPROCESSABLE_ENTITY, message: 'Tanggal tidak boleh melebihi hari ini' },
  'ERR-VAL-04': { http: UNPROCESSABLE_ENTITY, message: 'NIK harus terdiri dari 16 angka' },
  'ERR-VAL-05': { http: CONFLICT, message: 'Data dengan NIK ini sudah terdaftar' },
  'ERR-VAL-06': { http: UNPROCESSABLE_ENTITY, message: 'Isi tujuan rujukan' },
  'ERR-VAL-07': { http: UNPROCESSABLE_ENTITY, message: 'Password baru minimal 8 karakter' },
  'ERR-VAL-08': { http: UNPROCESSABLE_ENTITY, message: 'Catatan maksimal 500 karakter' },
  'ERR-VAL-09': { http: UNPROCESSABLE_ENTITY, message: 'Kontak hanya boleh berisi angka.' },
  'ERR-VAL-10': { http: UNPROCESSABLE_ENTITY, message: 'Isian melebihi batas panjang karakter' },
  // usulan
  'ERR-VAL-11': { http: UNPROCESSABLE_ENTITY, message: 'Tanggal pemeriksaan tidak boleh sebelum tanggal lahir' },
  'ERR-VAL-12': { http: UNPROCESSABLE_ENTITY, message: 'No. KK harus terdiri dari 16 angka' },
  'ERR-VAL-13': { http: CONFLICT, message: 'Kartu Keluarga ini sudah memiliki Kepala Keluarga' },
  'ERR-VAL-14': { http: UNPROCESSABLE_ENTITY, message: 'Waktu selesai harus setelah waktu mulai' },
  'ERR-VAL-15': { http: UNPROCESSABLE_ENTITY, message: 'Tanggal jadwal tidak boleh sebelum hari ini' },
  'ERR-VAL-16': { http: UNPROCESSABLE_ENTITY, message: 'Balita ini wajib dirujuk karena BB/U di luar garis KMS' },
  'ERR-VAL-17': { http: BAD_REQUEST, message: 'Format data yang dikirim tidak valid.' },
  'ERR-VAL-18': { http: PAYLOAD_TOO_LARGE, message: 'Data yang dikirim terlalu besar.' },

  // ---------- Auth (FSD 6.1) ----------
  'ERR-AUTH-01': { http: UNAUTHORIZED, message: 'Sesi Anda sudah berakhir. Silakan login kembali.' },
  'ERR-AUTH-02': { http: UNAUTHORIZED, message: 'Username atau password tidak valid.' },
  'ERR-AUTH-03': { http: FORBIDDEN, message: 'Anda tidak memiliki izin untuk mengakses ini.' },

  // ---------- Data (FSD 6.1) ----------
  'ERR-DATA-01': { http: NOT_FOUND, message: 'Data sasaran tidak ditemukan.' },
  'ERR-DATA-02': { http: OK, message: 'Kategori belum dapat ditampilkan karena data belum lengkap.' },
  'ERR-DATA-03': { http: CONFLICT, message: 'Username/NIK sudah digunakan akun lain.' },
  'ERR-DATA-04': { http: OK, message: 'Belum ada data untuk ditampilkan' },
  'ERR-DATA-05': { http: UNPROCESSABLE_ENTITY, message: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
  // usulan
  'ERR-DATA-06': { http: CONFLICT, message: 'Data tidak dapat dihapus karena masih dipakai oleh data lain.' },
  'ERR-DATA-07': { http: NOT_FOUND, message: 'Akun tidak ditemukan.' },
  'ERR-DATA-08': { http: CONFLICT, message: 'Kader tidak ditemukan atau sudah memiliki akun.' },
  'ERR-DATA-09': { http: NOT_FOUND, message: 'Jadwal kegiatan tidak ditemukan.' },
  'ERR-DATA-10': { http: UNPROCESSABLE_ENTITY, message: 'Anda tidak dapat mengubah peran akun Anda sendiri.' },
  'ERR-DATA-11': { http: CONFLICT, message: 'Data yang sama sudah tersimpan. Muat ulang halaman lalu periksa kembali.' },

  // ---------- Sistem (FSD 6.1; ERR-SYS-02 koneksi terputus dideteksi di frontend) ----------
  'ERR-SYS-01': { http: SERVICE_UNAVAILABLE, message: 'Layanan tidak tersedia. Silakan coba lagi.' },
  // usulan
  'ERR-SYS-03': { http: NOT_FOUND, message: 'Alamat layanan tidak ditemukan.' },
  'ERR-SYS-04': { http: INTERNAL_SERVER_ERROR, message: 'Terjadi kesalahan pada server. Silakan coba lagi.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

/** Satu entri pada array `errors` di respons JSON (AC-03). */
export interface ErrorDetail {
  code: ErrorCode;
  field: string | null;
  message: string;
}

/** true bila teks adalah kode yang terdaftar di katalog. */
export function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_CATALOG;
}
