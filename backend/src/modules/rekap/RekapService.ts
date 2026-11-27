import { Database } from '../../core/Database';
import { RekapRepository } from './RekapRepository';

export type MetrikRekap =
  | 'jumlah_pemeriksaan'
  | 'jumlah_sasaran'
  | 'layanan'
  | 'stunting'
  | 'bbu'
  | 'bb_tb'
  | 'lk_u'
  | 'rujukan'
  | 'kek'
  | 'imt'
  | 'puma';

export interface BarisRekap {
  kelompok: 'balita' | 'ibu' | 'lansia';
  metrik: MetrikRekap;
  label: string;
  jumlah: number;
}

/**
 * Rekapitulasi bulanan (FSD-2.26, BR-33, BR-34). Hanya tampilan bahan laporan; tidak ada data yang diubah.
 * Kategori balita mengikuti Permenkes 2/2020 (z-score), dihitung saat pemeriksaan dicatat:
 * stunting (TB/U), BB/U, BB/PB-TB, lingkar kepala. Rujukan balita: BB/U di bawah garis merah atau
 * di atas garis oranye KMS. PUMA lansia: skor >= 7 dirujuk (BR-18).
 * Nomor KK tidak ditampilkan pada rekap. Kueri SQL ada di RekapRepository; service hanya merapikan hasil.
 */
export class RekapService {
  constructor(private readonly db: Database) {}

  async rekap(bulan: number, tahun: number) {
    const baris = await new RekapRepository(await this.db.kueri()).hitung(bulan, tahun);
    const data = baris
      .map((b) => ({ ...b, jumlah: Number(b.jumlah) }) as BarisRekap)
      .filter(
        (b) => b.jumlah > 0 || b.metrik === 'jumlah_pemeriksaan' || b.metrik === 'jumlah_sasaran' || b.metrik === 'rujukan',
      );
    const adaData =
      data.some((b) => b.metrik === 'jumlah_pemeriksaan' && b.jumlah > 0) || data.some((b) => b.metrik === 'layanan');
    return { bulan, tahun, ada_data: adaData, baris: data };
  }
}
