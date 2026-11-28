import { randomUUID } from 'node:crypto';
import { DataIdentitas, IdentitasInput, IdentitasJson, JenisKelamin, Kelompok, Sasaran } from '../sasaran/Sasaran';
import { SasaranDewasa } from '../sasaran/SasaranDewasa';

export const STATUS_IBU = ['Hamil', 'Nifas', 'Menyusui'] as const;
export type StatusIbu = (typeof STATUS_IBU)[number];

/** Input API Kelola Data Ibu (Data Elements FSD-2.12). */
export interface IbuInput extends IdentitasInput {
  status_ibu: StatusIbu;
  nama_suami: string;
  kehamilan_ke?: number | null;
}

export interface IbuProps extends DataIdentitas {
  statusIbu: StatusIbu;
  namaSuami: string;
  kehamilanKe: number | null;
}

export interface IbuJson extends IdentitasJson {
  jenis_kelamin: JenisKelamin;
  status_ibu: StatusIbu;
  nama_suami: string;
  kehamilan_ke: number | null;
}

/**
 * Entitas Ibu hamil/nifas/menyusui (FSD 5.1).
 *
 * [PEWARISAN] Ibu extends SasaranDewasa extends Sasaran (umur dalam tahun).
 * [OVERRIDING] jenisKelamin selalu 'Perempuan'; toJSON() menambah isian khusus ibu.
 */
export class Ibu extends SasaranDewasa {
  private _statusIbu: StatusIbu;
  private _namaSuami: string;
  private _kehamilanKe: number | null;

  private constructor(props: IbuProps) {
    super(props);
    this._statusIbu = props.statusIbu;
    this._namaSuami = props.namaSuami;
    this._kehamilanKe = props.kehamilanKe;
  }

  /** [DESIGN PATTERN: FACTORY METHOD] */
  static buat(input: IbuInput): Ibu {
    return new Ibu({
      ...Sasaran.identitasDariInput(randomUUID(), input),
      statusIbu: input.status_ibu,
      namaSuami: input.nama_suami,
      kehamilanKe: input.kehamilan_ke ?? null,
    });
  }

  static pulihkan(props: IbuProps): Ibu {
    return new Ibu(props);
  }

  override get kelompok(): Kelompok {
    return 'ibu';
  }

  override get jenisKelamin(): JenisKelamin {
    return 'Perempuan';
  }

  get statusIbu(): StatusIbu {
    return this._statusIbu;
  }

  get namaSuami(): string {
    return this._namaSuami;
  }

  get kehamilanKe(): number | null {
    return this._kehamilanKe;
  }

  /** Usia kehamilan wajib diisi pada pemeriksaan bila status Hamil (FSD-2.13). */
  get sedangHamil(): boolean {
    return this._statusIbu === 'Hamil';
  }

  override terapkanPerubahan(input: Partial<IbuInput>): void {
    this.perbaruiIdentitas(input);
    if (input.status_ibu !== undefined) this._statusIbu = input.status_ibu;
    if (input.nama_suami !== undefined) this._namaSuami = input.nama_suami;
    if (input.kehamilan_ke !== undefined) this._kehamilanKe = input.kehamilan_ke;
  }

  override toJSON(): IbuJson {
    return {
      ...super.toJSON(),
      jenis_kelamin: this.jenisKelamin,
      status_ibu: this._statusIbu,
      nama_suami: this._namaSuami,
      kehamilan_ke: this._kehamilanKe,
    };
  }
}
