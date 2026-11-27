/**
 * Nilai kolom log_aktivitas.jenis_aktivitas (CHECK di 01_schema.sql).
 * 'Ditolak' = percobaan akses tanpa hak (ERR-AUTH-03); usulan tambahan enum FSD-2.5.
 */
export type JenisAktivitas = 'Login' | 'Logout' | 'Input' | 'Edit' | 'Delete' | 'Ditolak';

/** Satu baris yang akan ditulis ke log_aktivitas. */
export interface EntriAudit {
  jenis: JenisAktivitas;
  /** Modul/tabel yang disentuh, mis. 'balita', 'pemeriksaan_balita', 'jadwal_kegiatan'. */
  entitas: string;
  /** Primary key data yang disentuh (UUID). */
  idData: string;
  /** Detail: ringkasan data yang diisi, atau perubahan "sebelum → sesudah". */
  keterangan: string;
}
