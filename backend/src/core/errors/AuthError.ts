import { AppError } from './AppError';

/** Kategori "Auth": ERR-AUTH-01 (belum login atau sesi berakhir). */
export class AuthError extends AppError {
  /** [OVERRIDING] Mengisi properti abstract kategori dari AppError. */
  override readonly kategori = 'Auth';
}
