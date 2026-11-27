import { z } from 'zod';
import { Tanggal } from '../../core/Tanggal';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { FilterLog } from './FilterLog';
import { PANJANG } from '../../core/BatasIsian';

/** Validasi query ?cari=&jenis=&dari=&sampai=&halaman=&per_halaman= (SCR-19). */
export class MonitoringValidator extends ValidatorDasar {
  static readonly JENIS = ['Login', 'Logout', 'Input', 'Edit', 'Delete', 'Ditolak'] as const;
  /** Pilihan jumlah baris per halaman (usulan revisi FSD: batas pagination belum ditetapkan). */
  static readonly PILIHAN_PER_HALAMAN = [10, 20, 50] as const;
  static readonly PER_HALAMAN_BAWAAN = 20;

  private readonly skema = z
    .object({
      cari: z.string().trim().max(PANJANG.KATA_KUNCI, 'ERR-VAL-10').optional(),
      jenis: z.enum(MonitoringValidator.JENIS, { errorMap: () => ({ message: 'ERR-VAL-01' }) }).optional(),
      dari: z
        .string()
        .refine((v) => Tanggal.isValid(v), 'ERR-VAL-01')
        .optional(),
      sampai: z
        .string()
        .refine((v) => Tanggal.isValid(v), 'ERR-VAL-01')
        .optional(),
      halaman: z.coerce.number({ invalid_type_error: 'ERR-VAL-01' }).int('ERR-VAL-01').min(1, 'ERR-VAL-01').optional(),
      per_halaman: z.coerce
        .number({ invalid_type_error: 'ERR-VAL-01' })
        .refine((v) => (MonitoringValidator.PILIHAN_PER_HALAMAN as readonly number[]).includes(v), 'ERR-VAL-01')
        .optional(),
    })
    .superRefine((v, ctx) => {
      if (v.dari && v.sampai && v.dari > v.sampai)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sampai'], message: 'ERR-VAL-14' });
    });

  validasi(query: Record<string, unknown>): FilterLog {
    // Isian kosong di query string dianggap tidak diisi
    const bersih = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v !== undefined));
    const q = this.jalankan(this.skema, bersih);
    return {
      cari: q.cari || null,
      jenis: q.jenis ?? null,
      dari: q.dari ?? null,
      sampai: q.sampai ?? null,
      halaman: q.halaman ?? 1,
      perHalaman: q.per_halaman ?? MonitoringValidator.PER_HALAMAN_BAWAAN,
    };
  }
}
