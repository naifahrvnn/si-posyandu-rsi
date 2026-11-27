import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { Tanggal } from '../../core/Tanggal';
import { Kelompok } from '../sasaran/Sasaran';
import { CariRepository } from './CariRepository';

/**
 * Cari Data Sasaran berdasarkan nama pada ketiga kelompok (FSD-2.25, BR-31, BR-32).
 * Service hanya menyusun hasil; kueri SQL ada di CariRepository.
 */
export class CariService {
  constructor(private readonly db: Database) {}

  async cari(kataKunci: string) {
    const baris = await new CariRepository(await this.db.kueri()).cariNama(kataKunci);
    if (baris.length === 0) throw new DataError('ERR-DATA-01'); // EF-2: tampilkan pilihan registrasi baru

    const hariIni = Tanggal.hariIni();
    return baris.map((b) => {
      const kelompok = b.kelompok as Kelompok;
      const lahir = Tanggal.dariDb(b.tanggal_lahir);
      return {
        kelompok,
        id: String(b.warga_id),
        nik: String(b.nik),
        nama: String(b.nama),
        jenis_kelamin: String(b.jenis_kelamin),
        dusun_rt_rw: `Dusun ${b.dusun} RT ${b.rt}/RW ${b.rw}`,
        umur: kelompok === 'balita' ? Tanggal.selisihBulan(lahir, hariIni) : Tanggal.selisihTahun(lahir, hariIni),
        satuan_umur: kelompok === 'balita' ? 'bulan' : 'tahun',
        pemeriksaan_terakhir: Tanggal.dariDbAtauNull(b.tanggal_periksa),
        status_kategori: (b.ringkasan as string | null) ?? null,
      };
    });
  }
}
