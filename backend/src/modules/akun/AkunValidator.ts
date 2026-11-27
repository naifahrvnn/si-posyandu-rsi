import { z } from 'zod';
import { ValidatorDasar } from '../../core/ValidatorDasar';
import { Password } from '../../keamanan/Password';
import { Peran } from '../../keamanan/Pengguna';
import { PERAN_AKUN, STATUS_AKUN, StatusAkun } from './Akun';
import { PANJANG } from '../../core/BatasIsian';

/** Sumber data petugas saat Tambah Akun. */
export type SumberAkun = 'kader_terdaftar' | 'petugas_baru';

interface IsianAkunDasar {
  username: string;
  password_awal: string;
  peran?: Peran | null;
}
export interface TambahAkunDariKader extends IsianAkunDasar {
  sumber: 'kader_terdaftar';
  petugas_id: string;
}
export interface TambahAkunPetugasBaru extends IsianAkunDasar {
  sumber: 'petugas_baru';
  nama: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  jabatan_kader: string;
}
export type TambahAkunInput = TambahAkunDariKader | TambahAkunPetugasBaru;

export interface UbahAkunInput {
  nama?: string;
  username?: string;
  peran?: Peran;
}

/**
 * Validasi SCR-17 (Ganti Password) dan SCR-18 (Kelola Akun).
 * - Username/NIK: wajib, maks 50 karakter (kolom pengguna.user_name VARCHAR(50)).
 * - Nama: wajib, maks 100 karakter (kolom petugas.nama).
 * - Password: wajib, minimal 8 karakter (ERR-VAL-07). Password tidak di-trim.
 *
 * [PEWARISAN] Mewarisi aturan dasar dari ValidatorDasar.
 */
export class AkunValidator extends ValidatorDasar {
  private password() {
    return z
      .string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' })
      .min(1, 'ERR-VAL-01')
      .min(Password.PANJANG_MIN, 'ERR-VAL-07')
      .refine((v) => Buffer.byteLength(v, 'utf8') <= Password.PANJANG_MAKS, 'ERR-VAL-10');
  }

  private readonly username = this.teksWajib(PANJANG.USERNAME);
  private readonly peran = this.pilihan([...PERAN_AKUN] as [string, ...string[]]);

  private readonly skemaTambah = z.discriminatedUnion(
    'sumber',
    [
      z.object({
        sumber: z.literal('kader_terdaftar'),
        petugas_id: z.string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' }).uuid('ERR-VAL-01'),
        username: this.username,
        password_awal: this.password(),
        peran: this.peran.nullable().optional(),
      }),
      z.object({
        sumber: z.literal('petugas_baru'),
        nama: this.teksWajib(),
        jenis_kelamin: this.pilihan(['Laki-laki', 'Perempuan']),
        jabatan_kader: this.teksWajib(PANJANG.JABATAN_KADER),
        username: this.username,
        password_awal: this.password(),
        peran: this.peran.nullable().optional(),
      }),
    ],
    { errorMap: () => ({ message: 'ERR-VAL-01' }) },
  );

  /** FSD-2.3: password_baru wajib, minimal 8 karakter. */
  validasiGantiPassword(body: unknown): { password_baru: string } {
    return this.jalankan(z.object({ password_baru: this.password() }), body);
  }

  /** FSD-2.4 Main Flow: sumber menentukan isian yang wajib. */
  validasiTambah(body: unknown): TambahAkunInput {
    return this.jalankan(this.skemaTambah, body) as TambahAkunInput;
  }

  /** FSD-2.4 AF-1: semua isian opsional, tetapi tidak boleh dikosongkan. */
  validasiUbah(body: unknown): UbahAkunInput {
    const skema = z.object({ nama: this.teksWajib(), username: this.username, peran: this.peran }).partial();
    return this.jalankan(skema, body, true, ['nama', 'username', 'peran']) as UbahAkunInput;
  }

  /** FSD-2.4 AF-2: status_akun Aktif atau Nonaktif. */
  validasiStatus(body: unknown): { status_akun: StatusAkun } {
    const skema = z.object({ status_akun: this.pilihan([...STATUS_AKUN] as [string, ...string[]]) });
    return this.jalankan(skema, body) as { status_akun: StatusAkun };
  }
}
