import { AppError } from './AppError';

/** Kategori "Data": ERR-DATA-01 (data tidak ditemukan), ERR-DATA-03 (username/NIK bentrok), ERR-DATA-05 (nonaktifkan akun sendiri). */
export class DataError extends AppError {
  /** [OVERRIDING] Mengisi properti abstract kategori dari AppError. */
  override readonly kategori = 'Data';
}
