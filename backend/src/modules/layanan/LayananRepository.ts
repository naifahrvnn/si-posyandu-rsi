import { Baris, Kueri } from '../../core/Kueri';
import { JenisLayanan, KelompokLayanan, Layanan } from './Layanan';
import { Tanggal } from '../../core/Tanggal';

/**
 * Akses tabel dbo.layanan (FSD-2.9, FSD-2.16).
 * Log aktivitas ditulis trigger trg_audit_layanan_insert (skrip SMBD).
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar.
 */
export class LayananRepository {
  private static readonly KOLOM_SASARAN: Record<KelompokLayanan, string> = { balita: 'balita_id', ibu: 'ibu_id' };

  constructor(private readonly k: Kueri) {}

  async simpan(l: Layanan): Promise<void> {
    const d = l.props;
    const kolom = LayananRepository.KOLOM_SASARAN[d.kelompok];
    await this.k.jalankan(
      `INSERT INTO dbo.layanan (layanan_id, ${kolom}, tanggal_layanan, jenis_layanan, jumlah_tablet, konsumsi_harian,
         komposisi_mt, porsi_mt, konsumsi_mt, keterangan, dicatat_oleh)
       VALUES (@id, @sasaran, @tanggal, @jenis, @jumlah, @harian, @komposisi, @porsi, @konsumsi, @keterangan, @oleh)`,
      {
        id: d.id,
        sasaran: d.sasaranId,
        tanggal: d.tanggalLayanan,
        jenis: d.jenisLayanan,
        jumlah: d.jumlahTablet,
        harian: d.konsumsiHarian,
        komposisi: d.komposisiMt,
        porsi: d.porsiMt,
        konsumsi: d.konsumsiMt,
        keterangan: d.keterangan,
        oleh: d.dicatatOleh,
      },
    );
  }

  /** Riwayat layanan, terbaru di atas. */
  async daftar(kelompok: KelompokLayanan, sasaranId: string): Promise<Layanan[]> {
    const kolom = LayananRepository.KOLOM_SASARAN[kelompok];
    const baris = await this.k.pilih(
      `SELECT * FROM dbo.layanan WHERE ${kolom} = @id ORDER BY tanggal_layanan DESC, created_at DESC`,
      { id: sasaranId },
    );
    return baris.map((b) => LayananRepository.keLayanan(b, kelompok, sasaranId));
  }

  private static keLayanan(b: Baris, kelompok: KelompokLayanan, sasaranId: string): Layanan {
    const ya = (v: unknown) => (v === null || v === undefined ? null : Boolean(v));
    return Layanan.pulihkan({
      id: String(b.layanan_id),
      kelompok,
      sasaranId,
      tanggalLayanan: Tanggal.dariDb(b.tanggal_layanan),
      jenisLayanan: b.jenis_layanan as JenisLayanan,
      jumlahTablet: (b.jumlah_tablet as number | null) ?? null,
      konsumsiHarian: ya(b.konsumsi_harian),
      komposisiMt: (b.komposisi_mt as string | null) ?? null,
      porsiMt: (b.porsi_mt as string | null) ?? null,
      konsumsiMt: ya(b.konsumsi_mt),
      keterangan: (b.keterangan as string | null) ?? null,
      dicatatOleh: String(b.dicatat_oleh),
      dibuatPada: (b.created_at as string | null) ?? null,
    });
  }
}
