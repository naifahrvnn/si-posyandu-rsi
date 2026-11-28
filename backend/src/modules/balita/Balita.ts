import { randomUUID } from 'node:crypto';
import { Tanggal } from '../../core/Tanggal';
import { DataIdentitas, IdentitasInput, IdentitasJson, JenisKelamin, Kelompok, Sasaran } from '../sasaran/Sasaran';

/** Input API Kelola Data Balita (Data Elements FSD-2.6). */
export interface BalitaInput extends IdentitasInput {
  jenis_kelamin: JenisKelamin;
  berat_lahir: number;
  panjang_lahir: number;
  nama_orang_tua: string;
}

export interface BalitaProps extends DataIdentitas {
  jenisKelamin: JenisKelamin;
  beratLahir: number;
  panjangLahir: number;
  namaOrangTua: string;
}

export interface BalitaJson extends IdentitasJson {
  jenis_kelamin: JenisKelamin;
  berat_lahir: number;
  panjang_lahir: number;
  nama_orang_tua: string;
}

/**
 * Entitas Balita (FSD 5.1), subclass WARGA pada EER.
 *
 * [PEWARISAN] Balita extends Sasaran.
 * [ENKAPSULASI] Atribut khusus balita private; constructor private, objek dibuat lewat factory method.
 * [OVERRIDING] hitungUmur() dalam bulan (BR-10), toJSON() menambah isian balita ke super.toJSON().
 */
export class Balita extends Sasaran {
  private _jenisKelamin: JenisKelamin;
  private _beratLahir: number;
  private _panjangLahir: number;
  private _namaOrangTua: string;

  private constructor(props: BalitaProps) {
    super(props);
    this._jenisKelamin = props.jenisKelamin;
    this._beratLahir = props.beratLahir;
    this._panjangLahir = props.panjangLahir;
    this._namaOrangTua = props.namaOrangTua;
  }

  /** [DESIGN PATTERN: FACTORY METHOD] Balita baru dari input registrasi. */
  static buat(input: BalitaInput): Balita {
    return new Balita({
      ...Sasaran.identitasDariInput(randomUUID(), input),
      jenisKelamin: input.jenis_kelamin,
      beratLahir: input.berat_lahir,
      panjangLahir: input.panjang_lahir,
      namaOrangTua: input.nama_orang_tua,
    });
  }

  /** Membangun kembali balita dari data tersimpan. */
  static pulihkan(props: BalitaProps): Balita {
    return new Balita(props);
  }

  override get kelompok(): Kelompok {
    return 'balita';
  }

  override get jenisKelamin(): JenisKelamin {
    return this._jenisKelamin;
  }

  get beratLahir(): number {
    return this._beratLahir;
  }

  get panjangLahir(): number {
    return this._panjangLahir;
  }

  get namaOrangTua(): string {
    return this._namaOrangTua;
  }

  /** [OVERRIDING] BR-10: umur balita dalam bulan penuh. */
  override hitungUmur(tanggalAcuan: string = Tanggal.hariIni()): number {
    return Tanggal.selisihBulan(this.tanggalLahir, tanggalAcuan);
  }

  override get satuanUmur(): 'bulan' {
    return 'bulan';
  }

  override terapkanPerubahan(input: Partial<BalitaInput>): void {
    this.perbaruiIdentitas(input);
    if (input.jenis_kelamin !== undefined) this._jenisKelamin = input.jenis_kelamin;
    if (input.berat_lahir !== undefined) this._beratLahir = input.berat_lahir;
    if (input.panjang_lahir !== undefined) this._panjangLahir = input.panjang_lahir;
    if (input.nama_orang_tua !== undefined) this._namaOrangTua = input.nama_orang_tua;
  }

  override toJSON(): BalitaJson {
    return {
      ...super.toJSON(),
      jenis_kelamin: this._jenisKelamin,
      berat_lahir: this._beratLahir,
      panjang_lahir: this._panjangLahir,
      nama_orang_tua: this._namaOrangTua,
    };
  }
}
