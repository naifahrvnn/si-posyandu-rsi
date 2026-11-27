import { Kueri, Parameter } from '../../core/Kueri';
import { FilterLog } from './FilterLog';

/**
 * [DESIGN PATTERN: REPOSITORY] Membaca log_aktivitas untuk Dashboard Monitoring (FSD-2.5).
 * Hanya SELECT: log tidak pernah diubah atau dihapus lewat aplikasi (BR-07).
 */
export class LogAktivitasRepository {
  constructor(private readonly k: Kueri) {}

  /** KPI satu hari: jumlah per jenis aktivitas dan jumlah pengguna yang sedang login. */
  async ringkasanHari(tanggal: string) {
    const b = await this.k.satu(
      `DECLARE @awal DATETIME2(0) = CAST(@tgl AS DATETIME2(0));
       SELECT
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS total,
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE jenis_aktivitas = 'Input'  AND waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS input,
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE jenis_aktivitas = 'Edit'   AND waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS edit,
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE jenis_aktivitas = 'Delete' AND waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS hapus,
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE jenis_aktivitas = 'Login'  AND waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS login,
         (SELECT COUNT(*) FROM dbo.log_aktivitas WHERE jenis_aktivitas = 'Ditolak' AND waktu_aktivitas >= @awal AND waktu_aktivitas < DATEADD(DAY, 1, @awal)) AS ditolak,
         (SELECT COUNT(DISTINCT s.user_id) FROM dbo.sesi s JOIN dbo.pengguna u ON u.user_id = s.user_id
           WHERE s.kedaluwarsa_pada > SYSDATETIME() AND u.peran = 'User (Kader)') AS kader_login,
         (SELECT COUNT(DISTINCT s.user_id) FROM dbo.sesi s WHERE s.kedaluwarsa_pada > SYSDATETIME()) AS semua_login,
         (SELECT COUNT(*) FROM dbo.pengguna u JOIN dbo.kader kd ON kd.petugas_id = u.petugas_id
           WHERE u.peran = 'User (Kader)' AND u.status_akun = 'Aktif') AS kader_aktif`,
      { tgl: tanggal },
    );
    const n = (k: string) => Number(b?.[k] ?? 0);
    return {
      total: n('total'),
      input: n('input'),
      edit: n('edit'),
      hapus: n('hapus'),
      login: n('login'),
      ditolak: n('ditolak'),
      kaderLogin: n('kader_login'),
      semuaLogin: n('semua_login'),
      kaderAktif: n('kader_aktif'),
    };
  }

  /** Riwayat aktivitas terbaru di atas, dengan filter dan pagination (OFFSET/FETCH). */
  async daftar(f: FilterLog) {
    const syarat: string[] = [];
    const p: Parameter = { lewati: (f.halaman - 1) * f.perHalaman, ambil: f.perHalaman };
    if (f.cari) {
      syarat.push(`(COALESCE(pt.nama, w.nama) LIKE @pola ESCAPE '\\' OR u.user_name LIKE @pola ESCAPE '\\')`);
      p.pola = `%${f.cari.replace(/[\\%_[]/g, (c) => `\\${c}`)}%`;
    }
    if (f.jenis) {
      syarat.push('l.jenis_aktivitas = @jenis');
      p.jenis = f.jenis;
    }
    if (f.dari) {
      syarat.push('l.waktu_aktivitas >= CAST(@dari AS DATETIME2(0))');
      p.dari = f.dari;
    }
    if (f.sampai) {
      syarat.push('l.waktu_aktivitas < DATEADD(DAY, 1, CAST(@sampai AS DATETIME2(0)))');
      p.sampai = f.sampai;
    }
    const where = syarat.length ? `WHERE ${syarat.join(' AND ')}` : '';
    const baris = await this.k.pilih(
      `SELECT l.log_id, l.waktu_aktivitas, l.jenis_aktivitas, l.entitas_terkait, l.id_data_terkait, l.keterangan,
              u.user_name, u.peran, COALESCE(pt.nama, w.nama, u.user_name) AS nama_pengguna,
              COUNT(*) OVER () AS total_baris
         FROM dbo.log_aktivitas l
         JOIN dbo.pengguna u ON u.user_id = l.user_id
         LEFT JOIN dbo.petugas pt ON pt.petugas_id = u.petugas_id
         LEFT JOIN dbo.warga w ON w.warga_id = u.warga_id
         ${where}
        ORDER BY l.waktu_aktivitas DESC, l.log_id
        OFFSET @lewati ROWS FETCH NEXT @ambil ROWS ONLY`,
      p,
    );
    return {
      total: baris.length ? Number(baris[0].total_baris) : 0,
      baris: baris.map((b) => ({
        id: String(b.log_id),
        waktu: String(b.waktu_aktivitas),
        nama_pengguna: String(b.nama_pengguna),
        username: String(b.user_name),
        peran: String(b.peran),
        jenis_aktivitas: String(b.jenis_aktivitas),
        modul: String(b.entitas_terkait),
        id_data: String(b.id_data_terkait),
        keterangan: (b.keterangan as string | null) ?? null,
      })),
    };
  }
}
