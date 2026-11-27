import { z } from 'zod';
import { Tanggal } from '../../core/Tanggal';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { JadwalInput, JENIS_KEGIATAN } from './JadwalKegiatan';
import { PANJANG } from '../../core/BatasIsian';

/** Validasi form jadwal kegiatan. Jam berformat HH:MM (24 jam); jam selesai harus setelah jam mulai. */
export class JadwalValidator extends ValidatorDasar {
  private static readonly WAJIB = [
    'nama_kegiatan',
    'jenis_kegiatan',
    'tanggal_pelaksanaan',
    'jam_mulai',
    'jam_selesai',
    'lokasi',
  ];

  private jam() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ERR-VAL-01');
  }

  private tanggal() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .refine((v) => Tanggal.isValid(v), 'ERR-VAL-01');
  }

  private readonly bentuk = {
    nama_kegiatan: this.teksWajib(PANJANG.JADWAL_NAMA_LOKASI),
    jenis_kegiatan: this.pilihan([...JENIS_KEGIATAN] as [string, ...string[]]),
    tanggal_pelaksanaan: this.tanggal(),
    jam_mulai: this.jam(),
    jam_selesai: this.jam(),
    lokasi: this.teksWajib(PANJANG.JADWAL_NAMA_LOKASI),
    keterangan: this.teksOpsional(PANJANG.KETERANGAN_PANJANG),
  };

  private static urutanJam(v: { jam_mulai?: string; jam_selesai?: string }, ctx: z.RefinementCtx): void {
    if (v.jam_mulai && v.jam_selesai && v.jam_selesai <= v.jam_mulai) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jam_selesai'], message: 'ERR-VAL-14' });
    }
  }

  validasiTambah(body: unknown): JadwalInput {
    return this.jalankan(z.object(this.bentuk).superRefine(JadwalValidator.urutanJam), body) as JadwalInput;
  }

  /** Ubah: semua isian opsional, tetapi isian wajib tidak boleh dikosongkan. */
  validasiUbah(body: unknown): Partial<JadwalInput> {
    const skema = z.object(this.bentuk).partial().superRefine(JadwalValidator.urutanJam);
    return this.jalankan(skema, body, true, JadwalValidator.WAJIB) as Partial<JadwalInput>;
  }
}
