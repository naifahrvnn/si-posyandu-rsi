import { Baris, Kueri, Parameter } from '../../core/Kueri';
import { ValidationError } from '../../core/errors/ValidationError';
import { DataIdentitas, HubunganKeluarga, Sasaran } from './Sasaran';
import { Tanggal } from '../../core/Tanggal';

/**
 * Akses data sasaran di basis data SMBD (EER Option 8A):
 * identitas di dbo.warga (superclass), alamat di dbo.kartu_keluarga, atribut khusus di
 * dbo.balita / dbo.ibu / dbo.lansia (subclass, PK = warga_id).
 * Nama tabel/kolom berasal dari konstanta kelas, bukan dari input pengguna; semua nilai lewat parameter @nama.
 * Log aktivitas ditulis service lewat PencatatAudit, dalam transaksi yang sama.
 *
 * [ABSTRAKSI + PEWARISAN] BalitaRepository, IbuRepository, LansiaRepository extends SasaranRepository.
 * [ENKAPSULASI] Struktur tabel warga/KK dan nomor error SQL Server disembunyikan di sini.
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar (pool atau transaksi).
 */
export abstract class SasaranRepository<T extends Sasaran> {
  private static readonly ERROR_DUPLIKAT = [2627, 2601];

  constructor(protected readonly k: Kueri) {}

  /** Tabel subclass: 'balita' | 'ibu' | 'lansia'. */
  protected abstract readonly tabel: string;
  /** Kolom khusus subclass; nama parameter = nama kolom. */
  protected abstract readonly kolomKhusus: readonly string[];
  protected abstract nilaiKhusus(entitas: T): Parameter;
  protected abstract keEntitas(identitas: DataIdentitas, baris: Baris): T;

  async cariById(id: string, kunci = false): Promise<T | null> {
    const kunciSql = kunci ? ' WITH (UPDLOCK, ROWLOCK)' : '';
    const baris = await this.k.satu(
      `SELECT w.warga_id, w.no_kk, w.nik, w.nama, w.tanggal_lahir, w.jenis_kelamin, w.hubungan_keluarga,
              w.pekerjaan, w.kontak, kk.alamat, kk.dusun, kk.rt, kk.rw, kk.desa, kk.kecamatan,
              ${this.kolomKhusus.map((c) => `s.${c}`).join(', ')}, s.created_at, s.update_at
         FROM dbo.${this.tabel} s${kunciSql}
         JOIN dbo.warga w ON w.warga_id = s.warga_id
         JOIN dbo.kartu_keluarga kk ON kk.no_kk = w.no_kk
        WHERE s.warga_id = @id`,
      { id },
    );
    return baris ? this.keEntitas(SasaranRepository.identitasDari(baris), baris) : null;
  }

  /** BR-08: NIK unik di seluruh warga. */
  async nikSudahAda(nik: string, kecualiId?: string): Promise<boolean> {
    const baris = await this.k.satu(
      `SELECT TOP 1 1 AS ada FROM dbo.warga WITH (UPDLOCK, HOLDLOCK)
        WHERE nik = @nik AND (@kecuali IS NULL OR warga_id <> @kecuali)`,
      { nik, kecuali: kecualiId ?? null },
    );
    return baris !== null;
  }

  /** Superclass WARGA lalu subclass, dalam transaksi yang sama. */
  async simpanBaru(s: T): Promise<void> {
    await this.tulis(
      `INSERT INTO dbo.warga (warga_id, no_kk, nik, nama, tanggal_lahir, jenis_kelamin, hubungan_keluarga, pekerjaan, kontak)
       VALUES (@warga_id, @no_kk, @nik, @nama, @tanggal_lahir, @jenis_kelamin, @hubungan_keluarga, @pekerjaan, @kontak)`,
      this.parameterWarga(s),
    );
    const kolom = ['warga_id', ...this.kolomKhusus];
    await this.tulis(`INSERT INTO dbo.${this.tabel} (${kolom.join(', ')}) VALUES (${kolom.map((c) => `@${c}`).join(', ')})`, {
      warga_id: s.id,
      ...this.nilaiKhusus(s),
    });
  }

  async perbarui(s: T): Promise<void> {
    await this.tulis(
      `UPDATE dbo.warga SET no_kk = @no_kk, nik = @nik, nama = @nama, tanggal_lahir = @tanggal_lahir,
         jenis_kelamin = @jenis_kelamin, hubungan_keluarga = @hubungan_keluarga, pekerjaan = @pekerjaan, kontak = @kontak
       WHERE warga_id = @warga_id`,
      this.parameterWarga(s),
    );
    // SQL Server tidak punya ON UPDATE CURRENT_TIMESTAMP, jadi update_at diisi di sini
    await this.tulis(
      `UPDATE dbo.${this.tabel} SET ${this.kolomKhusus.map((c) => `${c} = @${c}`).join(', ')}, update_at = SYSDATETIME()
        WHERE warga_id = @warga_id`,
      { warga_id: s.id, ...this.nilaiKhusus(s) },
    );
  }

  /**
   * Hapus WARGA; trigger trg_warga_hapus menghapus subclass, akun warga, dan partisipasi kegiatan.
   * Riwayat pemeriksaan, layanan, isian pendukung, dan rujukan ikut terhapus lewat ON DELETE CASCADE (BR-40).
   */
  async hapus(id: string): Promise<void> {
    await this.k.jalankan('DELETE FROM dbo.warga WHERE warga_id = @id', { id });
  }

  private parameterWarga(s: T): Parameter {
    return {
      warga_id: s.id,
      no_kk: s.noKk,
      nik: s.nik,
      nama: s.nama,
      tanggal_lahir: s.tanggalLahir,
      jenis_kelamin: s.jenisKelamin,
      hubungan_keluarga: s.hubunganKeluarga,
      pekerjaan: s.pekerjaan,
      kontak: s.kontak,
    };
  }

  private async tulis(teks: string, parameter: Parameter): Promise<void> {
    try {
      await this.k.jalankan(teks, parameter);
    } catch (err) {
      const e = err as { number?: number; message?: string };
      if (e.number !== undefined && SasaranRepository.ERROR_DUPLIKAT.includes(e.number) && e.message?.includes('uq_warga_nik')) {
        throw new ValidationError('ERR-VAL-05', 'nik');
      }
      throw err;
    }
  }

  private static identitasDari(b: Baris): DataIdentitas {
    return {
      id: String(b.warga_id),
      noKk: String(b.no_kk),
      nik: String(b.nik),
      nama: String(b.nama),
      tanggalLahir: Tanggal.dariDb(b.tanggal_lahir),
      hubunganKeluarga: b.hubungan_keluarga as HubunganKeluarga,
      pekerjaan: (b.pekerjaan as string | null) ?? null,
      kontak: (b.kontak as string | null) ?? null,
      alamat: {
        alamat: String(b.alamat),
        dusun: String(b.dusun),
        rt: String(b.rt),
        rw: String(b.rw),
        desa: String(b.desa),
        kecamatan: String(b.kecamatan),
      },
      dibuatPada: (b.created_at as string | null) ?? null,
      diubahPada: (b.update_at as string | null) ?? null,
    };
  }
}
