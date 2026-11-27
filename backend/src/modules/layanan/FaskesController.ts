import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { FaskesService } from './FaskesService';
import { AWALAN_API, Modul } from '../../core/Modul';

/** GET /api/v1/faskes — daftar faskes untuk pilihan tujuan rujukan (wajib sesi, hak baca). */
export class FaskesController implements Modul {
  readonly jalur = `${AWALAN_API}/faskes`;
  readonly router: Router;

  constructor(
    private readonly service: FaskesService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.get('/', sesi.handle, akses.wajib('baca'), this.daftar);
  }

  private readonly daftar = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.daftar(), 'Daftar faskes.');
  };
}
