import { AppError } from '../../core/errors/AppError';
import { ValidationError } from '../../core/errors/ValidationError';
import { Kueri } from '../../core/Kueri';
import { IdentitasInput } from './Sasaran';
import { KartuKeluargaRepository } from './KartuKeluargaRepository';

/**
 * Aturan kartu keluarga saat menambah atau mengubah data sasaran (FSD-2.6, 2.12, 2.19).
 * - Warga wajib terdaftar di kartu_keluarga (FK warga.no_kk). Bila KK belum ada, isian alamat wajib
 *   lengkap (ERR-VAL-01) lalu KK baru dibuat.
 * - Satu KK hanya boleh punya satu Kepala Keluarga (uq_warga_kepala_kk) -> ERR-VAL-13.
 * Dipisah dari SasaranService agar setiap kelas memegang satu kelompok aturan.
 */
export class KartuKeluargaService {
  private static readonly ISIAN_ALAMAT = ['alamat', 'dusun', 'rt', 'rw', 'desa', 'kecamatan'] as const;

  /** Mengembalikan true bila KK baru dibuat. Dijalankan di dalam transaksi pemanggil (k). */
  async siapkan(k: Kueri, input: Partial<IdentitasInput>, kecualiWargaId?: string): Promise<boolean> {
    const kk = new KartuKeluargaRepository(k);
    const noKk = input.no_kk as string;
    let baru = false;
    if (!(await kk.ada(noKk))) {
      const kosong = KartuKeluargaService.ISIAN_ALAMAT.filter((f) => !input[f]).map((f) => AppError.buatDetail('ERR-VAL-01', f));
      if (kosong.length > 0) throw new ValidationError(kosong);
      await kk.buat(noKk, {
        alamat: input.alamat!,
        dusun: input.dusun!,
        rt: input.rt!,
        rw: input.rw!,
        desa: input.desa!,
        kecamatan: input.kecamatan!,
      });
      baru = true;
    }
    if (input.hubungan_keluarga === 'Kepala Keluarga' && (await kk.adaKepalaLain(noKk, kecualiWargaId))) {
      throw new ValidationError('ERR-VAL-13', 'hubungan_keluarga');
    }
    return baru;
  }
}
