import { randomUUID } from 'node:crypto';
import { DataIdentitas, IdentitasInput, IdentitasJson, JenisKelamin, Kelompok, Sasaran } from '../sasaran/Sasaran';
import { SasaranDewasa } from '../sasaran/SasaranDewasa';

/** Input API Kelola Data Lansia (Data Elements FSD-2.19). */
export interface LansiaInput extends IdentitasInput {
  jenis_kelamin: JenisKelamin;
  status_perkawinan?: string | null;
}

export interface LansiaProps extends DataIdentitas {
  jenisKelamin: JenisKelamin;
  statusPerkawinan: string | null;
}

export interface LansiaJson extends IdentitasJson {
  jenis_kelamin: JenisKelamin;
  status_perkawinan: string | null;
}

/**
 * Entitas Lansia (FSD 5.1).
 *
 * [PEWARISAN] Lansia extends SasaranDewasa extends Sasaran (umur dalam tahun).
 */
export class Lansia extends SasaranDewasa {
  private _jenisKelamin: JenisKelamin;
  private _statusPerkawinan: string | null;

  private constructor(props: LansiaProps) {
    super(props);
    this._jenisKelamin = props.jenisKelamin;
    this._statusPerkawinan = props.statusPerkawinan;
  }

  /** [DESIGN PATTERN: FACTORY METHOD] */
  static buat(input: LansiaInput): Lansia {
    return new Lansia({
      ...Sasaran.identitasDariInput(randomUUID(), input),
      jenisKelamin: input.jenis_kelamin,
      statusPerkawinan: input.status_perkawinan ?? null,
    });
  }

  static pulihkan(props: LansiaProps): Lansia {
    return new Lansia(props);
  }

  override get kelompok(): Kelompok {
    return 'lansia';
  }

  override get jenisKelamin(): JenisKelamin {
    return this._jenisKelamin;
  }

  get statusPerkawinan(): string | null {
    return this._statusPerkawinan;
  }

  override terapkanPerubahan(input: Partial<LansiaInput>): void {
    this.perbaruiIdentitas(input);
    if (input.jenis_kelamin !== undefined) this._jenisKelamin = input.jenis_kelamin;
    if (input.status_perkawinan !== undefined) this._statusPerkawinan = input.status_perkawinan;
  }

  override toJSON(): LansiaJson {
    return {
      ...super.toJSON(),
      jenis_kelamin: this._jenisKelamin,
      status_perkawinan: this._statusPerkawinan,
    };
  }
}
