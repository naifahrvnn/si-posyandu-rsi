import { DataError } from './errors/DataError';
import { ErrorCode } from './errors/ErrorCatalog';

/**
 * Pemeriksa ID (kolom UNIQUEIDENTIFIER). ID yang tidak berbentuk UUID pasti tidak ada di tabel,
 * jadi langsung dijawab "tidak ditemukan" tanpa bertanya ke basis data.
 */
export class Uuid {
  private static readonly POLA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  static valid(id: string): boolean {
    return Uuid.POLA.test(id);
  }

  /** Lempar DataError dengan kode "tidak ditemukan" yang sesuai bila salah satu ID bukan UUID. */
  static pastikan(kodeTidakDitemukan: ErrorCode, ...id: string[]): void {
    if (!id.every(Uuid.valid)) throw new DataError(kodeTidakDitemukan);
  }
}
