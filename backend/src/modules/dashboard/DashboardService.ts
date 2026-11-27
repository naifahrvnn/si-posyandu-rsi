import { Tanggal } from '../../core/Tanggal';
import { JadwalService } from '../jadwal/JadwalService';
import { RekapService } from '../rekap/RekapService';

/**
 * Dashboard Koordinator dan Kader: ringkasan bulan sebelumnya + jadwal kegiatan yang akan datang.
 *
 * [AGREGASI] Memakai RekapService dan JadwalService yang dibuat di luar (RakitanModul).
 * [ASINKRON] Rekap dan jadwal diambil bersamaan dengan Promise.all.
 */
export class DashboardService {
  private static readonly JUMLAH_JADWAL = 5;

  constructor(
    private readonly rekap: RekapService,
    private readonly jadwal: JadwalService,
  ) {}

  /** Bulan sebelum bulan berjalan (WIB). */
  static bulanSebelumnya(hariIni = Tanggal.hariIni()): { bulan: number; tahun: number } {
    const [tahun, bulan] = hariIni.split('-').map(Number);
    return bulan === 1 ? { bulan: Tanggal.BULAN_PER_TAHUN, tahun: tahun - 1 } : { bulan: bulan - 1, tahun };
  }

  async ringkasan() {
    const { bulan, tahun } = DashboardService.bulanSebelumnya();
    const [rekap, jadwal] = await Promise.all([
      this.rekap.rekap(bulan, tahun),
      this.jadwal.mendatang(DashboardService.JUMLAH_JADWAL),
    ]);
    const jumlah = (kelompok: string, metrik: string, label?: string) =>
      rekap.baris
        .filter((b) => b.kelompok === kelompok && b.metrik === metrik && (label === undefined || b.label === label))
        .reduce((n, b) => n + b.jumlah, 0);
    const hadir = {
      balita: jumlah('balita', 'jumlah_sasaran'),
      ibu: jumlah('ibu', 'jumlah_sasaran'),
      lansia: jumlah('lansia', 'jumlah_sasaran'),
    };
    const daftar = (metrik: string) =>
      rekap.baris
        .filter((b) => b.kelompok === 'balita' && b.metrik === metrik)
        .map((b) => ({ label: b.label, jumlah: b.jumlah }));
    return {
      periode: { bulan, tahun },
      ada_data: rekap.ada_data,
      sasaran_hadir: { ...hadir, total: hadir.balita + hadir.ibu + hadir.lansia },
      balita: {
        stunting: daftar('stunting'),
        bbu: daftar('bbu'),
        bb_tb: daftar('bb_tb'),
        wajib_dirujuk: jumlah('balita', 'rujukan', 'Wajib dirujuk (BB/U di luar garis merah-oranye)'),
        sudah_dirujuk: jumlah('balita', 'rujukan', 'Sudah ditandai dirujuk'),
      },
      jadwal_mendatang: jadwal,
    };
  }
}
