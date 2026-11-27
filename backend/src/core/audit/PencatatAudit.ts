import { Kueri } from '../Kueri';
import { EntriAudit } from './EntriAudit';
import { RingkasanPerubahan } from './RingkasanPerubahan';

/**
 * Audit trail: menulis satu baris ke log_aktivitas (BR-03, FSD-2.5).
 *
 * Dipanggil service DI DALAM transaksi yang sama dengan perubahan datanya, jadi:
 * - bila data gagal disimpan, log ikut batal; bila log gagal ditulis, perubahan data ikut batal
 *   (FSD-2.5 EF-3: tidak ada aktivitas tanpa catatan);
 * - log tidak pernah diubah/dihapus aplikasi (BR-07; trigger trg_log_aktivitas_no_update_delete).
 *
 * [ENKAPSULASI] SQL INSERT log hanya ada di kelas ini.
 */
export class PencatatAudit {
  static async catat(k: Kueri, userId: string, e: EntriAudit): Promise<void> {
    await k.jalankan(
      `INSERT INTO dbo.log_aktivitas (jenis_aktivitas, entitas_terkait, id_data_terkait, keterangan, user_id)
       VALUES (@jenis, @entitas, @idData, @ket, @uid)`,
      { jenis: e.jenis, entitas: e.entitas, idData: e.idData, ket: RingkasanPerubahan.potong(e.keterangan), uid: userId },
    );
  }
}
