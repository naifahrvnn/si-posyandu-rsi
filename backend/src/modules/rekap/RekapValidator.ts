import { z } from 'zod';
import { ValidatorDasar } from '../../core/ValidatorDasar';

/** ?bulan= dan ?tahun= wajib dipilih (FSD-2.26 EF-1). */
export class RekapValidator extends ValidatorDasar {
  private readonly skema = z.object({
    bulan: z.coerce.number({ invalid_type_error: 'ERR-VAL-01' }).int('ERR-VAL-01').min(1, 'ERR-VAL-01').max(12, 'ERR-VAL-01'),
    tahun: z.coerce
      .number({ invalid_type_error: 'ERR-VAL-01' })
      .int('ERR-VAL-01')
      .min(2000, 'ERR-VAL-01')
      .max(2100, 'ERR-VAL-01'),
  });

  validasi(query: { bulan?: unknown; tahun?: unknown }): { bulan: number; tahun: number } {
    return this.jalankan(this.skema, { bulan: query.bulan || undefined, tahun: query.tahun || undefined });
  }
}
