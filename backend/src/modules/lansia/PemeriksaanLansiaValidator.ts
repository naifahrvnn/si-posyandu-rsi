import { z } from 'zod';
import { PemeriksaanValidator } from '../pemeriksaan/PemeriksaanValidator';
import { PemeriksaanLansiaInput } from './PemeriksaanLansia';
import { NILAI_MAKS } from '../../core/BatasIsian';

/** SCR-13 Form Pemeriksaan Lansia (FSD-2.20, 2.21; BR-38). */
export class PemeriksaanLansiaValidator extends PemeriksaanValidator<PemeriksaanLansiaInput> {
  private readonly hasilTes = () => this.pilihanOpsional(['Normal', 'Gangguan']);

  private readonly skema = z.object({
    tanggal_periksa: this.tanggalLalu(),
    berat_badan: this.angkaPositif(),
    tinggi_badan: this.angkaPositif(),
    lingkar_perut: this.angkaPositif(),
    tekanan_darah_sistolik: this.bulatPositif(NILAI_MAKS.TEKANAN_DARAH),
    tekanan_darah_diastolik: this.bulatPositif(NILAI_MAKS.TEKANAN_DARAH),
    gula_darah: this.angkaPositif(NILAI_MAKS.GULA_DARAH),
    hitung_jari_kanan: this.hasilTes(),
    hitung_jari_kiri: this.hasilTes(),
    berbisik_kanan: this.hasilTes(),
    berbisik_kiri: this.hasilTes(),
    merokok: this.yaTidakOpsional(),
    rokok_per_hari: this.bulatPositifOpsional(NILAI_MAKS.ROKOK_PER_HARI),
    lama_merokok_tahun: this.angkaPositifOpsional(NILAI_MAKS.LAMA_MEROKOK_TAHUN),
    puma_gejala_1: this.yaTidakOpsional(),
    puma_gejala_2: this.yaTidakOpsional(),
    puma_gejala_3: this.yaTidakOpsional(),
    puma_gejala_4: this.yaTidakOpsional(),
  });

  override validasi(body: unknown): PemeriksaanLansiaInput {
    return this.jalankan(this.skema, body) as PemeriksaanLansiaInput;
  }
}
