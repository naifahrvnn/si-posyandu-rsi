import { TabelAcuan } from './TabelAcuan';

/** Data yang dimiliki setiap catatan pemeriksaan. */
export interface DataPemeriksaan {
  id: string;
  sasaranId: string;
  tanggalPeriksa: string;
  dicatatOleh: string;
  dibuatPada: string | null;
}

export interface PemeriksaanJsonDasar {
  id: string;
  sasaran_id: string;
  tanggal_periksa: string;
  created_at: string | null;
}

/**
 * Kelas dasar (abstract) catatan pemeriksaan (FSD-2.7, 2.13, 2.20).
 * Setiap pemeriksaan disimpan sebagai catatan baru dan tidak menimpa riwayat (BR-12).
 *
 * [ABSTRAKSI] PemeriksaanBalita, PemeriksaanIbu, PemeriksaanLansia mewarisi kelas ini.
 * [POLIMORFISME] daftarKategori dan toJSON() diisi tiap subclass; service cukup memanggilnya
 *               untuk memeriksa apakah ada kategori yang belum tersedia (ERR-DATA-02).
 * [ENKAPSULASI] Atribut private + readonly: catatan pemeriksaan tidak diubah setelah dibuat.
 */
export abstract class Pemeriksaan {
  private readonly _id: string;
  private readonly _sasaranId: string;
  private readonly _tanggalPeriksa: string;
  private readonly _dicatatOleh: string;
  private readonly _dibuatPada: string | null;

  protected constructor(data: DataPemeriksaan) {
    this._id = data.id;
    this._sasaranId = data.sasaranId;
    this._tanggalPeriksa = data.tanggalPeriksa;
    this._dicatatOleh = data.dicatatOleh;
    this._dibuatPada = data.dibuatPada;
  }

  get id(): string {
    return this._id;
  }

  get sasaranId(): string {
    return this._sasaranId;
  }

  get tanggalPeriksa(): string {
    return this._tanggalPeriksa;
  }

  get dicatatOleh(): string {
    return this._dicatatOleh;
  }

  /**
   * Ringkasan hasil untuk detail log aktivitas (audit trail).
   * [ABSTRAKSI / OVERRIDING] Setiap subclass menyusun ringkasannya sendiri.
   */
  abstract get ringkasan(): string;

  /** Semua kategori hasil perhitungan pada pemeriksaan ini. */
  protected abstract get daftarKategori(): (string | null)[];

  /** ERR-DATA-02: ada kategori yang tidak bisa dihitung (data belum lengkap / di luar tabel acuan). */
  get adaKategoriBelumTersedia(): boolean {
    return this.daftarKategori.some((k) => k === TabelAcuan.BELUM_TERSEDIA);
  }

  /**
   * Apakah hasil pemeriksaan ini mewajibkan rujukan ke faskes.
   * Bawaan: tidak. [OVERRIDING] PemeriksaanBalita menimpanya dengan aturan garis KMS.
   */
  get perluDirujuk(): boolean {
    return false;
  }

  toJSON(): PemeriksaanJsonDasar {
    return {
      id: this._id,
      sasaran_id: this._sasaranId,
      tanggal_periksa: this._tanggalPeriksa,
      created_at: this._dibuatPada,
    };
  }
}
