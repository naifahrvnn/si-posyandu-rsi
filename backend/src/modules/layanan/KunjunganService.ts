import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { Kueri } from '../../core/Kueri';
import { Pemeriksaan } from '../pemeriksaan/Pemeriksaan';
import { PemeriksaanRepository } from '../pemeriksaan/PemeriksaanRepository';
import { Uuid } from '../../core/Uuid';
import { Kelompok } from '../sasaran/Sasaran';

/**
 * Kelas dasar untuk pencatatan pada satu kunjungan (pemeriksaan): layanan dan isian pendukung.
 * Langkah bersama: pemeriksaan harus ada dan milik sasaran yang sama.
 *
 * [ABSTRAKSI + PEWARISAN] LayananService dan IsianPendukungService extends KunjunganService.
 * [AGREGASI] Database dan pembuat repository pemeriksaan dikirim dari luar (RakitanModul).
 */
export abstract class KunjunganService<P extends Pemeriksaan> {
  constructor(
    protected readonly db: Database,
    protected readonly kelompok: Kelompok,
    private readonly buatPemeriksaanRepo: (k: Kueri) => PemeriksaanRepository<P>,
  ) {}

  /** ERR-DATA-01 bila ID tidak valid, pemeriksaan tidak ada, atau bukan milik sasaran ini. */
  protected async pastikanPemeriksaan(k: Kueri, sasaranId: string, pemeriksaanId: string): Promise<P> {
    Uuid.pastikan('ERR-DATA-01', sasaranId, pemeriksaanId);
    const pemeriksaan = await this.buatPemeriksaanRepo(k).cariMilik(pemeriksaanId, sasaranId);
    if (!pemeriksaan) throw new DataError('ERR-DATA-01');
    return pemeriksaan;
  }
}
