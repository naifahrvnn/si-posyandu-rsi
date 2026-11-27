import { JenisAktivitas } from '../../core/audit/EntriAudit';

/** Filter tabel Riwayat Aktivitas (SCR-19). */
export interface FilterLog {
  /** Sebagian nama petugas atau username, tidak peka huruf besar/kecil. */
  cari: string | null;
  jenis: JenisAktivitas | null;
  /** Tanggal awal dan akhir (YYYY-MM-DD), keduanya ikut dihitung. */
  dari: string | null;
  sampai: string | null;
  halaman: number;
  perHalaman: number;
}
