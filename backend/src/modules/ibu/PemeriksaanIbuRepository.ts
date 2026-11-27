import { Baris, Parameter } from '../../core/Kueri';
import { PemeriksaanRepository } from '../pemeriksaan/PemeriksaanRepository';
import { PemeriksaanIbu } from './PemeriksaanIbu';

/** Tabel dbo.pemeriksaan_ibu. */
export class PemeriksaanIbuRepository extends PemeriksaanRepository<PemeriksaanIbu> {
  protected override readonly tabel = 'pemeriksaan_ibu';
  protected override readonly kolomId = 'pemeriksaan_ibu_id';
  protected override readonly kolomSasaran = 'ibu_id';
  protected override readonly kolomData = [
    'berat_badan',
    'lila',
    'tekanan_darah_sistolik',
    'tekanan_darah_diastolik',
    'usia_kehamilan_minggu',
    'bb_sesuai_kurva_kia',
    'td_sesuai_kurva_kia',
    'hb',
    'status_kek',
    'status_anemia',
  ];

  protected override nilaiData(p: PemeriksaanIbu): Parameter {
    const d = p.props;
    return {
      berat_badan: d.beratBadan,
      lila: d.lila,
      tekanan_darah_sistolik: d.tdSistolik,
      tekanan_darah_diastolik: d.tdDiastolik,
      usia_kehamilan_minggu: d.usiaKehamilanMinggu,
      bb_sesuai_kurva_kia: d.bbSesuaiKurvaKia,
      td_sesuai_kurva_kia: d.tdSesuaiKurvaKia,
      hb: d.hb,
      status_kek: d.statusKek,
      status_anemia: d.statusAnemia,
    };
  }

  protected override keEntitas(b: Baris): PemeriksaanIbu {
    return PemeriksaanIbu.pulihkan({
      ...this.dataDasar(b),
      beratBadan: Number(b.berat_badan),
      lila: Number(b.lila),
      tdSistolik: Number(b.tekanan_darah_sistolik),
      tdDiastolik: Number(b.tekanan_darah_diastolik),
      usiaKehamilanMinggu: (b.usia_kehamilan_minggu as number | null) ?? null,
      bbSesuaiKurvaKia: b.bb_sesuai_kurva_kia === null ? null : Boolean(b.bb_sesuai_kurva_kia),
      tdSesuaiKurvaKia: b.td_sesuai_kurva_kia === null ? null : Boolean(b.td_sesuai_kurva_kia),
      hb: b.hb === null ? null : Number(b.hb),
      statusKek: String(b.status_kek),
      statusAnemia: (b.status_anemia as string | null) ?? null,
    });
  }
}
