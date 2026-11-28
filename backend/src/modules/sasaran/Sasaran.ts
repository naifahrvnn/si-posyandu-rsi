import { Alamat, DataAlamat } from './Alamat';

export type Kelompok = 'balita' | 'ibu' | 'lansia';
export type JenisKelamin = 'Laki-laki' | 'Perempuan';
export const HUBUNGAN_KELUARGA = ['Kepala Keluarga', 'Istri', 'Anak', 'Famili Lain'] as const;
export type HubunganKeluarga = (typeof HUBUNGAN_KELUARGA)[number];

/** Identitas sasaran = data superclass WARGA + alamat dari KARTU_KELUARGA. */
export interface DataIdentitas {
  id: string;
  noKk: string;
  nik: string;
  nama: string;
  tanggalLahir: string;
  hubunganKeluarga: HubunganKeluarga;
  pekerjaan: string | null;
  kontak: string | null;
  alamat: DataAlamat;
  dibuatPada: string | null;
  diubahPada: string | null;
}

/**
 * Isian identitas dari API. Kolom alamat hanya dipakai bila no_kk belum terdaftar
 * (kartu_keluarga baru dibuat); bila KK sudah ada, alamat diambil dari KK.
 */
export interface IdentitasInput {
  no_kk: string;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  hubungan_keluarga: HubunganKeluarga;
  pekerjaan?: string | null;
  kontak?: string | null;
  alamat?: string | null;
  dusun?: string | null;
  rt?: string | null;
  rw?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
}

export interface IdentitasJson extends DataAlamat {
  id: string;
  kelompok: Kelompok;
  no_kk: string;
  nik: string;
  nama: string;
  tanggal_lahir: string;
  hubungan_keluarga: HubunganKeluarga;
  pekerjaan: string | null;
  kontak: string | null;
  dusun_rt_rw: string;
  umur: number;
  satuan_umur: 'bulan' | 'tahun';
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Kelas dasar (abstract) untuk sasaran Posyandu. Mengikuti EER: WARGA (superclass) -> BALITA / IBU / LANSIA.
 *
 * [ABSTRAKSI] Objek Sasaran tidak bisa dibuat langsung; yang dibuat Balita, Ibu, atau Lansia.
 * [ENKAPSULASI] Semua atribut private, dibaca lewat getter, diubah lewat perbaruiIdentitas() (protected).
 * [KOMPOSISI] Sasaran membuat objek Alamat-nya sendiri di constructor.
 * [POLIMORFISME] kelompok, jenisKelamin, hitungUmur(), dan satuanUmur diisi tiap subclass dengan cara berbeda.
 */
export abstract class Sasaran {
  private readonly _id: string;
  private _noKk: string;
  private _nik: string;
  private _nama: string;
  private _tanggalLahir: string;
  private _hubunganKeluarga: HubunganKeluarga;
  private _pekerjaan: string | null;
  private _kontak: string | null;
  private readonly _alamat: Alamat;
  private readonly _dibuatPada: string | null;
  private readonly _diubahPada: string | null;

  protected constructor(data: DataIdentitas) {
    this._id = data.id;
    this._noKk = data.noKk;
    this._nik = data.nik;
    this._nama = data.nama;
    this._tanggalLahir = data.tanggalLahir;
    this._hubunganKeluarga = data.hubunganKeluarga;
    this._pekerjaan = data.pekerjaan;
    this._kontak = data.kontak;
    this._alamat = new Alamat(data.alamat); // [KOMPOSISI]
    this._dibuatPada = data.dibuatPada;
    this._diubahPada = data.diubahPada;
  }

  /** Data identitas dari input registrasi (dipakai factory method subclass). */
  protected static identitasDariInput(id: string, input: IdentitasInput): DataIdentitas {
    return {
      id,
      noKk: input.no_kk,
      nik: input.nik,
      nama: input.nama,
      tanggalLahir: input.tanggal_lahir,
      hubunganKeluarga: input.hubungan_keluarga,
      pekerjaan: input.pekerjaan ?? null,
      kontak: input.kontak ?? null,
      alamat: {
        alamat: input.alamat ?? '',
        dusun: input.dusun ?? '',
        rt: input.rt ?? '',
        rw: input.rw ?? '',
        desa: input.desa ?? '',
        kecamatan: input.kecamatan ?? '',
      },
      dibuatPada: null,
      diubahPada: null,
    };
  }

  abstract get kelompok(): Kelompok;
  abstract get jenisKelamin(): JenisKelamin;
  abstract get satuanUmur(): 'bulan' | 'tahun';
  /** BR-10: umur dihitung dari tanggal lahir terhadap tanggal acuan (default hari ini). */
  abstract hitungUmur(tanggalAcuan?: string): number;

  get id(): string {
    return this._id;
  }

  get noKk(): string {
    return this._noKk;
  }

  get nik(): string {
    return this._nik;
  }

  get nama(): string {
    return this._nama;
  }

  get tanggalLahir(): string {
    return this._tanggalLahir;
  }

  get hubunganKeluarga(): HubunganKeluarga {
    return this._hubunganKeluarga;
  }

  get pekerjaan(): string | null {
    return this._pekerjaan;
  }

  get kontak(): string | null {
    return this._kontak;
  }

  get alamat(): Alamat {
    return this._alamat;
  }

  /** Mengubah identitas dari input API (AF-1 Ubah data). Alamat mengikuti KK, tidak diubah di sini. */
  protected perbaruiIdentitas(input: Partial<IdentitasInput>): void {
    if (input.no_kk !== undefined) this._noKk = input.no_kk;
    if (input.nik !== undefined) this._nik = input.nik;
    if (input.nama !== undefined) this._nama = input.nama;
    if (input.tanggal_lahir !== undefined) this._tanggalLahir = input.tanggal_lahir;
    if (input.hubungan_keluarga !== undefined) this._hubunganKeluarga = input.hubungan_keluarga;
    if (input.pekerjaan !== undefined) this._pekerjaan = input.pekerjaan;
    if (input.kontak !== undefined) this._kontak = input.kontak;
  }

  /** Subclass menimpa method ini lalu memanggil perbaruiIdentitas() untuk isian bersama. */
  abstract terapkanPerubahan(input: object): void;

  /** Bentuk JSON identitas. Subclass meng-override untuk menambah isiannya sendiri. */
  toJSON(): IdentitasJson {
    return {
      id: this._id,
      kelompok: this.kelompok,
      no_kk: this._noKk,
      nik: this._nik,
      nama: this._nama,
      tanggal_lahir: this._tanggalLahir,
      hubungan_keluarga: this._hubunganKeluarga,
      pekerjaan: this._pekerjaan,
      kontak: this._kontak,
      ...this._alamat.toJSON(),
      umur: this.hitungUmur(),
      satuan_umur: this.satuanUmur,
      created_at: this._dibuatPada,
      updated_at: this._diubahPada,
    };
  }
}
