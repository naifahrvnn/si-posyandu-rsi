import { Request, Response } from 'express';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { ERROR_CATALOG } from '../../core/errors/ErrorCatalog';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { Sasaran } from '../sasaran/Sasaran';
import { Pemeriksaan } from './Pemeriksaan';
import { PemeriksaanService } from './PemeriksaanService';
import { PemeriksaanValidator } from './PemeriksaanValidator';
import { PenanganPemeriksaan } from '../sasaran/KelompokRouter';

/** Controller pemeriksaan dan riwayat untuk satu kelompok sasaran. */
export class PemeriksaanController<
  S extends Sasaran,
  P extends Pemeriksaan,
  In extends { tanggal_periksa: string },
> implements PenanganPemeriksaan {
  constructor(
    private readonly service: PemeriksaanService<S, P, In>,
    private readonly validator: PemeriksaanValidator<In>,
  ) {}

  readonly catat = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const input = this.validator.validasi(req.body);
    const hasil = await this.service.catat(req.params.id, input, SesiMiddleware.penggunaDari(res));
    const pesan = hasil.peringatan ? ERROR_CATALOG['ERR-DATA-02'].message : 'Pemeriksaan berhasil disimpan.';
    HttpResponse.sukses(res, HttpStatus.CREATED, { ...hasil.data, peringatan: hasil.peringatan }, pesan);
  };

  readonly riwayat = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const data = await this.service.riwayat(req.params.id);
    // FSD-2.11 EF-1: belum ada pemeriksaan -> ERR-DATA-04, identitas tetap tampil
    const pesan = data.pemeriksaan.length === 0 ? ERROR_CATALOG['ERR-DATA-04'].message : 'Riwayat ditemukan.';
    HttpResponse.sukses(res, data, pesan);
  };
}
