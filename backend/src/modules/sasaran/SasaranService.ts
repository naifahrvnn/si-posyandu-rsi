import { Pengguna } from '../../keamanan/Pengguna';
import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { RingkasanPerubahan } from '../../core/audit/RingkasanPerubahan';
import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { ValidationError } from '../../core/errors/ValidationError';
import { Kueri } from '../../core/Kueri';
import { Uuid } from '../../core/Uuid';
import { IdentitasInput, IdentitasJson, Sasaran } from './Sasaran';
import { KartuKeluargaService } from './KartuKeluargaService';
import { SasaranRepository } from './SasaranRepository';

/**
 * Aturan bisnis Kelola Data Sasaran: FSD-2.6 (balita), FSD-2.12 (ibu), FSD-2.19 (lansia).
 * Satu kelas generic dipakai untuk ketiga kelompok.
 *
 * [POLIMORFISME (generic)] T bisa Balita, Ibu, atau Lansia; perilaku khusus datang dari objek T dan repository-nya.
 * [AGREGASI] Database dan pembuat repository dikirim dari luar (RakitanModul).
 * [ASOSIASI] Pengguna hanya dipakai sebagai parameter untuk mencatat siapa yang melakukan aksi (BR-03).
 * [ASINKRON] Semua method async.
 * Audit trail: setiap tambah/ubah/hapus menulis log_aktivitas di transaksi yang sama (PencatatAudit).
 */
export class SasaranService<T extends Sasaran, I extends IdentitasInput> {
  /** [KOMPOSISI] Aturan kartu keluarga dibuat dan dimiliki service ini. */
  private readonly kartuKeluarga = new KartuKeluargaService();

  constructor(
    private readonly db: Database,
    private readonly buatRepository: (k: Kueri) => SasaranRepository<T>,
    private readonly buatEntitas: (input: I) => T,
  ) {}

  /** Main Flow: registrasi sasaran baru + log 'Input'. */
  async tambah(input: I, pengguna: Pengguna): Promise<IdentitasJson> {
    return this.db.transaksi(pengguna, async (k) => {
      const repo = this.buatRepository(k);
      if (await repo.nikSudahAda(input.nik)) throw new ValidationError('ERR-VAL-05', 'nik'); // EF-3
      const kkBaru = await this.kartuKeluarga.siapkan(k, input);
      const sasaran = this.buatEntitas(input);
      await repo.simpanBaru(sasaran);
      const lahir = sasaran.tanggalLahir;
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Input',
        entitas: sasaran.kelompok,
        idData: sasaran.id,
        keterangan:
          `Tambah data ${sasaran.kelompok}: ${sasaran.nama} (NIK ${RingkasanPerubahan.samarkan(input.nik)}, lahir ${lahir})` +
          (kkBaru ? `; KK baru ${RingkasanPerubahan.samarkan(String(input.no_kk))}` : ''),
      });
      return this.ambil(repo, sasaran.id);
    });
  }

  async detail(id: string): Promise<IdentitasJson> {
    return (await this.cariEntitas(id)).toJSON();
  }

  /** Dipakai service lain (pemeriksaan) yang butuh objek sasaran. */
  async cariEntitas(id: string, k?: Kueri): Promise<T> {
    Uuid.pastikan('ERR-DATA-01', id);
    const sasaran = await this.buatRepository(k ?? (await this.db.kueri())).cariById(id);
    if (!sasaran) throw new DataError('ERR-DATA-01');
    return sasaran;
  }

  /** AF-1: ubah data + log 'Edit' berisi perubahan sebelum → sesudah. */
  async ubah(id: string, perubahan: Partial<I>, pengguna: Pengguna): Promise<IdentitasJson> {
    Uuid.pastikan('ERR-DATA-01', id);
    return this.db.transaksi(pengguna, async (k) => {
      const repo = this.buatRepository(k);
      // [ASINKRON] Dua pemeriksaan dimulai bersamaan, lalu ditunggu keduanya selesai
      const [sasaran, nikBentrok] = await Promise.all([
        repo.cariById(id, true),
        perubahan.nik ? repo.nikSudahAda(perubahan.nik, id) : Promise.resolve(false),
      ]);
      if (!sasaran) throw new DataError('ERR-DATA-01');
      if (nikBentrok) throw new ValidationError('ERR-VAL-05', 'nik');
      const sebelum = sasaran.toJSON() as unknown as Record<string, unknown>;
      await this.kartuKeluarga.siapkan(
        k,
        {
          ...perubahan,
          no_kk: perubahan.no_kk ?? sasaran.noKk,
          hubungan_keluarga: perubahan.hubungan_keluarga ?? sasaran.hubunganKeluarga,
        },
        id,
      );
      sasaran.terapkanPerubahan(perubahan);
      await repo.perbarui(sasaran);
      const sesudah = await this.ambil(repo, id);
      const beda = RingkasanPerubahan.bandingkan(sebelum, sesudah as unknown as Record<string, unknown>);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Edit',
        entitas: sasaran.kelompok,
        idData: id,
        keterangan: `Ubah data ${sasaran.kelompok} ${sasaran.nama}: ${beda || 'disimpan tanpa perubahan'}`,
      });
      return sesudah;
    });
  }

  /**
   * AF-3: hapus data beserta riwayatnya (BR-40) + log 'Delete'.
   * Hanya Koordinator: dicek di rute (AksesPeran) dan ditolak lagi oleh RLS basis data untuk peran lain.
   */
  async hapus(id: string, pengguna: Pengguna): Promise<void> {
    Uuid.pastikan('ERR-DATA-01', id);
    await this.db.transaksi(pengguna, async (k) => {
      const repo = this.buatRepository(k);
      const sasaran = await repo.cariById(id, true);
      if (!sasaran) throw new DataError('ERR-DATA-01');
      await repo.hapus(id);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Delete',
        entitas: sasaran.kelompok,
        idData: id,
        keterangan: `Hapus data ${sasaran.kelompok} ${sasaran.nama} beserta riwayat pemeriksaan, layanan, dan isian pendukung`,
      });
    });
  }

  /** Membaca ulang agar created_at dan updated_at dari basis data ikut dikirim. */
  private async ambil(repo: SasaranRepository<T>, id: string): Promise<IdentitasJson> {
    const sasaran = await repo.cariById(id);
    if (!sasaran) throw new DataError('ERR-DATA-01');
    return sasaran.toJSON();
  }
}
