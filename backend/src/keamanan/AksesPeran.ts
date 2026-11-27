import { NextFunction, Request, RequestHandler, Response } from 'express';
import { OtorisasiError } from '../core/errors/OtorisasiError';
import { PusatPeristiwa } from '../core/peristiwa/PusatPeristiwa';
import { Hak } from './Pengguna';
import { SesiMiddleware } from './SesiMiddleware';

/**
 * Route guard backend (RBAC). Dipasang SETELAH SesiMiddleware.
 * Tombol yang disembunyikan di UI tidak cukup: request yang ditembak langsung ke API juga ditolak di sini,
 * lalu basis data menolak lagi lewat kebijakan RLS (pertahanan berlapis).
 *
 * Penolakan diterbitkan sebagai peristiwa 'akses.ditolak' (FSD 6, aturan 5: percobaan dicatat).
 *
 * [POLIMORFISME] pengguna.boleh(hak) dijawab oleh subclass Kader atau Koordinator.
 */
export class AksesPeran {
  constructor(private readonly peristiwa: PusatPeristiwa) {}

  /**
   * Middleware: lanjut hanya bila pengguna punya hak tersebut; bila tidak, ERR-AUTH-03 (403).
   * [OVERLOADING] wajib('hapus') atau wajib(['baca', 'lihat_log']) (semua hak harus dimiliki).
   */
  wajib(hak: Hak): RequestHandler;
  wajib(daftar: readonly Hak[]): RequestHandler;
  wajib(hak: Hak | readonly Hak[]): RequestHandler {
    const diminta: readonly Hak[] = typeof hak === 'string' ? [hak] : hak;
    return (req: Request, res: Response, next: NextFunction): void => {
      const pengguna = SesiMiddleware.penggunaDari(res);
      if (pengguna.boleh(diminta)) {
        next();
        return;
      }
      this.peristiwa.terbitkan({
        jenis: 'akses.ditolak',
        userId: pengguna.userId,
        peran: pengguna.peran,
        hak: diminta.join(','),
        operasi: `${req.method} ${req.originalUrl.split('?')[0]}`,
      });
      throw new OtorisasiError('ERR-AUTH-03');
    };
  }
}
