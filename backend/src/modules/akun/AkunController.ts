import { Request, Response, Router } from 'express';
import { HttpResponse } from '../../core/HttpResponse';
import { HttpStatus } from '../../core/HttpStatus';
import { AWALAN_API, Modul } from '../../core/Modul';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { AkunValidator } from './AkunValidator';
import { GantiPasswordService } from './GantiPasswordService';
import { KelolaAkunService } from './KelolaAkunService';

/**
 * /api/v1/akun
 *   PUT   /saya/password      Ganti Password akun sendiri (FSD-2.3)        semua peran yang login
 *   GET   /                   Daftar akun (FSD-2.4)                         Super User
 *   GET   /kader-tanpa-akun   Pilihan kader terdaftar untuk Tambah Akun     Super User
 *   POST  /                   Tambah akun                                   Super User
 *   PATCH /:id                Ubah data akun (AF-1)                         Super User
 *   PATCH /:id/status         Nonaktifkan / aktifkan akun (AF-2)            Super User
 * Kader yang membuka rute Super User mendapat 403 ERR-AUTH-03 (FSD-2.4 EF-3).
 * Tidak ada DELETE: akun dinonaktifkan, tidak dihapus permanen (BR-06).
 */
export class AkunController implements Modul {
  readonly jalur = `${AWALAN_API}/akun`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini. */
  private readonly validator = new AkunValidator();

  constructor(
    private readonly kelola: KelolaAkunService,
    private readonly password: GantiPasswordService,
    sesi: SesiMiddleware,
    akses: AksesPeran,
  ) {
    this.router = Router();
    this.router.use(sesi.handle);
    this.router.put('/saya/password', this.gantiPassword);

    const superUser = akses.wajib('kelola_akun');
    this.router.get('/', superUser, this.daftar);
    this.router.get('/kader-tanpa-akun', superUser, this.kaderTanpaAkun);
    this.router.post('/', superUser, this.tambah);
    this.router.patch('/:id', superUser, this.ubah);
    this.router.patch('/:id/status', superUser, this.ubahStatus);
  }

  private readonly gantiPassword = async (req: Request, res: Response): Promise<void> => {
    const { password_baru } = this.validator.validasiGantiPassword(req.body);
    await this.password.ganti(password_baru, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, null, 'Password berhasil diganti.');
  };

  private readonly daftar = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.kelola.daftar(SesiMiddleware.penggunaDari(res)), 'Daftar akun pengguna.');
  };

  private readonly kaderTanpaAkun = async (_req: Request, res: Response): Promise<void> => {
    HttpResponse.sukses(res, await this.kelola.kaderTanpaAkun(), 'Daftar kader yang belum memiliki akun.');
  };

  private readonly tambah = async (req: Request, res: Response): Promise<void> => {
    const data = await this.kelola.tambah(this.validator.validasiTambah(req.body), SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, HttpStatus.CREATED, data, 'Akun berhasil dibuat.');
  };

  private readonly ubah = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const data = await this.kelola.ubah(req.params.id, this.validator.validasiUbah(req.body), SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, data, 'Data akun berhasil diperbarui.');
  };

  private readonly ubahStatus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { status_akun } = this.validator.validasiStatus(req.body);
    const data = await this.kelola.ubahStatus(req.params.id, status_akun, SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(
      res,
      data,
      status_akun === 'Nonaktif' ? 'Akun berhasil dinonaktifkan.' : 'Akun berhasil diaktifkan kembali.',
    );
  };
}
