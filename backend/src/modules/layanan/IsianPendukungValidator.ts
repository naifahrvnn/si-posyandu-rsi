import { z } from 'zod';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { IsianPendukungInput } from './IsianPendukung';
import { PANJANG } from '../../core/BatasIsian';

/**
 * Validasi isian pendukung (EF-1 ERR-VAL-06, EF-2 ERR-VAL-08). Body: objek isian langsung.
 * Bila dirujuk: faskes tujuan (ERR-VAL-06) dan alasan rujukan (ERR-VAL-01) wajib.
 */
export class IsianPendukungValidator extends ValidatorDasar {
  private readonly skema = z
    .object({
      tbc_batuk: this.yaTidakOpsional(),
      tbc_demam: this.yaTidakOpsional(),
      tbc_bb_tidak_naik: this.yaTidakOpsional(),
      tbc_kontak_erat: this.yaTidakOpsional(),
      status_rujukan: this.yaTidakOpsional(),
      faskes_id: z.preprocess(
        (v) => (v === '' ? null : v),
        z.string({ invalid_type_error: 'ERR-VAL-06' }).uuid('ERR-VAL-06').nullable().optional(),
      ),
      alasan_rujukan: this.teksOpsional(PANJANG.ALASAN_RUJUKAN),
      catatan_edukasi: z.preprocess(
        (v) => (v === '' ? null : v),
        z.string({ invalid_type_error: 'ERR-VAL-08' }).max(PANJANG.CATATAN_EDUKASI, 'ERR-VAL-08').nullable().optional(),
      ),
    })
    .superRefine((v, ctx) => {
      if (v.status_rujukan === true && !v.faskes_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['faskes_id'], message: 'ERR-VAL-06' }); // tujuan rujukan
      }
      if (v.status_rujukan === true && !v.alasan_rujukan) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['alasan_rujukan'], message: 'ERR-VAL-01' }); // NOT NULL di rujukan
      }
    });

  validasi(body: unknown): IsianPendukungInput {
    return this.jalankan(this.skema, body) as IsianPendukungInput;
  }
}
