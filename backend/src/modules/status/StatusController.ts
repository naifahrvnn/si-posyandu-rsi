import { Request, Response, Router } from 'express';
import { HttpResponse } from '../../core/HttpResponse';
import { AWALAN_API, Modul } from '../../core/Modul';
import { StatusService } from './StatusService';

/** GET /api/v1/status — publik (tanpa login): 200 bila server dan basis data siap, 503 ERR-SYS-01 bila basis data mati. */
export class StatusController implements Modul {
  readonly jalur = `${AWALAN_API}/status`;
  readonly router: Router;

  constructor(private readonly service: StatusService) {
    this.router = Router();
    this.router.get('/', this.periksa);
  }

  private readonly periksa = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.periksa(), 'Layanan berjalan normal.');
  };
}
