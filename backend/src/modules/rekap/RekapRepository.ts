import { Baris, Kueri } from '../../core/Kueri';
import { PemeriksaanLansia } from '../lansia/PemeriksaanLansia';
import type { MetrikRekap } from './RekapService';

/**
 * Kueri agregasi rekap bulanan (FSD-2.26). Satu baris = (kelompok, metrik, label, jumlah).
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar.
 */
export class RekapRepository {
  constructor(private readonly k: Kueri) {}

  async hitung(bulan: number, tahun: number): Promise<Baris[]> {
    const periode = (kolom: string) => `MONTH(${kolom}) = @bulan AND YEAR(${kolom}) = @tahun`;
    const pb = `dbo.pemeriksaan_balita WHERE ${periode('tanggal_periksa')}`;
    const kategori = (metrik: MetrikRekap, kolom: string) =>
      `SELECT 'balita', '${metrik}', ${kolom}, COUNT(*) FROM ${pb} GROUP BY ${kolom}`;
    return this.k.pilih(
      `SELECT 'balita' AS kelompok, 'jumlah_pemeriksaan' AS metrik, N'Pemeriksaan' AS label, COUNT(*) AS jumlah FROM ${pb}
       UNION ALL SELECT 'balita', 'jumlah_sasaran', N'Sasaran hadir', COUNT(DISTINCT balita_id) FROM ${pb}
       UNION ALL SELECT 'ibu', 'jumlah_pemeriksaan', N'Pemeriksaan', COUNT(*)
         FROM dbo.pemeriksaan_ibu WHERE ${periode('tanggal_periksa')}
       UNION ALL SELECT 'ibu', 'jumlah_sasaran', N'Sasaran hadir', COUNT(DISTINCT ibu_id)
         FROM dbo.pemeriksaan_ibu WHERE ${periode('tanggal_periksa')}
       UNION ALL SELECT 'lansia', 'jumlah_pemeriksaan', N'Pemeriksaan', COUNT(*)
         FROM dbo.pemeriksaan_lansia WHERE ${periode('tanggal_periksa')}
       UNION ALL SELECT 'lansia', 'jumlah_sasaran', N'Sasaran hadir', COUNT(DISTINCT lansia_id)
         FROM dbo.pemeriksaan_lansia WHERE ${periode('tanggal_periksa')}
       UNION ALL SELECT CASE WHEN balita_id IS NOT NULL THEN 'balita' ELSE 'ibu' END, 'layanan', jenis_layanan, COUNT(*)
         FROM dbo.layanan WHERE ${periode('tanggal_layanan')}
        GROUP BY CASE WHEN balita_id IS NOT NULL THEN 'balita' ELSE 'ibu' END, jenis_layanan
       UNION ALL ${kategori('stunting', 'kategori_stunting')}
       UNION ALL ${kategori('bbu', 'kategori_bbu')}
       UNION ALL ${kategori('bb_tb', 'kategori_bb_tb')}
       UNION ALL ${kategori('lk_u', 'kategori_lika')}
       UNION ALL SELECT 'balita', 'rujukan', N'Wajib dirujuk (BB/U di luar garis merah-oranye)', COUNT(DISTINCT balita_id)
         FROM ${pb} AND kategori_bbu IN (N'Berat badan sangat kurang', N'Berat badan kurang', N'Risiko berat badan lebih')
       UNION ALL SELECT 'balita', 'rujukan', N'Sudah ditandai dirujuk', COUNT(DISTINCT p.balita_id)
         FROM dbo.pemeriksaan_balita p JOIN dbo.isian_pendukung i ON i.pemeriksaan_balita_id = p.pemeriksaan_balita_id
        WHERE ${periode('p.tanggal_periksa')} AND i.status_rujukan = 1
       UNION ALL SELECT 'ibu', 'kek', status_kek, COUNT(*)
         FROM dbo.pemeriksaan_ibu WHERE ${periode('tanggal_periksa')} GROUP BY status_kek
       UNION ALL SELECT 'lansia', 'imt', COALESCE(kategori_imt, N'Belum tersedia'), COUNT(*)
         FROM dbo.pemeriksaan_lansia WHERE ${periode('tanggal_periksa')} GROUP BY COALESCE(kategori_imt, N'Belum tersedia')
       UNION ALL SELECT 'lansia', 'puma', g.label, COUNT(*) FROM (
         SELECT CASE WHEN skor_puma IS NULL THEN N'Tidak diskrining (bukan perokok >= 40 th)'
                     WHEN skor_puma > ${PemeriksaanLansia.BATAS_RUJUK_PUMA} THEN N'Skor >= 7, dirujuk ke FKTP (spirometri)'
                     ELSE N'Skor < 7' END AS label
           FROM dbo.pemeriksaan_lansia WHERE ${periode('tanggal_periksa')}) g
        GROUP BY g.label`,
      { bulan, tahun },
    );
  }
}
