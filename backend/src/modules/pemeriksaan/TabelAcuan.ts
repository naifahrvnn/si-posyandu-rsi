import { JenisKelamin } from '../sasaran/Sasaran';

/** Satu baris tabel aturan_kategori. */
export interface AturanKategori {
  indikator: string;
  jenisKelamin: JenisKelamin | null;
  usiaMin: number | null;
  usiaMax: number | null;
  nilaiMin: number | null;
  nilaiMax: number | null;
  kategori: string;
}

/**
 * Tabel acuan penentuan kategori (BR-20, BR-21, BR-23, BR-24).
 * Aturan disimpan di basis data (aturan_kategori), bukan ditulis tetap di kode.
 * Logika pencocokan sama dengan fn_kategori_aturan versi MySQL: kolom aturan yang kosong berarti
 * "berlaku untuk semua"; aturan paling spesifik diutamakan (jenis kelamin terisi, lalu rentang usia
 * terisi, lalu nilai_min terbesar).
 *
 * [ENKAPSULASI] Daftar aturan private; dari luar hanya bisa memanggil cari().
 */
export class TabelAcuan {
  static readonly BELUM_TERSEDIA = 'Belum tersedia';

  constructor(private readonly aturan: readonly AturanKategori[]) {}

  cari(indikator: string, jenisKelamin: JenisKelamin | null, usia: number | null, nilai: number | null): string {
    if (nilai === null || !Number.isFinite(nilai)) return TabelAcuan.BELUM_TERSEDIA;
    const cocok = this.aturan.filter(
      (a) =>
        a.indikator === indikator &&
        (a.jenisKelamin === null || a.jenisKelamin === jenisKelamin) &&
        (a.usiaMin === null || (usia !== null && usia >= a.usiaMin)) &&
        (a.usiaMax === null || (usia !== null && usia <= a.usiaMax)) &&
        (a.nilaiMin === null || nilai >= a.nilaiMin) &&
        (a.nilaiMax === null || nilai <= a.nilaiMax),
    );
    cocok.sort(
      (a, b) =>
        Number(b.jenisKelamin !== null) - Number(a.jenisKelamin !== null) ||
        Number(b.usiaMin !== null || b.usiaMax !== null) - Number(a.usiaMin !== null || a.usiaMax !== null) ||
        (b.nilaiMin ?? -Infinity) - (a.nilaiMin ?? -Infinity),
    );
    return cocok[0]?.kategori ?? TabelAcuan.BELUM_TERSEDIA;
  }
}
