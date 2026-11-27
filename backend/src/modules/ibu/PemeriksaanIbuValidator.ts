import { z } from 'zod';
import { PemeriksaanValidator } from '../pemeriksaan/PemeriksaanValidator';
import { PemeriksaanIbuInput } from './PemeriksaanIbu';
import { NILAI_MAKS } from '../../core/BatasIsian';

/** SCR-09 Form Pemeriksaan Ibu (FSD-2.13 EF-1 s.d. EF-6, FSD-2.14 EF-1). */
export class PemeriksaanIbuValidator extends PemeriksaanValidator<PemeriksaanIbuInput> {
  private readonly skema = z.object({
    tanggal_periksa: this.tanggalLalu(),
    berat_badan: this.angkaPositif(),
    lila: this.angkaPositif(),
    tekanan_darah_sistolik: this.bulatPositif(NILAI_MAKS.TEKANAN_DARAH),
    tekanan_darah_diastolik: this.bulatPositif(NILAI_MAKS.TEKANAN_DARAH),
    usia_kehamilan_minggu: this.bulatPositifOpsional(NILAI_MAKS.USIA_KEHAMILAN_MINGGU),
    bb_sesuai_kurva_kia: this.yaTidakOpsional(),
    td_sesuai_kurva_kia: this.yaTidakOpsional(),
    hb: this.angkaPositifOpsional(NILAI_MAKS.HB),
  });

  override validasi(body: unknown): PemeriksaanIbuInput {
    return this.jalankan(this.skema, body) as PemeriksaanIbuInput;
  }
}
