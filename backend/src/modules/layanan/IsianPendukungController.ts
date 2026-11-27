import { Request, Response } from 'express';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { Pemeriksaan } from '../pemeriksaan/Pemeriksaan';
import { IsianPendukungService } from './IsianPendukungService';
import { IsianPendukungValidator } from './IsianPendukungValidator';
import { PenanganSimpan } from '../sasaran/KelompokRouter';

/** POST /{balita|ibu|lansia}/{id}/pemeriksaan/{pid}/isian-pendukung — 201 bila baru, 200 bila memperbarui. */
export class IsianPendukungController<P extends Pemeriksaan> implements PenanganSimpan {
  constructor(
    private readonly service: IsianPendukungService<P>,
    private readonly validator: IsianPendukungValidator,
  ) {}

  readonly simpan = async (req: Request<{ id: string; pid: string }>, res: Response): Promise<void> => {
    const input = this.validator.validasi(req.body);
    const { baru, isian } = await this.service.simpan(req.params.id, req.params.pid, input, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(
      res,
      baru ? HttpStatus.CREATED : HttpStatus.OK,
      isian,
      baru ? 'Isian pendukung berhasil disimpan.' : 'Isian pendukung berhasil diperbarui.',
    );
  };
}
