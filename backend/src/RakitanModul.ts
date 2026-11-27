import { Database } from './core/Database';
import { Kueri } from './core/Kueri';
import { Modul } from './core/Modul';
import { PencatatAksesDitolak } from './core/peristiwa/PencatatAksesDitolak';
import { PencatatAktivitas } from './core/peristiwa/PencatatAktivitas';
import { PencatatGalat } from './core/peristiwa/PencatatGalat';
import { PusatPeristiwa } from './core/peristiwa/PusatPeristiwa';
import { AksesPeran } from './keamanan/AksesPeran';
import { PengakhirSesi } from './keamanan/PengakhirSesi';
import { SesiMiddleware } from './keamanan/SesiMiddleware';
import { AkunController } from './modules/akun/AkunController';
import { GantiPasswordService } from './modules/akun/GantiPasswordService';
import { KelolaAkunService } from './modules/akun/KelolaAkunService';
import { AuthController } from './modules/auth/AuthController';
import { AuthService } from './modules/auth/AuthService';
import { Balita, BalitaInput } from './modules/balita/Balita';
import { BalitaRepository } from './modules/balita/BalitaRepository';
import { BalitaValidator } from './modules/balita/BalitaValidator';
import { PemeriksaanBalitaRepository } from './modules/balita/PemeriksaanBalitaRepository';
import { PemeriksaanBalitaService } from './modules/balita/PemeriksaanBalitaService';
import { PemeriksaanBalitaValidator } from './modules/balita/PemeriksaanBalitaValidator';
import { CariController } from './modules/cari/CariController';
import { CariService } from './modules/cari/CariService';
import { DashboardController } from './modules/dashboard/DashboardController';
import { DashboardService } from './modules/dashboard/DashboardService';
import { Ibu, IbuInput } from './modules/ibu/Ibu';
import { IbuRepository } from './modules/ibu/IbuRepository';
import { IbuValidator } from './modules/ibu/IbuValidator';
import { PemeriksaanIbuRepository } from './modules/ibu/PemeriksaanIbuRepository';
import { PemeriksaanIbuService } from './modules/ibu/PemeriksaanIbuService';
import { PemeriksaanIbuValidator } from './modules/ibu/PemeriksaanIbuValidator';
import { JadwalController } from './modules/jadwal/JadwalController';
import { JadwalService } from './modules/jadwal/JadwalService';
import { Lansia, LansiaInput } from './modules/lansia/Lansia';
import { LansiaRepository } from './modules/lansia/LansiaRepository';
import { LansiaValidator } from './modules/lansia/LansiaValidator';
import { PemeriksaanLansiaRepository } from './modules/lansia/PemeriksaanLansiaRepository';
import { PemeriksaanLansiaService } from './modules/lansia/PemeriksaanLansiaService';
import { PemeriksaanLansiaValidator } from './modules/lansia/PemeriksaanLansiaValidator';
import { FaskesController } from './modules/layanan/FaskesController';
import { FaskesService } from './modules/layanan/FaskesService';
import { IsianPendukungController } from './modules/layanan/IsianPendukungController';
import { IsianPendukungService } from './modules/layanan/IsianPendukungService';
import { IsianPendukungValidator } from './modules/layanan/IsianPendukungValidator';
import { LayananController } from './modules/layanan/LayananController';
import { LayananService } from './modules/layanan/LayananService';
import { LayananValidator } from './modules/layanan/LayananValidator';
import { MonitoringController } from './modules/monitoring/MonitoringController';
import { MonitoringService } from './modules/monitoring/MonitoringService';
import { PemeriksaanController } from './modules/pemeriksaan/PemeriksaanController';
import { RekapController } from './modules/rekap/RekapController';
import { RekapService } from './modules/rekap/RekapService';
import { KelompokRouter } from './modules/sasaran/KelompokRouter';
import { SasaranController } from './modules/sasaran/SasaranController';
import { SasaranService } from './modules/sasaran/SasaranService';
import { StatusController } from './modules/status/StatusController';
import { StatusService } from './modules/status/StatusService';

/**
 * Titik perakitan objek (composition root). SATU-SATUNYA tempat objek dibuat dengan `new`
 * lalu dikirim lewat constructor (dependency injection). Kelas lain tidak membuat dependensinya sendiri,
 * sehingga mudah diuji dan diganti.
 *
 * Urutan baca: objek bersama (db, sesi, akses, peristiwa) -> modul per fungsi FSD -> daftar modul().
 *
 * [AGREGASI] db, sesi, akses, dan peristiwa dibuat sekali di sini dan dipakai bersama oleh banyak modul.
 */
export class RakitanModul {
  private readonly db = Database.getInstance();
  /** Dipakai SesiMiddleware dan dijalankan berkala dari index.ts. */
  readonly pengakhirSesi = new PengakhirSesi(this.db);
  private readonly sesi = new SesiMiddleware(this.db, this.pengakhirSesi);
  /** [DESIGN PATTERN: OBSERVER] Satu subject, tiga pengamat. Pengamat baru cukup didaftarkan di sini. */
  readonly peristiwa = new PusatPeristiwa()
    .daftarkan(new PencatatAktivitas())
    .daftarkan(new PencatatGalat())
    .daftarkan(new PencatatAksesDitolak(this.db));
  private readonly akses = new AksesPeran(this.peristiwa);

  /** Menutup pool basis data saat server dimatikan. */
  tutup(): Promise<void> {
    return this.db.tutup();
  }

  /** Semua modul API, urut sesuai nomor fungsi FSD. */
  modul(): Modul[] {
    const rekap = new RekapService(this.db);
    const jadwal = new JadwalService(this.db, this.peristiwa);
    return [
      // Status layanan (server dan basis data), tanpa login
      new StatusController(new StatusService(this.db)),
      // FSD-2.1, 2.2 Login & Logout
      new AuthController(new AuthService(this.db), this.sesi),
      // FSD-2.3 Ganti Password, FSD-2.4 Kelola Akun
      new AkunController(new KelolaAkunService(this.db), new GantiPasswordService(this.db), this.sesi, this.akses),
      // FSD-2.5 Log Aktivitas (Dashboard Monitoring)
      new MonitoringController(new MonitoringService(this.db), this.sesi, this.akses),
      // FSD-2.6 s.d. 2.24 Data sasaran, pemeriksaan, layanan, isian pendukung
      this.balita(),
      this.ibu(),
      this.lansia(),
      new FaskesController(new FaskesService(this.db), this.sesi, this.akses),
      // FSD-2.25 Cari Data Sasaran
      new CariController(new CariService(this.db), this.sesi, this.akses),
      // FSD-2.26 Rekapitulasi Bulanan
      new RekapController(rekap, this.sesi, this.akses),
      // Beranda: ringkasan bulan lalu + jadwal kegiatan
      new JadwalController(jadwal, this.sesi, this.akses),
      new DashboardController(new DashboardService(rekap, jadwal), this.sesi, this.akses),
    ];
  }

  private balita(): KelompokRouter {
    const sasaran = new SasaranService<Balita, BalitaInput>(this.db, (k) => new BalitaRepository(k), Balita.buat);
    const pemeriksaanRepo = (k: Kueri) => new PemeriksaanBalitaRepository(k);
    return new KelompokRouter(
      'balita',
      this.sesi,
      this.akses,
      new SasaranController('balita', sasaran, new BalitaValidator()),
      new PemeriksaanController(
        new PemeriksaanBalitaService(this.db, sasaran, pemeriksaanRepo, this.peristiwa),
        new PemeriksaanBalitaValidator(),
      ),
      new IsianPendukungController(new IsianPendukungService(this.db, 'balita', pemeriksaanRepo), new IsianPendukungValidator()),
      new LayananController(new LayananService(this.db, 'balita', pemeriksaanRepo), new LayananValidator('balita')),
    );
  }

  private ibu(): KelompokRouter {
    const sasaran = new SasaranService<Ibu, IbuInput>(this.db, (k) => new IbuRepository(k), Ibu.buat);
    const pemeriksaanRepo = (k: Kueri) => new PemeriksaanIbuRepository(k);
    return new KelompokRouter(
      'ibu',
      this.sesi,
      this.akses,
      new SasaranController('ibu', sasaran, new IbuValidator()),
      new PemeriksaanController(
        new PemeriksaanIbuService(this.db, sasaran, pemeriksaanRepo, this.peristiwa),
        new PemeriksaanIbuValidator(),
      ),
      new IsianPendukungController(new IsianPendukungService(this.db, 'ibu', pemeriksaanRepo), new IsianPendukungValidator()),
      new LayananController(new LayananService(this.db, 'ibu', pemeriksaanRepo), new LayananValidator('ibu')),
    );
  }

  /** Lansia tidak memiliki layanan (BR-28): router dibuat tanpa LayananController. */
  private lansia(): KelompokRouter {
    const sasaran = new SasaranService<Lansia, LansiaInput>(this.db, (k) => new LansiaRepository(k), Lansia.buat);
    const pemeriksaanRepo = (k: Kueri) => new PemeriksaanLansiaRepository(k);
    return new KelompokRouter(
      'lansia',
      this.sesi,
      this.akses,
      new SasaranController('lansia', sasaran, new LansiaValidator()),
      new PemeriksaanController(
        new PemeriksaanLansiaService(this.db, sasaran, pemeriksaanRepo, this.peristiwa),
        new PemeriksaanLansiaValidator(),
      ),
      new IsianPendukungController(new IsianPendukungService(this.db, 'lansia', pemeriksaanRepo), new IsianPendukungValidator()),
    );
  }
}
