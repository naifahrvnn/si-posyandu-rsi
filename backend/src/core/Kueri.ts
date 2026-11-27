import sql from 'mssql';

/** Nilai parameter yang boleh dikirim ke query. */
export type NilaiParameter = string | number | boolean | null | undefined;
export type Parameter = Record<string, NilaiParameter>;
export type Baris = Record<string, unknown>;

/**
 * Pembungkus query SQL Server untuk pool atau transaksi.
 *
 * [ENKAPSULASI] Detail library mssql (Request, tipe parameter, konversi tanggal) disembunyikan di sini,
 *               jadi repository cukup menulis SQL dengan parameter @nama (AC-14).
 * [ASINKRON] Satu transaksi SQL Server hanya bisa menjalankan satu query dalam satu waktu,
 *            jadi query yang dipanggil bersamaan dijalankan bergiliran lewat antrean.
 */
export class Kueri {
  /** Tipe parameter teks dan desimal; 4000 = panjang NVARCHAR terbesar sebelum MAX. */
  private static readonly TEKS = sql.NVarChar(4000);
  private static readonly DESIMAL = sql.Decimal(9, 2);
  /** Panjang teks 'YYYY-MM-DD HH:mm:ss'. */
  private static readonly PANJANG_WAKTU = 19;

  private antrean: Promise<unknown> = Promise.resolve();

  constructor(private readonly sumber: sql.ConnectionPool | sql.Transaction) {}

  /** SELECT: mengembalikan semua baris. */
  pilih<T extends Baris = Baris>(teks: string, parameter: Parameter = {}): Promise<T[]> {
    return this.bergiliran(async () => {
      const hasil = await this.buatRequest(parameter).query(teks);
      return (hasil.recordset ?? []).map((baris) => Kueri.rapikan(baris) as T);
    });
  }

  /** SELECT satu baris, atau null. */
  async satu<T extends Baris = Baris>(teks: string, parameter: Parameter = {}): Promise<T | null> {
    const baris = await this.pilih<T>(teks, parameter);
    return baris[0] ?? null;
  }

  /** INSERT / UPDATE / DELETE: mengembalikan jumlah baris yang berubah pada perintah pertama. */
  jalankan(teks: string, parameter: Parameter = {}): Promise<number> {
    return this.bergiliran(async () => {
      const hasil = await this.buatRequest(parameter).query(teks);
      return hasil.rowsAffected[0] ?? 0;
    });
  }

  private bergiliran<T>(kerja: () => Promise<T>): Promise<T> {
    const hasil = this.antrean.then(kerja);
    this.antrean = hasil.catch(() => undefined);
    return hasil;
  }

  private buatRequest(parameter: Parameter): sql.Request {
    const r = new sql.Request(this.sumber as sql.ConnectionPool);
    for (const [nama, nilai] of Object.entries(parameter)) {
      if (nilai === null || nilai === undefined) r.input(nama, Kueri.TEKS, null);
      else if (typeof nilai === 'boolean') r.input(nama, sql.Bit, nilai);
      else if (typeof nilai === 'number') {
        r.input(nama, Number.isInteger(nilai) ? sql.Int : Kueri.DESIMAL, nilai);
      } else r.input(nama, Kueri.TEKS, nilai);
    }
    return r;
  }

  /** Tanggal dari SQL Server diubah menjadi teks 'YYYY-MM-DD HH:mm:ss' (zona waktu tidak digeser). */
  private static rapikan(baris: Baris): Baris {
    const hasil: Baris = {};
    for (const [kunci, nilai] of Object.entries(baris)) {
      hasil[kunci] = nilai instanceof Date ? nilai.toISOString().slice(0, Kueri.PANJANG_WAKTU).replace('T', ' ') : nilai;
    }
    return hasil;
  }
}
