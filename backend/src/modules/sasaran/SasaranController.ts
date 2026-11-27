import { Request, Response } from 'express';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { IdentitasInput, Sasaran } from './Sasaran';
import { SasaranService } from './SasaranService';
import { SasaranValidator } from './SasaranValidator';
import { PenanganSasaran } from './KelompokRouter';

/**
 * Controller identitas sasaran: terima request, panggil validator dan service, kirim respons (AC-02).
 * [AGREGASI] Service dan validator dibuat di luar (RakitanModul).
 */
export class SasaranController<T extends Sasaran, I extends IdentitasInput> implements PenanganSasaran {
  constructor(
    private readonly label: string,
    private readonly service: SasaranService<T, I>,
    private readonly validator: SasaranValidator<I>,
  ) {}

  readonly tambah = async (req: Request, res: Response): Promise<void> => {
    const input = this.validator.validasiTambah(req.body);
    const data = await this.service.tambah(input, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, HttpStatus.CREATED, data, `Data ${this.label} berhasil disimpan.`);
  };

  readonly detail = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.detail(req.params.id), `Data ${this.label} ditemukan.`);
  };

  readonly ubah = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const perubahan = this.validator.validasiUbah(req.body);
    const data = await this.service.ubah(req.params.id, perubahan, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, data, `Data ${this.label} berhasil diperbarui.`);
  };

  readonly hapus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await this.service.hapus(req.params.id, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, null, `Data ${this.label} berhasil dihapus.`);
  };
}
