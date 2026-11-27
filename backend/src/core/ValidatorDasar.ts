import { z } from 'zod';
import { AppError } from './errors/AppError';
import { ErrorDetail, isErrorCode } from './errors/ErrorCatalog';
import { ValidationError } from './errors/ValidationError';
import { Tanggal } from './Tanggal';
import { PANJANG, NILAI_MAKS } from './BatasIsian';

/**
 * Kelas dasar semua validator input (FSD 4.2 Field Validation Matrix).
 * Pesan pada zod diisi KODE error; pesan untuk pengguna diambil dari katalog FSD 6.1.
 *
 * [PEWARISAN] BalitaValidator, IbuValidator, LansiaValidator, dan validator pemeriksaan mewarisi kelas ini.
 * [ENKAPSULASI] Pembuat aturan (teksWajib, angkaPositif, ...) bersifat protected: hanya dipakai subclass.
 */
export abstract class ValidatorDasar {
  /**
   * Menjalankan skema. Semua isian yang salah dilaporkan sekaligus, satu error per isian (NFR-005).
   * isianWajib: isian yang tidak boleh dikirim kosong/null saat ubah data (modeUbah).
   */
  protected jalankan<T>(skema: z.ZodType<T>, body: unknown, modeUbah = false, isianWajib: readonly string[] = []): T {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('ERR-VAL-01');
    const perIsian = new Map<string, ErrorDetail>();

    if (modeUbah) {
      const data = body as Record<string, unknown>;
      for (const isian of isianWajib) {
        const nilai = data[isian];
        if (isian in data && (nilai === null || (typeof nilai === 'string' && nilai.trim() === ''))) {
          perIsian.set(isian, AppError.buatDetail('ERR-VAL-01', isian));
        }
      }
    }

    const hasil = skema.safeParse(body);
    if (!hasil.success) {
      for (const issue of hasil.error.issues) {
        const isian = issue.path.join('.') || '(body)';
        if (perIsian.has(isian)) continue;
        const kode = isErrorCode(issue.message) ? issue.message : 'ERR-VAL-01';
        perIsian.set(isian, AppError.buatDetail(kode, isian));
      }
    }
    if (perIsian.size > 0) throw new ValidationError([...perIsian.values()]);
    return hasil.data as T;
  }

  protected teksWajib(maks: number = PANJANG.NAMA) {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .min(1, 'ERR-VAL-01')
      .max(maks, 'ERR-VAL-10');
  }

  /** Teks opsional; kosong dianggap null. */
  protected teksOpsional(maks: number = PANJANG.NAMA) {
    return z.preprocess(
      (v) => (v === '' || v === null ? null : typeof v === 'string' ? v.trim() : v),
      z.string({ invalid_type_error: 'ERR-VAL-01' }).max(maks, 'ERR-VAL-10').nullable().optional(),
    );
  }

  /** No. KK: 16 digit angka (ERR-VAL-12). */
  protected noKk() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .min(1, 'ERR-VAL-01')
      .regex(/^\d{16}$/, 'ERR-VAL-12');
  }

  protected nik() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .min(1, 'ERR-VAL-01')
      .regex(/^\d{16}$/, 'ERR-VAL-04');
  }

  /** Angka wajib > 0. Kosong -> ERR-VAL-01; bukan angka atau <= 0 -> ERR-VAL-02. */
  protected angkaPositif(maks: number = NILAI_MAKS.UKURAN_UMUM) {
    return z.preprocess(
      (v) => (v === '' || v === null ? undefined : typeof v === 'string' ? Number(v) : v),
      z.number({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-02' }).positive('ERR-VAL-02').max(maks, 'ERR-VAL-02'),
    );
  }

  /** Angka > 0 yang boleh kosong (mis. Hb, BR-16). */
  protected angkaPositifOpsional(maks: number = NILAI_MAKS.UKURAN_UMUM) {
    return z.preprocess(
      (v) => (v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v),
      z.number({ invalid_type_error: 'ERR-VAL-02' }).positive('ERR-VAL-02').max(maks, 'ERR-VAL-02').nullable().optional(),
    );
  }

  /** Angka 0 atau lebih yang boleh kosong (mis. bungkus per tahun). */
  protected angkaNolAtauLebihOpsional(maks: number = NILAI_MAKS.DESIMAL_SATU) {
    return z.preprocess(
      (v) => (v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v),
      z.number({ invalid_type_error: 'ERR-VAL-02' }).min(0, 'ERR-VAL-02').max(maks, 'ERR-VAL-02').nullable().optional(),
    );
  }

  /** Bilangan bulat wajib > 0 (mis. tekanan darah mmHg). */
  protected bulatPositif(maks: number = NILAI_MAKS.BULAT_UMUM) {
    return z.preprocess(
      (v) => (v === '' || v === null ? undefined : typeof v === 'string' ? Number(v) : v),
      z
        .number({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-02' })
        .int('ERR-VAL-02')
        .positive('ERR-VAL-02')
        .max(maks, 'ERR-VAL-02'),
    );
  }

  /** Bilangan bulat > 0 yang boleh kosong (mis. kehamilan ke-, jumlah TTD). */
  protected bulatPositifOpsional(maks: number = NILAI_MAKS.BULAT_UMUM) {
    return z.preprocess(
      (v) => (v === '' || v === null ? null : typeof v === 'string' ? Number(v) : v),
      z
        .number({ invalid_type_error: 'ERR-VAL-02' })
        .int('ERR-VAL-02')
        .positive('ERR-VAL-02')
        .max(maks, 'ERR-VAL-02')
        .nullable()
        .optional(),
    );
  }

  /** Tanggal wajib, format YYYY-MM-DD, tidak melebihi hari ini (ERR-VAL-03). */
  protected tanggalLalu() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .trim()
      .superRefine((v, ctx) => {
        if (!Tanggal.isValid(v)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ERR-VAL-01' });
        else if (v > Tanggal.hariIni()) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ERR-VAL-03' });
      });
  }

  /** Kontak opsional: selain angka -> ERR-VAL-09; lebih dari 15 digit -> ERR-VAL-10. */
  protected kontak() {
    return z.preprocess(
      (v) => (v === '' || v === null ? null : v),
      z
        .string({ invalid_type_error: 'ERR-VAL-09' })
        .trim()
        .superRefine((v, ctx) => {
          if (!/^\d+$/.test(v)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ERR-VAL-09' });
          else if (v.length > PANJANG.KONTAK) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ERR-VAL-10' });
          }
        })
        .nullable()
        .optional(),
    );
  }

  protected pilihan<T extends [string, ...string[]]>(nilai: T) {
    return z.enum(nilai, { errorMap: () => ({ message: 'ERR-VAL-01' }) });
  }

  protected pilihanOpsional<T extends [string, ...string[]]>(nilai: T) {
    return z.preprocess((v) => (v === '' ? null : v), this.pilihan(nilai).nullable().optional());
  }

  /** Ya/Tidak wajib. */
  protected yaTidak() {
    return z.boolean({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' });
  }

  protected yaTidakOpsional() {
    return z.boolean({ invalid_type_error: 'ERR-VAL-01' }).nullable().optional();
  }
}
