import { Pengguna } from '../../keamanan/Pengguna';
import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { RingkasanPerubahan } from '../../core/audit/RingkasanPerubahan';
import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { ValidationError } from '../../core/errors/ValidationError';
import { PusatPeristiwa } from '../../core/peristiwa/PusatPeristiwa';
import { Tanggal } from '../../core/Tanggal';
import { Uuid } from '../../core/Uuid';
import { JadwalInput, JadwalKegiatan } from './JadwalKegiatan';
import { JadwalRepository } from './JadwalRepository';

/**
 * Kelola jadwal kegiatan Posyandu yang akan datang (Koordinator dan Kader).
 * Hanya jadwal mulai hari ini yang tampil dan bisa diubah/dihapus; jadwal lampau tetap sebagai riwayat.
 * Penanggung jawab jadwal baru = petugas yang login.
 *
 * [AGREGASI] Database dan PusatPeristiwa dibuat di luar (RakitanModul).
 * [ASOSIASI] Pengguna diterima sebagai parameter untuk penanggung jawab dan log, tidak disimpan.
 */
export class JadwalService {
  static readonly BATAS_DAFTAR = 20;

  constructor(
    private readonly db: Database,
    private readonly peristiwa?: PusatPeristiwa,
  ) {}

  /** [DESIGN PATTERN: OBSERVER] Memberi tahu pengamat setiap kali jadwal berubah. */
  private beriTahu(aksi: 'tambah' | 'ubah' | 'hapus', jadwalId: string, pengguna: Pengguna): void {
    this.peristiwa?.terbitkan({ jenis: 'jadwal.diubah', userId: pengguna.userId, aksi, jadwalId });
  }

  async mendatang(batas = JadwalService.BATAS_DAFTAR) {
    const repo = new JadwalRepository(await this.db.kueri());
    return (await repo.mendatang(batas)).map((j) => j.toJSON());
  }

  async tambah(input: JadwalInput, pengguna: Pengguna) {
    JadwalService.pastikanTidakLampau(input.tanggal_pelaksanaan);
    const hasil = await this.db.transaksi(pengguna, async (k) => {
      const jadwal = JadwalKegiatan.buat(input, pengguna.petugasId);
      const repo = new JadwalRepository(k);
      await repo.simpan(jadwal);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Input',
        entitas: 'jadwal_kegiatan',
        idData: jadwal.id,
        keterangan:
          `Tambah jadwal ${input.jenis_kegiatan}: ${input.nama_kegiatan}, ${input.tanggal_pelaksanaan} ` +
          `${input.jam_mulai}-${input.jam_selesai}, ${input.lokasi}`,
      });
      return (await repo.cariMendatang(jadwal.id, Tanggal.hariIni()))?.toJSON() ?? jadwal.toJSON();
    });
    this.beriTahu('tambah', hasil.id, pengguna);
    return hasil;
  }

  async ubah(id: string, input: Partial<JadwalInput>, pengguna: Pengguna) {
    if (input.tanggal_pelaksanaan) JadwalService.pastikanTidakLampau(input.tanggal_pelaksanaan);
    const hasil = await this.db.transaksi(pengguna, async (k) => {
      const repo = new JadwalRepository(k);
      const jadwal = await this.cari(repo, id);
      const sebelum = jadwal.toJSON() as Record<string, unknown>;
      jadwal.terapkanPerubahan(input);
      const p = jadwal.props;
      if (p.jamMulai && p.jamSelesai && p.jamSelesai <= p.jamMulai) throw new ValidationError('ERR-VAL-14', 'jam_selesai');
      await repo.perbarui(jadwal);
      const beda = RingkasanPerubahan.bandingkan(sebelum, jadwal.toJSON() as Record<string, unknown>);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Edit',
        entitas: 'jadwal_kegiatan',
        idData: id,
        keterangan: `Ubah jadwal ${jadwal.props.namaKegiatan}: ${beda || 'disimpan tanpa perubahan'}`,
      });
      return (await repo.cariMendatang(id, Tanggal.hariIni()))?.toJSON() ?? jadwal.toJSON();
    });
    this.beriTahu('ubah', id, pengguna);
    return hasil;
  }

  async hapus(id: string, pengguna: Pengguna): Promise<void> {
    await this.db.transaksi(pengguna, async (k) => {
      const repo = new JadwalRepository(k);
      const jadwal = await this.cari(repo, id);
      // Jadwal yang sudah dipakai pemeriksaan/layanan tidak boleh hilang dari riwayat
      if ((await repo.jumlahPemakai(id)) > 0) throw new DataError('ERR-DATA-06', 'jadwal_id');
      await repo.hapus(id);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Delete',
        entitas: 'jadwal_kegiatan',
        idData: id,
        keterangan: `Hapus jadwal ${jadwal.props.namaKegiatan} (${jadwal.props.tanggal})`,
      });
    });
    this.beriTahu('hapus', id, pengguna);
  }

  private async cari(repo: JadwalRepository, id: string): Promise<JadwalKegiatan> {
    Uuid.pastikan('ERR-DATA-09', id);
    const jadwal = await repo.cariMendatang(id, Tanggal.hariIni());
    if (!jadwal) throw new DataError('ERR-DATA-09');
    return jadwal;
  }

  /** Jadwal yang akan datang tidak boleh bertanggal lampau (ERR-VAL-15). */
  private static pastikanTidakLampau(tanggal: string): void {
    if (tanggal < Tanggal.hariIni()) throw new ValidationError('ERR-VAL-15', 'tanggal_pelaksanaan');
  }
}
