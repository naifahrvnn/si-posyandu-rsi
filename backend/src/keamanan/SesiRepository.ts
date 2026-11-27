import { Kueri } from '../core/Kueri';
import { PabrikPengguna } from './PabrikPengguna';
import { Peran, Pengguna } from './Pengguna';

/** Akun yang ditemukan saat login. */
export interface AkunLogin {
  pengguna: Pengguna;
  namaPengguna: string;
  passwordHash: string;
  aktif: boolean;
}

/**
 * Akses tabel sesi dan pengguna untuk login (FSD-2.1), pemeriksaan sesi tiap request (BR-35), dan logout (FSD-2.2).
 * Hanya Koordinator (Super User) dan Kader (User) yang terdaftar di tabel kader; Warga dan tenaga kesehatan (Bidan) tidak bisa login.
 * [AGREGASI] Menyimpan objek Kueri yang dibuat di luar.
 */
export class SesiRepository {
  constructor(private readonly k: Kueri) {}

  /** Pengguna bila sesi ada, belum kedaluwarsa (login + 8 jam), dan akun Aktif (BR-06, BR-35). */
  async cariPenggunaAktif(idSesi: string): Promise<Pengguna | null> {
    const b = await this.k.satu(
      `SELECT u.user_id, u.peran, u.petugas_id
         FROM dbo.sesi s
         JOIN dbo.pengguna u ON u.user_id = s.user_id
         JOIN dbo.petugas p ON p.petugas_id = u.petugas_id
        WHERE s.id_sesi = @idSesi AND u.status_akun = 'Aktif' AND p.status_aktif = 1
          AND u.peran IN ('User (Kader)', 'Super User') AND s.kedaluwarsa_pada > SYSDATETIME()
          AND EXISTS (SELECT 1 FROM dbo.kader kd WHERE kd.petugas_id = p.petugas_id)`,
      { idSesi },
    );
    return b ? PabrikPengguna.dari(String(b.user_id), b.peran as Peran, String(b.petugas_id)) : null;
  }

  async cariAkun(username: string): Promise<AkunLogin | null> {
    const b = await this.k.satu(
      `SELECT u.user_id, u.peran, u.petugas_id, u.password_hash, u.status_akun, p.nama, p.status_aktif
         FROM dbo.pengguna u
         JOIN dbo.petugas p ON p.petugas_id = u.petugas_id
        WHERE u.user_name = @u AND u.peran IN ('User (Kader)', 'Super User')
          AND EXISTS (SELECT 1 FROM dbo.kader kd WHERE kd.petugas_id = p.petugas_id)`,
      { u: username },
    );
    if (!b) return null;
    return {
      pengguna: PabrikPengguna.dari(String(b.user_id), b.peran as Peran, String(b.petugas_id)),
      namaPengguna: String(b.nama),
      passwordHash: String(b.password_hash),
      aktif: b.status_akun === 'Aktif' && Boolean(b.status_aktif),
    };
  }

  /** Sesi berlaku sejumlah jam sejak dibuat; mengembalikan waktu kedaluwarsa. */
  async buatSesi(idSesi: string, userId: string, jam: number): Promise<string> {
    const b = await this.k.satu(
      `DECLARE @exp DATETIME2(0) = DATEADD(HOUR, @jam, SYSDATETIME());
       INSERT INTO dbo.sesi (id_sesi, user_id, kedaluwarsa_pada) VALUES (@id, @uid, @exp);
       UPDATE dbo.pengguna SET last_login = SYSDATETIME() WHERE user_id = @uid;
       SELECT @exp AS kedaluwarsa_pada;`,
      { id: idSesi, uid: userId, jam },
    );
    return String(b?.kedaluwarsa_pada);
  }

  /**
   * Menghapus sesi yang sudah lewat masa berlakunya: satu sesi (idSesi diisi) atau semuanya.
   * Mengembalikan user_id pemilik setiap sesi yang dihapus, untuk dicatat sebagai Logout.
   * DELETE bersifat atomik, jadi satu sesi tidak mungkin tercatat dua kali.
   */
  async hapusKedaluwarsa(idSesi?: string): Promise<string[]> {
    const baris = await this.k.pilih(
      `DELETE FROM dbo.sesi OUTPUT deleted.user_id
        WHERE kedaluwarsa_pada <= SYSDATETIME() AND (@id IS NULL OR id_sesi = @id)`,
      { id: idSesi ?? null },
    );
    return baris.map((b) => String(b.user_id));
  }

  async hapusSesi(idSesi: string): Promise<void> {
    await this.k.jalankan('DELETE FROM dbo.sesi WHERE id_sesi = @id', { id: idSesi });
  }
}
