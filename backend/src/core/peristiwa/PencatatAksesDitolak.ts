import { PencatatAudit } from '../audit/PencatatAudit';
import { Database } from '../Database';
import { Logger } from '../Logger';
import { Pengamat } from './Pengamat';
import { Peristiwa, PeristiwaAksesDitolak } from './Peristiwa';

/**
 * Pengamat 3: menulis percobaan akses tanpa hak ke log_aktivitas dengan jenis 'Ditolak'
 * (FSD 6.1 ERR-AUTH-03: "percobaan dicatat ke log aktivitas").
 * Sumber peristiwa: AksesPeran (route guard) dan ErrorHandler (penolakan RLS basis data).
 *
 * Penulisan log ini tidak boleh menghalangi respons 403 ke pengguna: bila gagal,
 * galatnya hanya dicatat di log server.
 *
 * [POLIMORFISME BERBASIS INTERFACE] implements Pengamat.
 * [AGREGASI] Database dibuat di luar (RakitanModul).
 * [ASINKRON] terima() tidak menunggu penulisan selesai; penulisan berjalan di latar belakang.
 */
export class PencatatAksesDitolak implements Pengamat {
  constructor(private readonly db: Database) {}

  terima(p: Peristiwa): void {
    if (p.jenis !== 'akses.ditolak' || !p.userId) return;
    this.tulis(p, p.userId).catch((err) => Logger.error('Log akses ditolak gagal ditulis', err, { operasi: p.operasi }));
  }

  private async tulis(p: PeristiwaAksesDitolak, userId: string): Promise<void> {
    await PencatatAudit.catat(await this.db.kueri(), userId, {
      jenis: 'Ditolak',
      entitas: PencatatAksesDitolak.modulDari(p.operasi),
      idData: userId,
      keterangan: `Akses ditolak: ${p.operasi} (hak yang dibutuhkan: ${p.hak})`,
    });
  }

  /** "DELETE /api/v1/balita/123" -> "balita". */
  private static modulDari(operasi: string): string {
    return operasi.split(' ')[1]?.split('/')[3] ?? 'aplikasi';
  }
}
