import { randomBytes } from 'node:crypto';
import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { Konfigurasi } from '../../config/Konfigurasi';
import { Database } from '../../core/Database';
import { Logger } from '../../core/Logger';
import { Kueri } from '../../core/Kueri';
import { AuthError } from '../../core/errors/AuthError';
import { Password } from '../../keamanan/Password';
import { Pengguna } from '../../keamanan/Pengguna';
import { SesiRepository } from '../../keamanan/SesiRepository';

/**
 * Login dan logout (FSD-2.1, FSD-2.2).
 * [AGREGASI] Database dibuat di luar.
 * [ASINKRON] Pencocokan password bcrypt berjalan async agar server tidak tertahan saat hashing.
 * [ASOSIASI] logout() hanya memakai objek Pengguna dari sesi sebagai parameter.
 */
export class AuthService {
  /** 32 byte acak = 64 karakter hex (panjang yang diperiksa SesiMiddleware). */
  private static readonly BYTE_ID_SESI = 32;

  constructor(private readonly db: Database) {}

  /**
   * BR-01: login hanya berhasil bila username dan password sesuai dan akun aktif.
   * BR-02: pesan gagal selalu sama (ERR-AUTH-02).
   * EF-5: pencatatan log login gagal -> login dibatalkan (transaksi).
   */
  async login(username: string, password: string) {
    const akun = await new SesiRepository(await this.db.kueri()).cariAkun(username);
    const cocok = akun ? await Password.cocok(password, akun.passwordHash) : false;
    if (!akun || !akun.aktif || !cocok) throw new AuthError('ERR-AUTH-02');

    const idSesi = randomBytes(AuthService.BYTE_ID_SESI).toString('hex');
    const kedaluwarsa = await this.db.transaksi(akun.pengguna, async (k) => {
      const repo = new SesiRepository(k);
      const exp = await repo.buatSesi(idSesi, akun.pengguna.userId, Konfigurasi.MASA_SESI_JAM);
      await AuthService.catatLog(k, 'Login', akun.pengguna.userId, `Login berhasil sebagai ${akun.pengguna.namaPeran}`);
      return exp;
    });
    return {
      id_sesi: idSesi,
      kedaluwarsa_pada: kedaluwarsa,
      pengguna: { user_id: akun.pengguna.userId, nama_pengguna: akun.namaPengguna, peran: akun.pengguna.peran },
    };
  }

  /** EF-1: bila log gagal, sesi tetap diakhiri dan galat hanya dicatat di server. */
  async logout(idSesi: string, pengguna: Pengguna): Promise<void> {
    const k = await this.db.kueri();
    const repo = new SesiRepository(k);
    await repo.hapusSesi(idSesi);
    try {
      await AuthService.catatLog(k, 'Logout', pengguna.userId, `Logout (${pengguna.namaPeran})`);
    } catch (err) {
      Logger.error('Log logout gagal ditulis; sesi tetap diakhiri (FSD-2.2 EF-1)', err);
    }
  }

  /** Login/Logout tidak mengubah tabel data, jadi dicatat backend secara langsung (BR-03). */
  private static catatLog(k: Kueri, jenis: 'Login' | 'Logout', userId: string, keterangan: string): Promise<void> {
    return PencatatAudit.catat(k, userId, { jenis, entitas: 'pengguna', idData: userId, keterangan });
  }
}
