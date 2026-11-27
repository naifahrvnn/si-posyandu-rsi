import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { MonitoringService } from './MonitoringService';
import { MonitoringValidator } from './MonitoringValidator';
import { AWALAN_API, Modul } from '../../core/Modul';

/**
 * /api/v1/monitoring — hanya Koordinator (Super User). Kader mendapat 403 ERR-AUTH-03 (FSD-2.5 EF-1).
 * GET /ringkasan : kartu KPI hari ini
 * GET /log       : riwayat aktivitas (?cari=&jenis=&dari=&sampai=&halaman=&per_halaman=)
 */
export class MonitoringController implements Modul {
  readonly jalur = `${AWALAN_API}/monitoring`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini; tidak dipakai bersama objek lain. */
  private readonly validator = new MonitoringValidator();

  constructor(
    private readonly service: MonitoringService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.use(sesi.handle, akses.wajib(['baca', 'lihat_log']));
    this.router.get('/ringkasan', this.ringkasan);
    this.router.get('/log', this.log);
  }

  private readonly ringkasan = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.ringkasan(), 'Ringkasan aktivitas hari ini.');
  };

  private readonly log = async (req: Request, res: Response): Promise<void> => {
    const { data, pesan } = await this.service.log(this.validator.validasi(req.query as Record<string, unknown>));
    HttpResponse.sukses(res, data, pesan);
  };
}
