import { Request, Response, Router } from 'express';
import { AksesPeran } from '../../keamanan/AksesPeran';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { AWALAN_API, Modul } from '../../core/Modul';
import { Kelompok } from './Sasaran';

/** Parameter rute kelompok: :id = sasaran, :pid = pemeriksaan. */
type ParamRute = { id: string; pid: string };
type Handler = (req: Request<ParamRute>, res: Response) => Promise<void>;

/** Interface kecil: router hanya butuh method penangan, bukan kelas controller tertentu. */
export interface PenanganSasaran {
  tambah: Handler;
  detail: Handler;
  ubah: Handler;
  hapus: Handler;
}
export interface PenanganPemeriksaan {
  catat: Handler;
  riwayat: Handler;
}
export interface PenanganSimpan {
  simpan: Handler;
}

/**
 * Rute satu kelompok sasaran: /api/v1/balita, /api/v1/ibu, /api/v1/lansia.
 * Semua endpoint wajib sesi login (BR-35) dan hak sesuai peran (RBAC):
 * GET = baca, POST = tambah, PATCH = ubah, DELETE = hapus (hanya Koordinator).
 *
 * [ASOSIASI] Controller dan middleware hanya dipakai untuk memasang rute, tidak disimpan sebagai atribut.
 * [POLIMORFISME] Router menerima controller kelompok mana pun selama memenuhi interface di atas.
 */
export class KelompokRouter implements Modul {
  readonly jalur: string;
  readonly router: Router;

  constructor(
    kelompok: Kelompok,
    sesi: SesiMiddleware,
    akses: AksesPeran,
    sasaran: PenanganSasaran,
    pemeriksaan: PenanganPemeriksaan,
    isianPendukung: PenanganSimpan,
    /** Hanya balita dan ibu; lansia tidak memiliki layanan (BR-28). */
    layanan?: PenanganSimpan,
  ) {
    this.jalur = `${AWALAN_API}/${kelompok}`;
    this.router = Router();
    this.router.use(sesi.handle);
    const [baca, tambah, ubah, hapus] = (['baca', 'tambah', 'ubah', 'hapus'] as const).map((h) => akses.wajib(h));
    this.router.post('/', tambah, sasaran.tambah);
    this.router.get('/:id', baca, sasaran.detail);
    this.router.patch('/:id', ubah, sasaran.ubah);
    this.router.delete('/:id', hapus, sasaran.hapus); // Kader: 403 ERR-AUTH-03
    this.router.post('/:id/pemeriksaan', tambah, pemeriksaan.catat);
    this.router.get('/:id/riwayat', baca, pemeriksaan.riwayat);
    this.router.post('/:id/pemeriksaan/:pid/isian-pendukung', tambah, isianPendukung.simpan);
    if (layanan) this.router.post('/:id/pemeriksaan/:pid/layanan', tambah, layanan.simpan);
  }
}
