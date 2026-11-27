import sql from 'mssql';
import { Konfigurasi } from '../config/Konfigurasi';
import { Kueri } from './Kueri';

/** Siapa yang menjalankan transaksi: dipakai trigger audit dan kebijakan RLS di basis data. */
export interface Pelaku {
  userId: string;
  peran: string;
}

/**
 * Koneksi ke SQL Server `posyandu_db`.
 *
 * [DESIGN PATTERN: SINGLETON] Seluruh aplikasi memakai satu pool lewat Database.getInstance().
 * [ENKAPSULASI] Constructor, konfigurasi, dan pool bersifat private.
 * [ASINKRON] Pool dibuka saat pertama dipakai; transaksi() menunggu (await) setiap langkah.
 * [KOMPOSISI] ConnectionPool dibuat, dimiliki, dan ditutup (tutup()) oleh Database; tidak ada objek lain yang membuatnya.
 */
export class Database {
  private static instance: Database | null = null;
  private readonly config: sql.config;
  private poolPromise: Promise<sql.ConnectionPool> | null = null;

  private constructor() {
    const db = Konfigurasi.DB;
    this.config = {
      server: db.server,
      port: db.instance ? undefined : db.port, // instance bernama memakai port dinamis
      database: db.nama,
      user: db.user,
      password: db.password,
      requestTimeout: db.queryTimeoutMs,
      options: { instanceName: db.instance, encrypt: db.encrypt, trustServerCertificate: db.trustServerCertificate },
      pool: { max: db.poolMaks, min: 0, idleTimeoutMillis: db.poolIdleMs },
    };
  }

  /** Untuk GET /status: true bila basis data menjawab query sederhana. */
  async siap(): Promise<boolean> {
    try {
      await (await this.kueri()).satu('SELECT 1 AS siap');
      return true;
    } catch {
      return false;
    }
  }

  static getInstance(): Database {
    if (!Database.instance) Database.instance = new Database();
    return Database.instance;
  }

  /** Kueri untuk baca di luar transaksi. */
  async kueri(): Promise<Kueri> {
    return new Kueri(await this.pool());
  }

  /**
   * Menjalankan kerja di dalam satu transaksi (AC-09, BR-36).
   * user_id dan peran disimpan di SESSION_CONTEXT ('app_user_id', 'app_peran'):
   * - trigger audit membaca app_user_id untuk log_aktivitas.user_id;
   * - kebijakan RLS (03_security.sql) membaca app_peran dan app_user_id: DELETE hanya Super User, ubah akun hanya Super User atau pemiliknya.
   * Bila kerja gagal, seluruh perubahan di-rollback (termasuk catatan log, FSD-2.5 EF-3).
   */
  async transaksi<T>(pelaku: Pelaku, kerja: (k: Kueri) => Promise<T>): Promise<T> {
    const tx = new sql.Transaction(await this.pool());
    await tx.begin();
    const k = new Kueri(tx);
    try {
      await Database.aturKonteks(k, pelaku);
      const hasil = await kerja(k);
      await Database.aturKonteks(k, null);
      await tx.commit();
      return hasil;
    } catch (err) {
      // Dikosongkan agar tidak terbawa ke request lain yang memakai koneksi ini
      await Database.aturKonteks(k, null).catch(() => undefined);
      await tx.rollback().catch(() => undefined);
      throw err;
    }
  }

  async tutup(): Promise<void> {
    if (this.poolPromise) await (await this.poolPromise).close();
    this.poolPromise = null;
  }

  private pool(): Promise<sql.ConnectionPool> {
    if (!this.poolPromise) {
      this.poolPromise = new sql.ConnectionPool(this.config).connect().catch((err) => {
        this.poolPromise = null;
        throw err;
      });
    }
    return this.poolPromise;
  }

  private static async aturKonteks(k: Kueri, pelaku: Pelaku | null): Promise<void> {
    await k.jalankan(
      `EXEC sp_set_session_context @key = N'app_user_id', @value = @uid;
       EXEC sp_set_session_context @key = N'app_peran', @value = @peran;`,
      { uid: pelaku?.userId ?? null, peran: pelaku?.peran ?? null },
    );
  }
}
