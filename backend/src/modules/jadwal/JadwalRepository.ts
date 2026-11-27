import { Kueri } from '../../core/Kueri';
import { JadwalKegiatan } from './JadwalKegiatan';

/** [DESIGN PATTERN: REPOSITORY] Akses tabel jadwal_kegiatan. */
export class JadwalRepository {
  private static readonly KOLOM = `j.jadwal_id, j.nama_kegiatan, j.jenis_kegiatan, j.tanggal_pelaksanaan, j.lokasi,
    j.keterangan, j.penanggung_jawab, p.nama AS nama_penanggung_jawab`;

  constructor(private readonly k: Kueri) {}

  /**
   * Jadwal mulai hari ini, urut tanggal terdekat.
   * Memakai view dbo.v_jadwal_mendatang dari skrip basis data (02_objects.sql).
   */
  async mendatang(batas: number): Promise<JadwalKegiatan[]> {
    const baris = await this.k.pilih(
      `SELECT TOP (${batas}) v.jadwal_id, v.nama_kegiatan, v.jenis_kegiatan, v.tanggal_pelaksanaan, v.lokasi,
              v.keterangan, v.petugas_penanggung_jawab AS nama_penanggung_jawab
         FROM dbo.v_jadwal_mendatang v
        ORDER BY v.tanggal_pelaksanaan, v.keterangan`,
    );
    return baris.map(JadwalKegiatan.dariBaris);
  }

  async cariMendatang(id: string, mulai: string): Promise<JadwalKegiatan | null> {
    const b = await this.k.satu(
      `SELECT ${JadwalRepository.KOLOM}
         FROM dbo.jadwal_kegiatan j JOIN dbo.petugas p ON p.petugas_id = j.penanggung_jawab
        WHERE j.jadwal_id = @id AND j.tanggal_pelaksanaan >= @mulai`,
      { id, mulai },
    );
    return b ? JadwalKegiatan.dariBaris(b) : null;
  }

  async simpan(j: JadwalKegiatan): Promise<void> {
    const p = j.props;
    await this.k.jalankan(
      `INSERT INTO dbo.jadwal_kegiatan (jadwal_id, nama_kegiatan, jenis_kegiatan, tanggal_pelaksanaan, lokasi, penanggung_jawab, keterangan)
       VALUES (@id, @nama, @jenis, @tanggal, @lokasi, @pj, @ket)`,
      {
        id: p.id,
        nama: p.namaKegiatan,
        jenis: p.jenisKegiatan,
        tanggal: p.tanggal,
        lokasi: p.lokasi,
        pj: p.penanggungJawab,
        ket: j.keteranganTersimpan,
      },
    );
  }

  async perbarui(j: JadwalKegiatan): Promise<void> {
    const p = j.props;
    await this.k.jalankan(
      `UPDATE dbo.jadwal_kegiatan SET nama_kegiatan = @nama, jenis_kegiatan = @jenis, tanggal_pelaksanaan = @tanggal,
              lokasi = @lokasi, keterangan = @ket WHERE jadwal_id = @id`,
      {
        id: p.id,
        nama: p.namaKegiatan,
        jenis: p.jenisKegiatan,
        tanggal: p.tanggal,
        lokasi: p.lokasi,
        ket: j.keteranganTersimpan,
      },
    );
  }

  /** Jumlah pemeriksaan dan layanan yang mencatat jadwal ini (FK tanpa ON DELETE CASCADE). */
  async jumlahPemakai(id: string): Promise<number> {
    const b = await this.k.satu(
      `SELECT (SELECT COUNT(*) FROM dbo.pemeriksaan_balita WHERE jadwal_id = @id)
            + (SELECT COUNT(*) FROM dbo.pemeriksaan_ibu WHERE jadwal_id = @id)
            + (SELECT COUNT(*) FROM dbo.pemeriksaan_lansia WHERE jadwal_id = @id)
            + (SELECT COUNT(*) FROM dbo.layanan WHERE jadwal_id = @id) AS jumlah`,
      { id },
    );
    return Number(b?.jumlah ?? 0);
  }

  async hapus(id: string): Promise<void> {
    await this.k.jalankan('DELETE FROM dbo.jadwal_kegiatan WHERE jadwal_id = @id', { id });
  }
}
