import { AppError } from './AppError';

/** Kategori "Sistem": ERR-SYS-01 (basis data tidak tersedia), ERR-SYS-03 (alamat API salah), ERR-SYS-04 (galat tak terduga di server). */
export class SystemError extends AppError {
  /** [OVERRIDING] Mengisi properti abstract kategori dari AppError. */
  override readonly kategori = 'Sistem';
}
