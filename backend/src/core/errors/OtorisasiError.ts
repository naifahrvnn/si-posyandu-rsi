import { AppError } from './AppError';

/** Kategori "Authorization": ERR-AUTH-03, peran tidak memiliki hak untuk aksi ini (403). */
export class OtorisasiError extends AppError {
  /** [OVERRIDING] Mengisi properti abstract kategori dari AppError. */
  override readonly kategori = 'Authorization';
}
