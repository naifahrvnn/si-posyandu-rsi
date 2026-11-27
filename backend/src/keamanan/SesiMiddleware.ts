import { NextFunction, Request, Response } from 'express';
import { Database } from '../core/Database';
import { AuthError } from '../core/errors/AuthError';
import { PengakhirSesi } from './PengakhirSesi';
import { Pengguna } from './Pengguna';
import { SesiRepository } from './SesiRepository';

/**
 * Memeriksa header x-id-sesi sebelum request masuk ke controller (AC-04, BR-35, NFR-009).
 * [AGREGASI] Database dan PengakhirSesi dibuat di luar dan dipakai bersama.
 */
export class SesiMiddleware {
  static readonly PANJANG_ID_SESI = 64;

  constructor(
    private readonly db: Database,
    private readonly pengakhir: PengakhirSesi,
  ) {}

  readonly handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idSesi = req.header('x-id-sesi');
    if (!idSesi || idSesi.length !== SesiMiddleware.PANJANG_ID_SESI) throw new AuthError('ERR-AUTH-01');
    const pengguna = await new SesiRepository(await this.db.kueri()).cariPenggunaAktif(idSesi);
    if (!pengguna) {
      this.pengakhir.akhiriDiLatar(idSesi); // sesi lewat 8 jam -> dicatat Logout otomatis
      throw new AuthError('ERR-AUTH-01');
    }
    res.locals.pengguna = pengguna;
    res.locals.idSesi = idSesi;
    next();
  };

  static penggunaDari(res: Response): Pengguna {
    return res.locals.pengguna as Pengguna;
  }

  static idSesiDari(res: Response): string {
    return res.locals.idSesi as string;
  }
}
