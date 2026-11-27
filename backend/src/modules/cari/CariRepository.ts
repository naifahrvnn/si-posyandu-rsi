import { Baris, Kueri } from '../../core/Kueri';

/**
 * Kueri pencarian sasaran (FSD-2.25): nama dari superclass WARGA, kelompok dari subclass BALITA / IBU / LANSIA,
 * ditambah ringkasan pemeriksaan terakhir tiap sasaran.
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar.
 */
export class CariRepository {
  static readonly MAKS_HASIL = 50;

  constructor(private readonly k: Kueri) {}

  /** Pencarian sebagian, tidak peka huruf besar/kecil (collation bawaan SQL Server). */
  async cariNama(kataKunci: string): Promise<Baris[]> {
    return this.k.pilih(
      `WITH sasaran AS (
         SELECT 'balita' AS kelompok, warga_id FROM dbo.balita
         UNION ALL SELECT 'ibu', warga_id FROM dbo.ibu
         UNION ALL SELECT 'lansia', warga_id FROM dbo.lansia
       ), periksa AS (
         SELECT 'balita' AS kelompok, balita_id AS warga_id, tanggal_periksa, created_at, kategori_stunting AS ringkasan
           FROM dbo.pemeriksaan_balita
         UNION ALL SELECT 'ibu', ibu_id, tanggal_periksa, created_at, status_kek FROM dbo.pemeriksaan_ibu
         UNION ALL SELECT 'lansia', lansia_id, tanggal_periksa, created_at, COALESCE(kategori_imt, 'Belum tersedia')
           FROM dbo.pemeriksaan_lansia
       ), terakhir AS (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY kelompok, warga_id ORDER BY tanggal_periksa DESC, created_at DESC) AS urut
           FROM periksa
       )
       SELECT TOP (${CariRepository.MAKS_HASIL}) s.kelompok, w.warga_id, w.nik, w.nama, w.tanggal_lahir, w.jenis_kelamin,
              kk.dusun, kk.rt, kk.rw, t.tanggal_periksa, t.ringkasan
         FROM sasaran s
         JOIN dbo.warga w ON w.warga_id = s.warga_id
         JOIN dbo.kartu_keluarga kk ON kk.no_kk = w.no_kk
         LEFT JOIN terakhir t ON t.kelompok = s.kelompok AND t.warga_id = s.warga_id AND t.urut = 1
        WHERE w.nama LIKE @pola ESCAPE '\\'
        ORDER BY w.nama`,
      { pola: `%${kataKunci.replace(/[\\%_[]/g, (c) => `\\${c}`)}%` },
    );
  }
}
