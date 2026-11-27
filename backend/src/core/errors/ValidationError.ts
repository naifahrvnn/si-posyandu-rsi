import { AppError } from './AppError';

/** Kategori "Input validation": ERR-VAL-01 s.d. ERR-VAL-10 (422, atau 409 untuk ERR-VAL-05). */
export class ValidationError extends AppError {
  /** [OVERRIDING] Mengisi properti abstract kategori dari AppError. */
  override readonly kategori = 'Input validation';
}
