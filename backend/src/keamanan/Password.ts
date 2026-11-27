import bcrypt from 'bcryptjs';
import { ValidationError } from '../core/errors/ValidationError';

/**
 * Password akun (value object). Dipakai Login (FSD-2.1), Ganti Password (FSD-2.3), dan Kelola Akun (FSD-2.4).
 *
 * [ENKAPSULASI] Teks password disimpan private dan tidak pernah dikeluarkan; yang keluar hanya hash bcrypt.
 *   Objek hanya bisa dibuat lewat Password.baru(), jadi setiap objek Password pasti sudah lolos aturan BR-04.
 * [ASINKRON] Hashing dan pencocokan bcrypt berjalan async agar server tidak tertahan.
 */
export class Password {
  /** BR-04 / ERR-VAL-07: minimal 8 karakter. */
  static readonly PANJANG_MIN = 8;
  /**
   * Batas teknis bcrypt: hanya 72 byte pertama yang dipakai. Tidak tercantum di FSD
   * (masuk usulan revisi FSD BR-04); lebih dari itu ditolak dengan ERR-VAL-10.
   */
  static readonly PANJANG_MAKS = 72;
  /** Sama dengan cost hash di 04_seed.sql (Bagian A dan C). */
  private static readonly BIAYA_BCRYPT = 12;

  private constructor(private readonly teks: string) {}

  /**
   * Membuat password baru yang sudah divalidasi.
   * @param field nama isian untuk pesan galat, mis. 'password_baru' atau 'password_awal'.
   */
  static baru(teks: string, field: string): Password {
    if (teks.length === 0) throw new ValidationError('ERR-VAL-01', field);
    if (teks.length < Password.PANJANG_MIN) throw new ValidationError('ERR-VAL-07', field);
    if (Buffer.byteLength(teks, 'utf8') > Password.PANJANG_MAKS) throw new ValidationError('ERR-VAL-10', field);
    return new Password(teks);
  }

  /** Hash bcrypt untuk disimpan di pengguna.password_hash. */
  hash(): Promise<string> {
    return bcrypt.hash(this.teks, Password.BIAYA_BCRYPT);
  }

  /**
   * Mencocokkan teks yang diketik saat login dengan hash tersimpan.
   * Sebagian hash di data contoh diawali spasi, jadi di-trim dulu.
   */
  static cocok(teks: string, hash: string): Promise<boolean> {
    return bcrypt.compare(teks, hash.trim());
  }
}
