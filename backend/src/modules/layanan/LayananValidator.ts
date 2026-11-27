import { z } from 'zod';
import { ValidationError } from '../../core/errors/ValidationError';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { JENIS_LAYANAN_BALITA, JENIS_LAYANAN_IBU, KelompokLayanan, LayananInput } from './Layanan';
import { PANJANG } from '../../core/BatasIsian';

/**
 * Validasi layanan (FSD-2.9 EF-1/EF-2, FSD-2.16 EF-1/EF-2). Body: { layanan: [ ... ] }, minimal satu.
 * Jenis layanan berbeda untuk balita (BR-26) dan ibu (BR-27).
 */
export class LayananValidator extends ValidatorDasar {
  private readonly skema: z.ZodType<{ layanan?: LayananInput[] }>;

  constructor(kelompok: KelompokLayanan) {
    super();
    const jenis = kelompok === 'balita' ? [...JENIS_LAYANAN_BALITA] : [...JENIS_LAYANAN_IBU];
    this.skema = z.object({
      layanan: z
        .array(
          z.object({
            jenis_layanan: this.pilihan(jenis as [string, ...string[]]),
            tanggal_layanan: this.tanggalLalu(),
            jumlah_tablet: this.bulatPositifOpsional(),
            konsumsi_harian: this.yaTidakOpsional(),
            komposisi_mt: this.teksOpsional(PANJANG.KETERANGAN_PANJANG),
            porsi_mt: this.teksOpsional(PANJANG.KETERANGAN_PANJANG),
            konsumsi_mt: this.yaTidakOpsional(),
            keterangan: this.teksOpsional(PANJANG.KETERANGAN_PENDEK),
          }),
          { required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' },
        )
        .min(1, 'ERR-VAL-01'),
    }) as z.ZodType<{ layanan?: LayananInput[] }>;
  }

  validasi(body: unknown): LayananInput[] {
    const hasil = this.jalankan(this.skema, body);
    if (!hasil.layanan) throw new ValidationError('ERR-VAL-01', 'layanan');
    return hasil.layanan;
  }
}
