import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { JadwalService } from './JadwalService';
import { JadwalValidator } from './JadwalValidator';
import { AWALAN_API, Modul } from '../../core/Modul';

/** /api/v1/jadwal — jadwal kegiatan yang akan datang (wajib sesi; Kader: lihat, tambah, ubah; hapus hanya Koordinator). */
export class JadwalController implements Modul {
  readonly jalur = `${AWALAN_API}/jadwal`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini; tidak dipakai bersama objek lain. */
  private readonly validator = new JadwalValidator();

  constructor(
    private readonly service: JadwalService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.use(sesi.handle);
    this.router.get('/', akses.wajib('baca'), this.daftar);
    this.router.post('/', akses.wajib('tambah'), this.tambah);
    this.router.patch('/:id', akses.wajib('ubah'), this.ubah);
    this.router.delete('/:id', akses.wajib('hapus'), this.hapus);
  }

  private readonly daftar = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.service.mendatang(), 'Jadwal kegiatan yang akan datang.');
  };

  private readonly tambah = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.tambah(this.validator.validasiTambah(req.body), SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, HttpStatus.CREATED, data, 'Jadwal kegiatan berhasil disimpan.');
  };

  private readonly ubah = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const data = await this.service.ubah(req.params.id, this.validator.validasiUbah(req.body), SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, data, 'Jadwal kegiatan berhasil diperbarui.');
  };

  private readonly hapus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await this.service.hapus(req.params.id, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, null, 'Jadwal kegiatan berhasil dihapus.');
  };
}
