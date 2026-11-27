/** Kumpulan operasi tanggal berformat 'YYYY-MM-DD' di zona waktu Posyandu (WIB). */
export class Tanggal {
  private static readonly ZONA_WAKTU = 'Asia/Jakarta';
  /** Panjang teks 'YYYY-MM-DD'. */
  private static readonly PANJANG_TANGGAL = 10;
  static readonly BULAN_PER_TAHUN = 12;

  /** Tanggal hari ini (WIB). */
  static hariIni(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: Tanggal.ZONA_WAKTU }).format(new Date());
  }

  /** true bila teks berformat YYYY-MM-DD dan merupakan tanggal kalender yang valid. */
  static isValid(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, Tanggal.PANJANG_TANGGAL) === value;
  }

  /** Nilai tanggal dari basis data ('YYYY-MM-DD ...') menjadi 'YYYY-MM-DD'. */
  static dariDb(nilai: unknown): string {
    return String(nilai).slice(0, Tanggal.PANJANG_TANGGAL);
  }

  static dariDbAtauNull(nilai: unknown): string | null {
    return nilai === null || nilai === undefined ? null : Tanggal.dariDb(nilai);
  }

  /** Selisih bulan penuh dari tanggal awal sampai tanggal akhir. */
  static selisihBulan(awal: string, akhir: string): number {
    const [ay, am, ad] = awal.split('-').map(Number);
    const [by, bm, bd] = akhir.split('-').map(Number);
    let bulan = (by - ay) * Tanggal.BULAN_PER_TAHUN + (bm - am);
    if (bd < ad) bulan -= 1;
    return Math.max(bulan, 0);
  }

  /** Selisih tahun penuh dari tanggal awal sampai tanggal akhir. */
  static selisihTahun(awal: string, akhir: string): number {
    return Math.floor(Tanggal.selisihBulan(awal, akhir) / Tanggal.BULAN_PER_TAHUN);
  }
}
