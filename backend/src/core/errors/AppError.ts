import { ERROR_CATALOG, ErrorCode, ErrorDetail } from './ErrorCatalog';

/**
 * Kelas dasar semua error aplikasi (inheritance).
 * Setiap subclass mewakili satu kategori di katalog FSD 6.1: Input validation, Auth, Data, Sistem.
 * ErrorHandler cukup memanggil toResponseBody() tanpa perlu tahu jenis error-nya.
 *
 * [PEWARISAN] AppError extends Error; ValidationError, AuthError, DataError, SystemError extends AppError.
 * [POLIMORFISME] Semua subclass diperlakukan sebagai AppError di ErrorHandler.
 * [ENKAPSULASI] Daftar error private; getter details mengembalikan salinan agar tidak bisa diubah dari luar.
 */
export abstract class AppError extends Error {
  /** Kategori error sesuai kolom "Kategori" pada katalog FSD 6.1. */
  abstract readonly kategori: string;

  private readonly _details: ErrorDetail[];

  /** [OVERLOADING] Satu kode error, atau beberapa error sekaligus. */
  constructor(code: ErrorCode, field?: string | null);
  constructor(details: ErrorDetail[]);
  constructor(codeOrDetails: ErrorCode | ErrorDetail[], field: string | null = null) {
    const details = Array.isArray(codeOrDetails) ? codeOrDetails : [AppError.buatDetail(codeOrDetails, field)];
    super(details[0].message);
    this._details = details;
    this.name = new.target.name;
  }

  /** Status HTTP mengikuti error pertama di katalog. */
  get httpStatus(): number {
    return ERROR_CATALOG[this._details[0].code].http;
  }

  get details(): ErrorDetail[] {
    return [...this._details];
  }

  /** Bentuk respons JSON standar: { status, data, message, errors }. */
  toResponseBody(): { status: 'error'; data: null; message: string; errors: ErrorDetail[] } {
    return { status: 'error', data: null, message: this.message, errors: this.details };
  }

  static buatDetail(code: ErrorCode, field: string | null = null): ErrorDetail {
    return { code, field, message: ERROR_CATALOG[code].message };
  }
}
