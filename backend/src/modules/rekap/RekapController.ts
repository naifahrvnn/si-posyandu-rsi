import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { ERROR_CATALOG } from '../../core/errors/ErrorCatalog';
import { HttpResponse } from '../../core/HttpResponse';
import { RekapService } from './RekapService';
import { RekapValidator } from './RekapValidator';
import { AWALAN_API, Modul } from '../../core/Modul';

/** GET /api/v1/rekap?bulan=&tahun= — Rekapitulasi Bulanan (wajib sesi). */
export class RekapController implements Modul {
  readonly jalur = `${AWALAN_API}/rekap`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini; tidak dipakai bersama objek lain. */
  private readonly validator = new RekapValidator();

  constructor(
    private readonly service: RekapService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.get('/', sesi.handle, akses.wajib('baca'), this.rekap);
  }

  private readonly rekap = async (req: Request, res: Response): Promise<void> => {
    const { bulan, tahun } = this.validator.validasi(req.query);
    const data = await this.service.rekap(bulan, tahun);
    HttpResponse.sukses(res, data, data.ada_data ? 'Rekapitulasi bulanan.' : ERROR_CATALOG['ERR-DATA-04'].message);
  };
}
