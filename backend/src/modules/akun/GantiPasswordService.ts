import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { Password } from '../../keamanan/Password';
import { Pengguna } from '../../keamanan/Pengguna';
import { AkunRepository } from './AkunRepository';

/**
 * Ganti Password (FSD-2.3, SCR-17) untuk Kader dan Super User yang sudah login.
 * BR-04: hanya password akun sendiri; ID akun diambil dari sesi, bukan dari isian, jadi akun lain tidak bisa disentuh.
 * EF-4 (sesi berakhir) ditangani SesiMiddleware sebelum sampai ke sini.
 *
 * [AGREGASI] Database dibuat di luar. [ASOSIASI] Pengguna hanya parameter. [ASINKRON] Hash bcrypt async.
 */
export class GantiPasswordService {
  constructor(private readonly db: Database) {}

  async ganti(passwordBaru: string, pengguna: Pengguna): Promise<void> {
    const hash = await Password.baru(passwordBaru, 'password_baru').hash(); // EF-1, EF-2
    await this.db.transaksi(pengguna, async (k) => {
      const repo = new AkunRepository(k);
      const akun = await repo.cariById(pengguna.userId, true);
      if (!akun) throw new DataError('ERR-DATA-07');
      await repo.perbaruiPassword(pengguna.userId, hash);
      // Step 4: isi password tidak pernah ditulis ke log
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Edit',
        entitas: 'pengguna',
        idData: pengguna.userId,
        keterangan: `Ganti password akun sendiri (${akun.username})`,
      });
    });
  }
}
