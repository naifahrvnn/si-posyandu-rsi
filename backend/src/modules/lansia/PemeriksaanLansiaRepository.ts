import { Baris, Parameter } from '../../core/Kueri';
import { PemeriksaanRepository } from '../pemeriksaan/PemeriksaanRepository';
import { HasilTes, PemeriksaanLansia } from './PemeriksaanLansia';

/** Tabel dbo.pemeriksaan_lansia. */
export class PemeriksaanLansiaRepository extends PemeriksaanRepository<PemeriksaanLansia> {
  protected override readonly tabel = 'pemeriksaan_lansia';
  protected override readonly kolomId = 'pemeriksaan_lansia_id';
  protected override readonly kolomSasaran = 'lansia_id';
  protected override readonly kolomData = [
    'berat_badan',
    'tinggi_badan',
    'lingkar_perut',
    'imt',
    'tekanan_darah_sistolik',
    'tekanan_darah_diastolik',
    'gula_darah',
    'hitung_jari_kanan',
    'hitung_jari_kiri',
    'berbisik_kanan',
    'berbisik_kiri',
    'merokok',
    'bungkus_per_tahun',
    'puma_gejala_1',
    'puma_gejala_2',
    'puma_gejala_3',
    'puma_gejala_4',
    'kategori_imt',
    'kategori_tekanan_darah',
    'kategori_gula_darah',
    'skor_puma',
  ];

  protected override nilaiData(p: PemeriksaanLansia): Parameter {
    const d = p.props;
    return {
      berat_badan: d.beratBadan,
      tinggi_badan: d.tinggiBadan,
      lingkar_perut: d.lingkarPerut,
      imt: d.imt,
      tekanan_darah_sistolik: d.tdSistolik,
      tekanan_darah_diastolik: d.tdDiastolik,
      gula_darah: d.gulaDarah,
      hitung_jari_kanan: d.hitungJariKanan,
      hitung_jari_kiri: d.hitungJariKiri,
      berbisik_kanan: d.berbisikKanan,
      berbisik_kiri: d.berbisikKiri,
      merokok: d.merokok,
      bungkus_per_tahun: d.bungkusPerTahun,
      puma_gejala_1: d.pumaGejala[0],
      puma_gejala_2: d.pumaGejala[1],
      puma_gejala_3: d.pumaGejala[2],
      puma_gejala_4: d.pumaGejala[3],
      kategori_imt: d.kategoriImt,
      kategori_tekanan_darah: d.kategoriTekananDarah,
      kategori_gula_darah: d.kategoriGulaDarah,
      skor_puma: d.skorPuma,
    };
  }

  protected override keEntitas(b: Baris): PemeriksaanLansia {
    const angka = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    const ya = (v: unknown) => (v === null || v === undefined ? null : Boolean(v));
    return PemeriksaanLansia.pulihkan({
      ...this.dataDasar(b),
      beratBadan: Number(b.berat_badan),
      tinggiBadan: Number(b.tinggi_badan),
      lingkarPerut: Number(b.lingkar_perut),
      imt: Number(b.imt),
      tdSistolik: angka(b.tekanan_darah_sistolik),
      tdDiastolik: angka(b.tekanan_darah_diastolik),
      gulaDarah: angka(b.gula_darah),
      hitungJariKanan: (b.hitung_jari_kanan as HasilTes | null) ?? null,
      hitungJariKiri: (b.hitung_jari_kiri as HasilTes | null) ?? null,
      berbisikKanan: (b.berbisik_kanan as HasilTes | null) ?? null,
      berbisikKiri: (b.berbisik_kiri as HasilTes | null) ?? null,
      merokok: ya(b.merokok),
      bungkusPerTahun: angka(b.bungkus_per_tahun),
      pumaGejala: [ya(b.puma_gejala_1), ya(b.puma_gejala_2), ya(b.puma_gejala_3), ya(b.puma_gejala_4)],
      kategoriImt: (b.kategori_imt as string | null) ?? null,
      kategoriTekananDarah: (b.kategori_tekanan_darah as string | null) ?? null,
      kategoriGulaDarah: (b.kategori_gula_darah as string | null) ?? null,
      skorPuma: angka(b.skor_puma),
    });
  }
}
