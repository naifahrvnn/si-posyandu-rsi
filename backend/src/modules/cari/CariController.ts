import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { CariService } from './CariService';
import { CariValidator } from './CariValidator';
import { AWALAN_API, Modul } from '../../core/Modul';

/** GET /api/v1/sasaran?nama= — Cari Data Sasaran (wajib sesi). */
export class CariController implements Modul {
  readonly jalur = `${AWALAN_API}/sasaran`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini; tidak dipakai bersama objek lain. */
  private readonly validator = new CariValidator();

  constructor(
    private readonly service: CariService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.get('/', sesi.handle, akses.wajib('baca'), this.cari);
  }

  private readonly cari = async (req: Request, res: Response): Promise<void> => {
    const { nama } = this.validator.validasi({ ...req.query });
    HttpResponse.sukses(res, await this.service.cari(nama), 'Data sasaran ditemukan.');
  };
}
