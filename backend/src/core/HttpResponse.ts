import { Response } from 'express';
import { AppError } from './errors/AppError';
import { HttpStatus } from './HttpStatus';

/** Pengirim respons JSON standar { status, data, message, errors } (AC-03). */
export class HttpResponse {
  /**
   * [OVERLOADING] Dua cara memanggil:
   *   sukses(res, data, message)          -> status 200
   *   sukses(res, 201, data, message)     -> status ditentukan sendiri
   */
  static sukses(res: Response, data: unknown, message: string): void;
  static sukses(res: Response, httpStatus: number, data: unknown, message: string): void;
  static sukses(res: Response, a: unknown, b: unknown, c?: string): void {
    const [httpStatus, data, message] = c === undefined ? [HttpStatus.OK, a, b as string] : [a as number, b, c];
    res.status(httpStatus).json({ status: 'success', data, message, errors: null });
  }

  static gagal(res: Response, error: AppError): void {
    res.status(error.httpStatus).json(error.toResponseBody());
  }
}
