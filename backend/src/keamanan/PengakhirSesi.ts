import { PencatatAudit } from '../core/audit/PencatatAudit';
import { Konfigurasi } from '../config/Konfigurasi';
import { Database } from '../core/Database';
import { Logger } from '../core/Logger';
import { SesiRepository } from './SesiRepository';

/**
 * Mengakhiri sesi yang sudah lewat 8 jam dan mencatatnya sebagai Logout di log_aktivitas (BR-35, FSD-2.5).
 * Dipanggil dua cara:
 *  - SesiMiddleware: saat pengguna kembali dengan sesi kedaluwarsa (langsung tercatat);
 *  - mulaiBerkala(): penyapuan rutin untuk sesi yang tidak pernah dipakai lagi.
 * Kegagalan menulis log tidak menghalangi pengguna (sesi tetap dianggap berakhir, ERR-AUTH-01).
 *
 * [AGREGASI] Database dibuat di luar (RakitanModul).
 * [ASINKRON] Penyapuan berjalan di latar belakang lewat setInterval.
 */
export class PengakhirSesi {
  private static readonly MS_PER_MENIT = 60_000;
  private pewaktu: NodeJS.Timeout | null = null;

  constructor(private readonly db: Database) {}

  /** Mengembalikan jumlah sesi yang diakhiri. */
  async akhiri(idSesi?: string): Promise<number> {
    const k = await this.db.kueri();
    const pemilik = await new SesiRepository(k).hapusKedaluwarsa(idSesi);
    for (const userId of pemilik) {
      await PencatatAudit.catat(k, userId, {
        jenis: 'Logout',
        entitas: 'pengguna',
        idData: userId,
        keterangan: `Logout otomatis: sesi berakhir setelah ${Konfigurasi.MASA_SESI_JAM} jam`,
      });
    }
    return pemilik.length;
  }

  /** Versi aman untuk dipanggil tanpa menunggu: galat hanya dicatat di log server. */
  akhiriDiLatar(idSesi?: string): void {
    this.akhiri(idSesi).catch((err) => Logger.error('Pengakhiran sesi kedaluwarsa gagal', err));
  }

  mulaiBerkala(): void {
    if (this.pewaktu) return;
    this.akhiriDiLatar();
    this.pewaktu = setInterval(() => this.akhiriDiLatar(), Konfigurasi.JEDA_SAPU_SESI_MENIT * PengakhirSesi.MS_PER_MENIT);
    this.pewaktu.unref(); // tidak menahan proses Node saat server dimatikan
  }

  berhenti(): void {
    if (this.pewaktu) clearInterval(this.pewaktu);
    this.pewaktu = null;
  }
}
