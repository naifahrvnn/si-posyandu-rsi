import { Baris, Kueri } from '../../core/Kueri';
import { Peran } from '../../keamanan/Pengguna';
import { Akun, StatusAkun } from './Akun';

/** Kader (petugas di tabel kader) yang belum punya akun: pilihan "kader terdaftar" saat Tambah Akun. */
export interface KaderTanpaAkun {
  petugas_id: string;
  nama: string;
  jenis_kelamin: string;
  jabatan_kader: string;
}

/** Data petugas baru yang dibuat bersama akunnya. */
export interface PetugasBaru {
  nama: string;
  jenisKelamin: string;
  jabatanKader: string;
}

/**
 * Akses tabel pengguna, petugas, kader, dan sesi untuk Ganti Password (FSD-2.3) dan Kelola Akun (FSD-2.4).
 * Hanya akun petugas yang terdaftar di tabel kader yang dikelola, sama dengan aturan login.
 *
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar (pool atau transaksi).
 * [ASINKRON] Semua method async.
 */
export class AkunRepository {
  private static readonly KOLOM = `
    u.user_id, u.user_name, u.peran, u.status_akun, u.last_login, u.created_at, u.update_at,
    p.petugas_id, p.nama, kd.jabatan_kader`;
  private static readonly SUMBER = `
    dbo.pengguna u
    JOIN dbo.petugas p ON p.petugas_id = u.petugas_id
    JOIN dbo.kader kd ON kd.petugas_id = p.petugas_id`;

  constructor(private readonly k: Kueri) {}

  /** SCR-18 tabel daftar akun: aktif dulu, lalu urut nama. */
  async daftar(): Promise<Akun[]> {
    const baris = await this.k.pilih(
      `SELECT ${AkunRepository.KOLOM} FROM ${AkunRepository.SUMBER}
        WHERE u.peran IN ('User (Kader)', 'Super User')
        ORDER BY CASE u.status_akun WHEN 'Aktif' THEN 0 ELSE 1 END, p.nama`,
    );
    return baris.map(AkunRepository.keAkun);
  }

  /** kunci=true: baris dikunci sampai transaksi selesai (cegah dua Super User mengubah bersamaan). */
  async cariById(userId: string, kunci = false): Promise<Akun | null> {
    const b = await this.k.satu(
      `SELECT ${AkunRepository.KOLOM} FROM ${AkunRepository.SUMBER.replace('dbo.pengguna u', `dbo.pengguna u${kunci ? ' WITH (UPDLOCK, ROWLOCK)' : ''}`)}
        WHERE u.user_id = @id AND u.peran IN ('User (Kader)', 'Super User')`,
      { id: userId },
    );
    return b ? AkunRepository.keAkun(b) : null;
  }

  /** BR-06: username/NIK unik (tidak peka huruf besar/kecil, mengikuti collation basis data). */
  async usernameDipakai(username: string, kecualiUserId?: string): Promise<boolean> {
    const b = await this.k.satu(
      `SELECT 1 AS ada FROM dbo.pengguna WHERE user_name = @u AND (@kecuali IS NULL OR user_id <> @kecuali)`,
      { u: username, kecuali: kecualiUserId ?? null },
    );
    return b !== null;
  }

  async daftarKaderTanpaAkun(): Promise<KaderTanpaAkun[]> {
    const baris = await this.k.pilih(
      `SELECT p.petugas_id, p.nama, p.jenis_kelamin, kd.jabatan_kader
         FROM dbo.kader kd JOIN dbo.petugas p ON p.petugas_id = kd.petugas_id
        WHERE p.status_aktif = 1
          AND NOT EXISTS (SELECT 1 FROM dbo.pengguna u WHERE u.petugas_id = p.petugas_id)
        ORDER BY p.nama`,
    );
    return baris.map((b) => ({
      petugas_id: String(b.petugas_id),
      nama: String(b.nama),
      jenis_kelamin: String(b.jenis_kelamin),
      jabatan_kader: String(b.jabatan_kader),
    }));
  }

  /** Nama kader bila petugas ini kader aktif yang belum punya akun; selain itu null. */
  async namaKaderTanpaAkun(petugasId: string): Promise<string | null> {
    const b = await this.k.satu(
      `SELECT p.nama FROM dbo.kader kd JOIN dbo.petugas p WITH (UPDLOCK, ROWLOCK) ON p.petugas_id = kd.petugas_id
        WHERE p.petugas_id = @id AND p.status_aktif = 1
          AND NOT EXISTS (SELECT 1 FROM dbo.pengguna u WHERE u.petugas_id = p.petugas_id)`,
      { id: petugasId },
    );
    return b ? String(b.nama) : null;
  }

  /** Petugas baru + baris kader (specialization disjoint, trg_kader_disjoint). Mengembalikan petugas_id. */
  async buatPetugasKader(data: PetugasBaru): Promise<string> {
    const b = await this.k.satu(
      `DECLARE @id UNIQUEIDENTIFIER = NEWID();
       INSERT INTO dbo.petugas (petugas_id, nama, jenis_kelamin) VALUES (@id, @nama, @jk);
       INSERT INTO dbo.kader (petugas_id, jabatan_kader) VALUES (@id, @jabatan);
       SELECT @id AS petugas_id;`,
      { nama: data.nama, jk: data.jenisKelamin, jabatan: data.jabatanKader },
    );
    return String(b?.petugas_id);
  }

  /** Akun baru selalu berstatus Aktif (FSD-2.4 Main Flow Step 4). Mengembalikan user_id. */
  async buat(data: { username: string; passwordHash: string; peran: Peran; petugasId: string }): Promise<string> {
    const b = await this.k.satu(
      `DECLARE @id UNIQUEIDENTIFIER = NEWID();
       INSERT INTO dbo.pengguna (user_id, user_name, password_hash, peran, status_akun, petugas_id)
       VALUES (@id, @u, @hash, @peran, 'Aktif', @petugas);
       SELECT @id AS user_id;`,
      { u: data.username, hash: data.passwordHash, peran: data.peran, petugas: data.petugasId },
    );
    return String(b?.user_id);
  }

  /** AF-1: username dan peran di tabel pengguna, nama di tabel petugas. */
  async perbarui(akun: Akun): Promise<void> {
    await this.k.jalankan(
      `UPDATE dbo.pengguna SET user_name = @u, peran = @peran, update_at = SYSDATETIME() WHERE user_id = @id;
       UPDATE dbo.petugas SET nama = @nama WHERE petugas_id = @petugas;`,
      { id: akun.id, u: akun.username, peran: akun.peran, nama: akun.nama, petugas: akun.petugasId },
    );
  }

  /** AF-2: ubah status. Akun yang dinonaktifkan langsung kehilangan semua sesinya (BR-06: tidak dapat login). */
  async perbaruiStatus(userId: string, status: StatusAkun): Promise<void> {
    await this.k.jalankan(
      `UPDATE dbo.pengguna SET status_akun = @status, update_at = SYSDATETIME() WHERE user_id = @id;
       IF @status = 'Nonaktif' DELETE FROM dbo.sesi WHERE user_id = @id;`,
      { id: userId, status },
    );
  }

  /** FSD-2.3 Step 4: simpan hash password baru. */
  async perbaruiPassword(userId: string, passwordHash: string): Promise<void> {
    await this.k.jalankan(`UPDATE dbo.pengguna SET password_hash = @hash, update_at = SYSDATETIME() WHERE user_id = @id`, {
      id: userId,
      hash: passwordHash,
    });
  }

  private static keAkun(b: Baris): Akun {
    const teksAtauNull = (v: unknown) => (v === null || v === undefined ? null : String(v));
    return Akun.pulihkan({
      userId: String(b.user_id),
      petugasId: String(b.petugas_id),
      nama: String(b.nama),
      username: String(b.user_name),
      peran: b.peran as Peran,
      status: b.status_akun as StatusAkun,
      jabatanKader: teksAtauNull(b.jabatan_kader),
      lastLogin: teksAtauNull(b.last_login),
      dibuatPada: teksAtauNull(b.created_at),
      diubahPada: teksAtauNull(b.update_at),
    });
  }
}
