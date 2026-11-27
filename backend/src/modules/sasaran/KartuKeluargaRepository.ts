import { Kueri } from '../../core/Kueri';
import { DataAlamat } from './Alamat';

/** Akses dbo.kartu_keluarga yang dibutuhkan saat registrasi sasaran. */
export class KartuKeluargaRepository {
  constructor(private readonly k: Kueri) {}

  async ada(noKk: string): Promise<boolean> {
    return (await this.k.satu('SELECT 1 AS ada FROM dbo.kartu_keluarga WHERE no_kk = @noKk', { noKk })) !== null;
  }

  /** KK baru hanya berisi alamat; indikator desil/sanitasi diisi lewat modul SMBD. */
  async buat(noKk: string, a: DataAlamat): Promise<void> {
    await this.k.jalankan(
      `INSERT INTO dbo.kartu_keluarga (no_kk, alamat, dusun, rt, rw, desa, kecamatan)
       VALUES (@noKk, @alamat, @dusun, @rt, @rw, @desa, @kecamatan)`,
      { noKk, ...a },
    );
  }

  /** Satu KK hanya punya satu Kepala Keluarga (uq_warga_kepala_kk). */
  async adaKepalaLain(noKk: string, kecualiWargaId?: string): Promise<boolean> {
    const b = await this.k.satu(
      `SELECT 1 AS ada FROM dbo.warga WHERE no_kk = @noKk AND hubungan_keluarga = 'Kepala Keluarga'
          AND (@kecuali IS NULL OR warga_id <> @kecuali)`,
      { noKk, kecuali: kecualiWargaId ?? null },
    );
    return b !== null;
  }
}
