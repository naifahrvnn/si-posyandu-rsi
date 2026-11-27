import { Kueri } from '../../core/Kueri';
import { JenisKelamin } from '../sasaran/Sasaran';
import { TabelAcuan } from './TabelAcuan';

/** Membaca tabel dbo.aturan_kategori. */
export class AturanRepository {
  constructor(private readonly k: Kueri) {}

  async muat(): Promise<TabelAcuan> {
    const baris = await this.k.pilih(
      'SELECT indikator, jenis_kelamin, usia_min, usia_max, nilai_min, nilai_max, kategori FROM dbo.aturan_kategori',
    );
    return new TabelAcuan(
      baris.map((b) => ({
        indikator: String(b.indikator),
        jenisKelamin: (b.jenis_kelamin as JenisKelamin | null) ?? null,
        usiaMin: (b.usia_min as number | null) ?? null,
        usiaMax: (b.usia_max as number | null) ?? null,
        nilaiMin: (b.nilai_min as number | null) ?? null,
        nilaiMax: (b.nilai_max as number | null) ?? null,
        kategori: String(b.kategori),
      })),
    );
  }
}
