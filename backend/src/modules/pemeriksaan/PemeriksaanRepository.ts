import { Baris, Kueri, Parameter } from '../../core/Kueri';
import { IsianPendukung } from '../layanan/IsianPendukung';
import { IsianPendukungRepository } from '../layanan/IsianPendukungRepository';
import { Pemeriksaan } from './Pemeriksaan';
import { Tanggal } from '../../core/Tanggal';

/** Satu baris riwayat: pemeriksaan beserta isian pendukung kunjungan yang sama. */
export interface BarisRiwayat<P extends Pemeriksaan> {
  pemeriksaan: P;
  isian: IsianPendukung | null;
}

/**
 * Akses tabel pemeriksaan_balita / pemeriksaan_ibu / pemeriksaan_lansia.
 *
 * [ABSTRAKSI + PEWARISAN] Query bersama ditulis sekali; subclass menyebut tabel dan kolomnya.
 * [AGREGASI] Menyimpan objek Kueri dari luar.
 */
export abstract class PemeriksaanRepository<P extends Pemeriksaan> {
  constructor(protected readonly k: Kueri) {}

  protected abstract readonly tabel: string;
  protected abstract readonly kolomId: string;
  protected abstract readonly kolomSasaran: string;
  /** Kolom data (selain id, sasaran, tanggal, dicatat_oleh, created_at); nama parameter = nama kolom. */
  protected abstract readonly kolomData: readonly string[];
  protected abstract nilaiData(p: P): Parameter;
  protected abstract keEntitas(b: Baris): P;

  async simpan(p: P): Promise<void> {
    const kolom = [this.kolomId, this.kolomSasaran, 'tanggal_periksa', 'dicatat_oleh', ...this.kolomData];
    await this.k.jalankan(
      `INSERT INTO dbo.${this.tabel} (${kolom.join(', ')}) VALUES (${kolom.map((c) => `@${c}`).join(', ')})`,
      {
        [this.kolomId]: p.id,
        [this.kolomSasaran]: p.sasaranId,
        tanggal_periksa: p.tanggalPeriksa,
        dicatat_oleh: p.dicatatOleh,
        ...this.nilaiData(p),
      },
    );
  }

  async cariMilik(pemeriksaanId: string, sasaranId: string): Promise<P | null> {
    const b = await this.k.satu(`SELECT * FROM dbo.${this.tabel} WHERE ${this.kolomId} = @pid AND ${this.kolomSasaran} = @sid`, {
      pid: pemeriksaanId,
      sid: sasaranId,
    });
    return b ? this.keEntitas(b) : null;
  }

  /** Riwayat pemeriksaan, terbaru di atas (BR-29), beserta isian pendukung. */
  async riwayat(sasaranId: string): Promise<BarisRiwayat<P>[]> {
    const baris = await this.k.pilih(
      `SELECT p.*, ip.isian_id AS ip_isian_id, ip.tbc_batuk AS ip_tbc_batuk, ip.tbc_demam AS ip_tbc_demam,
              ip.tbc_bb_tidak_naik AS ip_tbc_bb_tidak_naik, ip.tbc_kontak_erat AS ip_tbc_kontak_erat,
              ip.status_rujukan AS ip_status_rujukan, ip.catatan_edukasi AS ip_catatan_edukasi,
              r.faskes_id AS ip_faskes_id, f.nama_faskes AS ip_nama_faskes, r.alasan_rujukan AS ip_alasan_rujukan,
              r.status_tindak_lanjut AS ip_status_tindak_lanjut
         FROM dbo.${this.tabel} p
         LEFT JOIN dbo.isian_pendukung ip ON ip.${this.kolomId} = p.${this.kolomId}
         LEFT JOIN dbo.rujukan r ON r.isian_id = ip.isian_id
         LEFT JOIN dbo.faskes f ON f.faskes_id = r.faskes_id
        WHERE p.${this.kolomSasaran} = @sid
        ORDER BY p.tanggal_periksa DESC, p.created_at DESC`,
      { sid: sasaranId },
    );
    return baris.map((b) => ({ pemeriksaan: this.keEntitas(b), isian: this.isianDari(b) }));
  }

  /** Data umum pemeriksaan dari satu baris tabel. */
  protected dataDasar(b: Baris) {
    return {
      id: String(b[this.kolomId]),
      sasaranId: String(b[this.kolomSasaran]),
      tanggalPeriksa: Tanggal.dariDb(b.tanggal_periksa),
      dicatatOleh: String(b.dicatat_oleh),
      dibuatPada: (b.created_at as string | null) ?? null,
    };
  }

  private isianDari(b: Baris): IsianPendukung | null {
    return b.ip_isian_id ? IsianPendukungRepository.keIsian(b, String(b[this.kolomId]), 'ip_') : null;
  }
}
