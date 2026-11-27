import { Baris, Kueri } from '../../core/Kueri';
import { Kelompok } from '../sasaran/Sasaran';
import { IsianPendukung } from './IsianPendukung';

/**
 * Akses tabel dbo.isian_pendukung dan dbo.rujukan (FSD-2.10, 2.17, 2.23).
 * Log aktivitas ditulis service lewat PencatatAudit, dalam transaksi yang sama.
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar.
 */
export class IsianPendukungRepository {
  private static readonly KOLOM_PEMERIKSAAN: Record<Kelompok, string> = {
    balita: 'pemeriksaan_balita_id',
    ibu: 'pemeriksaan_ibu_id',
    lansia: 'pemeriksaan_lansia_id',
  };

  constructor(private readonly k: Kueri) {}

  async cari(kelompok: Kelompok, pemeriksaanId: string): Promise<IsianPendukung | null> {
    const kolom = IsianPendukungRepository.KOLOM_PEMERIKSAAN[kelompok];
    const b = await this.k.satu(
      `SELECT ip.*, r.faskes_id, f.nama_faskes, r.alasan_rujukan, r.status_tindak_lanjut, r.divalidasi_oleh
         FROM dbo.isian_pendukung ip WITH (UPDLOCK)
         LEFT JOIN dbo.rujukan r ON r.isian_id = ip.isian_id
         LEFT JOIN dbo.faskes f ON f.faskes_id = r.faskes_id
        WHERE ip.${kolom} = @pid`,
      { pid: pemeriksaanId },
    );
    return b ? IsianPendukungRepository.keIsian(b, pemeriksaanId) : null;
  }

  async simpan(kelompok: Kelompok, isian: IsianPendukung): Promise<void> {
    const kolom = IsianPendukungRepository.KOLOM_PEMERIKSAAN[kelompok];
    await this.k.jalankan(
      `INSERT INTO dbo.isian_pendukung (isian_id, ${kolom}, tbc_batuk, tbc_demam, tbc_bb_tidak_naik, tbc_kontak_erat,
         status_rujukan, catatan_edukasi)
       VALUES (@id, @pid, @batuk, @demam, @bb, @kontak, @rujuk, @catatan)`,
      IsianPendukungRepository.parameterIsian(isian),
    );
  }

  async perbarui(isian: IsianPendukung): Promise<void> {
    await this.k.jalankan(
      `UPDATE dbo.isian_pendukung SET tbc_batuk = @batuk, tbc_demam = @demam, tbc_bb_tidak_naik = @bb,
         tbc_kontak_erat = @kontak, status_rujukan = @rujuk, catatan_edukasi = @catatan
       WHERE isian_id = @id`,
      IsianPendukungRepository.parameterIsian(isian),
    );
  }

  /**
   * Menyamakan tabel rujukan dengan isian: dirujuk -> buat/perbarui rujukan;
   * tidak dirujuk -> hapus rujukan yang belum divalidasi koordinator.
   */
  async simpanRujukan(isian: IsianPendukung, tanggalRujukan: string): Promise<void> {
    const d = isian.props;
    if (d.rujukan) {
      await this.k.jalankan(
        `IF EXISTS (SELECT 1 FROM dbo.rujukan WHERE isian_id = @isian)
           UPDATE dbo.rujukan SET faskes_id = @faskes, alasan_rujukan = @alasan WHERE isian_id = @isian
         ELSE
           INSERT INTO dbo.rujukan (isian_id, tanggal_rujukan, faskes_id, alasan_rujukan)
           VALUES (@isian, @tanggal, @faskes, @alasan)`,
        { isian: d.id, faskes: d.rujukan.faskesId, alasan: d.rujukan.alasanRujukan, tanggal: tanggalRujukan },
      );
    } else {
      await this.k.jalankan('DELETE FROM dbo.rujukan WHERE isian_id = @isian AND divalidasi_oleh IS NULL', { isian: d.id });
    }
  }

  private static parameterIsian(isian: IsianPendukung) {
    const d = isian.props;
    return {
      id: d.id,
      pid: d.pemeriksaanId,
      batuk: d.tbcBatuk,
      demam: d.tbcDemam,
      bb: d.tbcBbTidakNaik,
      kontak: d.tbcKontakErat,
      rujuk: d.statusRujukan,
      catatan: d.catatanEdukasi,
    };
  }

  /** Baris isian (+ kolom rujukan/faskes hasil LEFT JOIN) menjadi objek IsianPendukung. */
  static keIsian(b: Baris, pemeriksaanId: string, awalan = ''): IsianPendukung {
    const v = (k: string) => b[awalan + k];
    return IsianPendukung.pulihkan({
      id: String(v('isian_id')),
      pemeriksaanId,
      tbcBatuk: Boolean(v('tbc_batuk')),
      tbcDemam: Boolean(v('tbc_demam')),
      tbcBbTidakNaik: Boolean(v('tbc_bb_tidak_naik')),
      tbcKontakErat: Boolean(v('tbc_kontak_erat')),
      statusRujukan: Boolean(v('status_rujukan')),
      catatanEdukasi: (v('catatan_edukasi') as string | null) ?? null,
      rujukan: v('faskes_id')
        ? {
            faskesId: String(v('faskes_id')),
            namaFaskes: (v('nama_faskes') as string | null) ?? null,
            alasanRujukan: String(v('alasan_rujukan')),
            statusTindakLanjut: (v('status_tindak_lanjut') as string | null) ?? null,
          }
        : null,
    });
  }
}
