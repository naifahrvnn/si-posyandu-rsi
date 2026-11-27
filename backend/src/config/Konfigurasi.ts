import 'dotenv/config';

/** Bilangan dari variabel lingkungan; bila kosong atau bukan angka, pakai nilai bawaan. */
function angkaEnv(nama: string, bawaan: number): number {
  const nilai = Number(process.env[nama]);
  return process.env[nama] && Number.isFinite(nilai) ? nilai : bawaan;
}

/**
 * Satu-satunya tempat membaca file .env. Kelas lain mengambil pengaturan dari sini,
 * jadi tidak ada process.env atau angka pengaturan yang tersebar di kode.
 *
 * [ENKAPSULASI] Semua atribut static readonly: dibaca sekali saat aplikasi mulai dan tidak bisa diubah.
 */
export class Konfigurasi {
  /** Port HTTP backend. */
  static readonly PORT = angkaEnv('PORT', 3000);
  /** Origin frontend yang boleh memanggil API (CORS), dipisah koma di .env. */
  static readonly CORS_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim());
  /** Batas ukuran body JSON; lebih dari ini ditolak 413 ERR-VAL-10. */
  static readonly BATAS_BODY = '100kb';

  /** Koneksi SQL Server. Instance bernama (mis. SQLEXPRESS): isi DB_INSTANCE dan kosongkan DB_PORT. */
  static readonly DB = {
    server: process.env.DB_SERVER ?? 'localhost',
    instance: process.env.DB_INSTANCE || undefined,
    port: angkaEnv('DB_PORT', 1433),
    nama: process.env.DB_NAME ?? 'posyandu_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: process.env.DB_ENCRYPT !== 'false',
    // true untuk SQL Server lokal yang memakai sertifikat self-signed
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    /** Jumlah koneksi maksimal di pool. */
    poolMaks: angkaEnv('DB_POOL_MAKS', 10),
    /** Koneksi menganggur ditutup setelah 30 detik. */
    poolIdleMs: 30_000,
    /** Batas waktu satu query; lebih lama dari ini dianggap gagal (503 ERR-SYS-01). */
    queryTimeoutMs: angkaEnv('DB_QUERY_TIMEOUT_MS', 15_000),
  } as const;

  /** Masa berlaku sesi login (BR-35). */
  static readonly MASA_SESI_JAM = 8;
  /** Jeda penyapuan sesi kedaluwarsa. */
  static readonly JEDA_SAPU_SESI_MENIT = 10;
}
