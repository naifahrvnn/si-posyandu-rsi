import { Request, Response } from 'express';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { Pemeriksaan } from '../pemeriksaan/Pemeriksaan';
import { LayananService } from './LayananService';
import { LayananValidator } from './LayananValidator';
import { PenanganSimpan } from '../sasaran/KelompokRouter';

/** POST /{balita|ibu}/{id}/pemeriksaan/{pid}/layanan */
export class LayananController<P extends Pemeriksaan> implements PenanganSimpan {
  constructor(
    private readonly service: LayananService<P>,
    private readonly validator: LayananValidator,
  ) {}

  readonly simpan = async (req: Request<{ id: string; pid: string }>, res: Response): Promise<void> => {
    const daftar = this.validator.validasi(req.body);
    const data = await this.service.simpan(req.params.id, req.params.pid, daftar, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, HttpStatus.CREATED, data, 'Layanan berhasil disimpan.');
  };
}
