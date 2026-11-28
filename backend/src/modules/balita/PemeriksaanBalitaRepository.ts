import { Baris, Parameter } from '../../core/Kueri';
import { PemeriksaanRepository } from '../pemeriksaan/PemeriksaanRepository';
import { PemeriksaanBalita, StatusBeratBadan } from './PemeriksaanBalita';

/** Tabel dbo.pemeriksaan_balita. */
export class PemeriksaanBalitaRepository extends PemeriksaanRepository<PemeriksaanBalita> {
  protected override readonly tabel = 'pemeriksaan_balita';
  protected override readonly kolomId = 'pemeriksaan_balita_id';
  protected override readonly kolomSasaran = 'balita_id';
  protected override readonly kolomData = [
    'berat_badan',
    'tinggi_panjang_badan',
    'lila',
    'lika',
    'status_berat_badan',
    'kategori_stunting',
    'kategori_bbu',
    'kategori_bb_tb',
    'kategori_lila',
    'kategori_lika',
  ];

  /**
   * BR-19: BB pada pemeriksaan terakhir sampai tanggal ini; null bila belum pernah ditimbang.
   * Memakai <= agar pemeriksaan lain pada tanggal yang sama (sudah tersimpan lebih dulu) ikut menjadi
   * pembanding. Query dijalankan sebelum baris baru disimpan.
   */
  async beratSebelumnya(balitaId: string, tanggal: string): Promise<number | null> {
    const b = await this.k.satu(
      `SELECT TOP 1 berat_badan FROM dbo.pemeriksaan_balita
        WHERE balita_id = @id AND tanggal_periksa <= @tgl
        ORDER BY tanggal_periksa DESC, created_at DESC`,
      { id: balitaId, tgl: tanggal },
    );
    return b ? Number(b.berat_badan) : null;
  }

  protected override nilaiData(p: PemeriksaanBalita): Parameter {
    const d = p.props;
    return {
      berat_badan: d.beratBadan,
      tinggi_panjang_badan: d.tinggiPanjangBadan,
      lila: d.lila,
      lika: d.lika,
      status_berat_badan: d.statusBeratBadan,
      kategori_stunting: d.kategoriStunting,
      kategori_bbu: d.kategoriBbu,
      kategori_bb_tb: d.kategoriBbTb,
      kategori_lila: d.kategoriLila,
      kategori_lika: d.kategoriLika,
    };
  }

  protected override keEntitas(b: Baris): PemeriksaanBalita {
    return PemeriksaanBalita.pulihkan({
      ...this.dataDasar(b),
      beratBadan: Number(b.berat_badan),
      tinggiPanjangBadan: Number(b.tinggi_panjang_badan),
      lila: Number(b.lila),
      lika: Number(b.lika),
      statusBeratBadan: b.status_berat_badan as StatusBeratBadan,
      kategoriStunting: String(b.kategori_stunting),
      kategoriBbu: String(b.kategori_bbu),
      kategoriBbTb: String(b.kategori_bb_tb),
      kategoriLila: String(b.kategori_lila),
      kategoriLika: String(b.kategori_lika),
    });
  }
}
