import { Database } from '../../core/Database';
import { ERROR_CATALOG } from '../../core/errors/ErrorCatalog';
import { Tanggal } from '../../core/Tanggal';
import { FilterLog } from './FilterLog';
import { LogAktivitasRepository } from './LogAktivitasRepository';

/**
 * Dashboard Monitoring & Riwayat Aktivitas, khusus Koordinator (FSD-2.5, SCR-19).
 * Hak akses dicek di rute (AksesPeran 'lihat_log'); service ini hanya membaca.
 *
 * [ASINKRON] Method async; halaman SCR-19 memanggil ringkasan() dan log() bersamaan (Promise.all di frontend).
 */
export class MonitoringService {
  constructor(private readonly db: Database) {}

  /** Kartu KPI hari ini (WIB). */
  async ringkasan() {
    const hariIni = Tanggal.hariIni();
    const r = await new LogAktivitasRepository(await this.db.kueri()).ringkasanHari(hariIni);
    return {
      tanggal: hariIni,
      total_aktivitas_hari_ini: r.total,
      kader_sedang_login: r.kaderLogin,
      pengguna_sedang_login: r.semuaLogin,
      kader_aktif: r.kaderAktif,
      data_baru_hari_ini: r.input,
      perubahan_data_hari_ini: r.edit,
      hapus_data_hari_ini: r.hapus,
      login_hari_ini: r.login,
      akses_ditolak_hari_ini: r.ditolak,
    };
  }

  /** Tabel riwayat aktivitas. AF-1: tidak ada baris -> pesan ERR-DATA-04 (tetap 200). */
  async log(filter: FilterLog) {
    const { total, baris } = await new LogAktivitasRepository(await this.db.kueri()).daftar(filter);
    return {
      data: {
        baris,
        total,
        halaman: filter.halaman,
        per_halaman: filter.perHalaman,
        total_halaman: Math.max(1, Math.ceil(total / filter.perHalaman)),
      },
      pesan: total === 0 ? ERROR_CATALOG['ERR-DATA-04'].message : 'Riwayat aktivitas.',
    };
  }
}
