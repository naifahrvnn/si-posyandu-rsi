import { Pengguna } from '../../keamanan/Pengguna';
import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { Database } from '../../core/Database';
import { ValidationError } from '../../core/errors/ValidationError';
import { Kueri } from '../../core/Kueri';
import { PusatPeristiwa } from '../../core/peristiwa/PusatPeristiwa';
import { LayananRepository } from '../layanan/LayananRepository';
import { Sasaran } from '../sasaran/Sasaran';
import { AturanRepository } from './AturanRepository';
import { Pemeriksaan } from './Pemeriksaan';
import { PemeriksaanRepository } from './PemeriksaanRepository';
import { TabelAcuan } from './TabelAcuan';

/** Interface kecil yang dibutuhkan service ini dari SasaranService (interface segregation). */
export interface PencariSasaran<S extends Sasaran> {
  cariEntitas(id: string, k?: Kueri): Promise<S>;
}

export interface HasilCatat {
  data: Record<string, unknown>;
  /** ERR-DATA-02 bila ada kategori yang belum tersedia; pemeriksaan tetap tersimpan. */
  peringatan: string | null;
}

/**
 * Catat pemeriksaan + pantau kategori (FSD-2.7/2.8, 2.13–2.15, 2.20–2.22) dan riwayat (FSD-2.11, 2.18, 2.24).
 *
 * [ABSTRAKSI] Langkah umum (validasi, cek sasaran, tanggal, tabel acuan, simpan) ditulis di sini;
 *             subclass hanya mengisi buatPemeriksaan() (template method).
 * [POLIMORFISME] PemeriksaanBalitaService, PemeriksaanIbuService, PemeriksaanLansiaService menimpa buatPemeriksaan().
 * [AGREGASI] SasaranService, Database, pembuat repository, dan PusatPeristiwa dikirim dari luar.
 * [ASOSIASI] Pengguna hanya diterima sebagai parameter catat() untuk dicatat_oleh dan log, tidak disimpan.
 * [DESIGN PATTERN: OBSERVER] Setelah tersimpan, menerbitkan peristiwa 'pemeriksaan.dicatat'.
 */
export abstract class PemeriksaanService<S extends Sasaran, P extends Pemeriksaan, In extends { tanggal_periksa: string }> {
  constructor(
    protected readonly db: Database,
    protected readonly sasaranService: PencariSasaran<S>,
    protected readonly buatRepository: (k: Kueri) => PemeriksaanRepository<P>,
    private readonly peristiwa?: PusatPeristiwa,
  ) {}

  /** Cara membuat pemeriksaan (dan menghitung kategorinya) berbeda untuk tiap kelompok. */
  /** petugasId dipakai untuk kolom dicatat_oleh (FK ke petugas). */
  protected abstract buatPemeriksaan(k: Kueri, input: In, sasaran: S, acuan: TabelAcuan, petugasId: string): Promise<P>;

  async catat(sasaranId: string, input: In, pengguna: Pengguna): Promise<HasilCatat> {
    const hasil = await this.db.transaksi(pengguna, async (k) => {
      const sasaran = await this.sasaranService.cariEntitas(sasaranId, k); // BR-11
      if (input.tanggal_periksa < sasaran.tanggalLahir) {
        throw new ValidationError('ERR-VAL-11', 'tanggal_periksa');
      }
      const acuan = await new AturanRepository(k).muat();
      const pemeriksaan = await this.buatPemeriksaan(k, input, sasaran, acuan, pengguna.petugasId);
      const repo = this.buatRepository(k);
      await repo.simpan(pemeriksaan);
      // Audit trail di transaksi yang sama; ringkasan disusun polimorfis oleh subclass pemeriksaan
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Input',
        entitas: `pemeriksaan_${sasaran.kelompok}`,
        idData: pemeriksaan.id,
        keterangan: `Pemeriksaan ${sasaran.kelompok} ${sasaran.nama} (${input.tanggal_periksa}): ${pemeriksaan.ringkasan}`,
      });
      // Dibaca ulang agar created_at dari basis data ikut dikirim
      const tersimpan = (await repo.cariMilik(pemeriksaan.id, sasaranId)) ?? pemeriksaan;
      return {
        sasaran,
        pemeriksaan,
        data: tersimpan.toJSON() as unknown as Record<string, unknown>,
        peringatan: pemeriksaan.adaKategoriBelumTersedia ? 'ERR-DATA-02' : null,
      };
    });
    // Diterbitkan setelah commit, jadi pengamat hanya melihat data yang benar-benar tersimpan
    this.peristiwa?.terbitkan({
      jenis: 'pemeriksaan.dicatat',
      userId: pengguna.userId,
      kelompok: hasil.sasaran.kelompok,
      sasaranId,
      pemeriksaanId: hasil.pemeriksaan.id,
      perluDirujuk: hasil.pemeriksaan.perluDirujuk,
    });
    return { data: hasil.data, peringatan: hasil.peringatan };
  }

  /** Identitas, pemeriksaan terakhir, riwayat (terbaru di atas), dan riwayat layanan. */
  async riwayat(sasaranId: string) {
    const sasaran = await this.sasaranService.cariEntitas(sasaranId);
    const k = await this.db.kueri();
    const kelompok = sasaran.kelompok;
    // [ASINKRON] Riwayat pemeriksaan dan riwayat layanan dibaca bersamaan, lalu ditunggu keduanya
    const [riwayat, layanan] = await Promise.all([
      this.buatRepository(k).riwayat(sasaranId),
      kelompok === 'lansia' ? Promise.resolve([]) : new LayananRepository(k).daftar(kelompok, sasaranId),
    ]);
    const pemeriksaan = riwayat.map((r) => ({ ...r.pemeriksaan.toJSON(), isian: r.isian?.toJSON() ?? null }));
    return {
      sasaran: sasaran.toJSON(),
      pemeriksaan_terakhir: pemeriksaan[0] ?? null,
      pemeriksaan,
      layanan: layanan.map((l) => l.toJSON()),
    };
  }
}
