import { z } from 'zod';
import { ValidationError } from '../../core/errors/ValidationError';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { HUBUNGAN_KELUARGA, IdentitasInput } from './Sasaran';
import { PANJANG } from '../../core/BatasIsian';

/**
 * Validator data identitas (FSD-2.6, 2.12, 2.19; BR-08, BR-09).
 * Identitas mengikuti tabel warga; alamat (alamat, dusun, rt, rw, desa, kecamatan) hanya
 * wajib bila no_kk belum terdaftar, dan itu diperiksa di SasaranService.
 *
 * [PEWARISAN] ValidatorDasar -> SasaranValidator -> BalitaValidator / IbuValidator / LansiaValidator.
 * [POLIMORFISME] Subclass mengisi isianKhusus() dan isianWajibKhusus; validasiTambah/validasiUbah dipakai bersama.
 */
export abstract class SasaranValidator<I extends IdentitasInput> extends ValidatorDasar {
  private static readonly ISIAN_WAJIB_BERSAMA = ['no_kk', 'nik', 'nama', 'tanggal_lahir', 'hubungan_keluarga'];

  private skemaTambahCache: z.ZodObject<z.ZodRawShape> | null = null;

  /** Isian tambahan khusus kelompok sasaran. */
  protected abstract isianKhusus(): z.ZodRawShape;
  /** Isian khusus yang wajib (tidak boleh dikosongkan saat ubah). */
  protected abstract readonly isianWajibKhusus: readonly string[];

  validasiTambah(body: unknown): I {
    return this.jalankan(this.skemaTambah(), body) as unknown as I;
  }

  validasiUbah(body: unknown): Partial<I> {
    const wajib = [...SasaranValidator.ISIAN_WAJIB_BERSAMA, ...this.isianWajibKhusus];
    const hasil = this.jalankan(this.skemaTambah().partial(), body, true, wajib) as Partial<I>;
    if (Object.keys(hasil).length === 0) throw new ValidationError('ERR-VAL-01');
    return hasil;
  }

  private skemaTambah(): z.ZodObject<z.ZodRawShape> {
    if (!this.skemaTambahCache) {
      this.skemaTambahCache = z.object({
        no_kk: this.noKk(),
        nik: this.nik(),
        nama: this.teksWajib(),
        tanggal_lahir: this.tanggalLalu(),
        hubungan_keluarga: this.pilihan([...HUBUNGAN_KELUARGA]),
        pekerjaan: this.teksOpsional(),
        kontak: this.kontak(),
        // alamat KK: dipakai hanya bila no_kk baru
        alamat: this.teksOpsional(PANJANG.ALAMAT),
        dusun: this.teksOpsional(PANJANG.WILAYAH),
        rt: this.teksOpsional(PANJANG.RT_RW),
        rw: this.teksOpsional(PANJANG.RT_RW),
        desa: this.teksOpsional(PANJANG.WILAYAH),
        kecamatan: this.teksOpsional(PANJANG.WILAYAH),
        ...this.isianKhusus(),
      });
    }
    return this.skemaTambahCache;
  }
}
