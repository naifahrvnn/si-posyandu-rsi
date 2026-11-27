import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { DashboardService } from './DashboardService';
import { AWALAN_API, Modul } from '../../core/Modul';

/** GET /api/v1/dashboard — ringkasan bulan sebelumnya dan jadwal mendatang (wajib sesi). */
export class DashboardController implements Modul {
  readonly jalur = `${AWALAN_API}/dashboard`;
  readonly router: Router;

  constructor(
    private readonly service: DashboardService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.get('/', sesi.handle, akses.wajib('baca'), this.ringkasan);
  }

  private readonly ringkasan = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.ringkasan(), 'Ringkasan dashboard.');
  };
}
