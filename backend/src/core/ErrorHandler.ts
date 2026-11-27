import { NextFunction, Request, Response } from 'express';
import { PenerjemahGalat } from './errors/PenerjemahGalat';
import { SystemError } from './errors/SystemError';
import { HttpResponse } from './HttpResponse';
import { PusatPeristiwa } from './peristiwa/PusatPeristiwa';

/**
 * Penangan error terpusat Express (dipasang paling akhir di App.ts). Semua galat, dari validasi
 * sampai basis data mati, berakhir di sini dan dikirim dengan format yang sama:
 *   { status: 'error', data: null, message, errors: [{ code, field, message }] }   (AC-03)
 *
 * Alurnya: PenerjemahGalat memetakan galat ke kode katalog FSD -> peristiwa 'galat' diterbitkan
 * (PencatatGalat menulis detail teknis ke log server) -> respons dikirim tanpa detail teknis.
 *
 * [POLIMORFISME] Semua subclass AppError dikirim lewat HttpResponse.gagal(); status HTTP mengikuti objeknya.
 * [AGREGASI] PusatPeristiwa dibuat di RakitanModul.
 */
export class ErrorHandler {
  constructor(private readonly peristiwa: PusatPeristiwa) {}

  /** URL atau method yang tidak terdaftar -> 404 ERR-SYS-03, tetap memakai envelope JSON. */
  readonly tidakDitemukan = (_req: Request, res: Response): void => {
    HttpResponse.gagal(res, new SystemError('ERR-SYS-03'));
  };

  readonly handle = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const { galat, penyebab, sistem, ditolakRls } = PenerjemahGalat.terjemahkan(err);
    const operasi = `${req.method} ${req.originalUrl.split('?')[0]}`;
    const pengguna = res.locals.pengguna as { userId: string; peran: string } | undefined;

    this.peristiwa.terbitkan({
      jenis: 'galat',
      userId: pengguna?.userId ?? null,
      operasi,
      kode: galat.details.map((d) => d.code).join(','),
      pesan: penyebab,
      sistem,
      detail: sistem ? err : undefined,
    });
    // Penolakan oleh RLS basis data juga dicatat sebagai percobaan akses (FSD 6.1 ERR-AUTH-03)
    if (ditolakRls && pengguna) {
      this.peristiwa.terbitkan({
        jenis: 'akses.ditolak',
        userId: pengguna.userId,
        peran: pengguna.peran,
        hak: 'rls-basis-data',
        operasi,
      });
    }
    HttpResponse.gagal(res, galat);
  };
}
