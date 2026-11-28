import { randomUUID } from 'node:crypto';
import { AppError } from '../../core/errors/AppError';
import { ValidationError } from '../../core/errors/ValidationError';
import { DataPemeriksaan, Pemeriksaan, PemeriksaanJsonDasar } from '../pemeriksaan/Pemeriksaan';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Ibu } from './Ibu';

/** Input SCR-09 Form Pemeriksaan Ibu (FSD-2.13, FSD-2.14). */
export interface PemeriksaanIbuInput {
  tanggal_periksa: string;
  berat_badan: number;
  lila: number;
  tekanan_darah_sistolik: number;
  tekanan_darah_diastolik: number;
  usia_kehamilan_minggu?: number | null;
  /** Wajib hanya untuk ibu hamil (kolom boleh NULL untuk ibu nifas/menyusui). */
  bb_sesuai_kurva_kia?: boolean | null;
  td_sesuai_kurva_kia?: boolean | null;
  hb?: number | null;
}

export interface PemeriksaanIbuProps extends DataPemeriksaan {
  beratBadan: number;
  lila: number;
  tdSistolik: number;
  tdDiastolik: number;
  usiaKehamilanMinggu: number | null;
  bbSesuaiKurvaKia: boolean | null;
  tdSesuaiKurvaKia: boolean | null;
  hb: number | null;
  statusKek: string;
  statusAnemia: string | null;
}

/**
 * Pemeriksaan fisik ibu + hasil Pantau KEK dan Anemia (FSD-2.13 s.d. 2.15).
 *
 * [PEWARISAN] PemeriksaanIbu extends Pemeriksaan.
 */
export class PemeriksaanIbu extends Pemeriksaan {
  private constructor(private readonly p: PemeriksaanIbuProps) {
    super(p);
  }

  static hitung(input: PemeriksaanIbuInput, ibu: Ibu, acuan: TabelAcuan, dicatatOleh: string): PemeriksaanIbu {
    // Usia kehamilan wajib bila status Hamil (sp_simpan_pemeriksaan_ibu versi MySQL)
    if (ibu.sedangHamil && (input.usia_kehamilan_minggu === null || input.usia_kehamilan_minggu === undefined)) {
      throw new ValidationError('ERR-VAL-01', 'usia_kehamilan_minggu');
    }
    // Kurva KIA (BB dan TD) wajib untuk ibu hamil saja
    if (ibu.sedangHamil) {
      const kosong = (['bb_sesuai_kurva_kia', 'td_sesuai_kurva_kia'] as const).filter(
        (f) => input[f] === null || input[f] === undefined,
      );
      if (kosong.length > 0) throw new ValidationError(kosong.map((field) => AppError.buatDetail('ERR-VAL-01', field)));
    }
    const hb = input.hb ?? null;
    return new PemeriksaanIbu({
      id: randomUUID(),
      sasaranId: ibu.id,
      tanggalPeriksa: input.tanggal_periksa,
      dicatatOleh,
      dibuatPada: null,
      beratBadan: input.berat_badan,
      lila: input.lila,
      tdSistolik: input.tekanan_darah_sistolik,
      tdDiastolik: input.tekanan_darah_diastolik,
      usiaKehamilanMinggu: input.usia_kehamilan_minggu ?? null,
      bbSesuaiKurvaKia: ibu.sedangHamil ? (input.bb_sesuai_kurva_kia ?? null) : null,
      tdSesuaiKurvaKia: ibu.sedangHamil ? (input.td_sesuai_kurva_kia ?? null) : null,
      hb,
      statusKek: acuan.cari('LILA ibu hamil', null, null, input.lila), // BR-21
      statusAnemia: hb === null ? null : acuan.cari('Hb', null, null, hb), // BR-16: hanya bila Hb terisi
    });
  }

  static pulihkan(props: PemeriksaanIbuProps): PemeriksaanIbu {
    return new PemeriksaanIbu(props);
  }

  get props(): Readonly<PemeriksaanIbuProps> {
    return this.p;
  }

  override get ringkasan(): string {
    const p = this.p;
    return (
      `BB ${p.beratBadan} kg, LILA ${p.lila} cm, TD ${p.tdSistolik}/${p.tdDiastolik} mmHg` +
      (p.hb !== null ? `, Hb ${p.hb} g/dL` : '') +
      `; KEK ${p.statusKek}` +
      (p.statusAnemia ? `, ${p.statusAnemia}` : '')
    );
  }

  protected override get daftarKategori(): (string | null)[] {
    return [this.p.statusKek, this.p.statusAnemia];
  }

  override toJSON(): PemeriksaanJsonDasar & Record<string, unknown> {
    return {
      ...super.toJSON(),
      berat_badan: this.p.beratBadan,
      lila: this.p.lila,
      tekanan_darah_sistolik: this.p.tdSistolik,
      tekanan_darah_diastolik: this.p.tdDiastolik,
      usia_kehamilan_minggu: this.p.usiaKehamilanMinggu,
      bb_sesuai_kurva_kia: this.p.bbSesuaiKurvaKia,
      td_sesuai_kurva_kia: this.p.tdSesuaiKurvaKia,
      hb: this.p.hb,
      status_kek: this.p.statusKek,
      status_anemia: this.p.statusAnemia,
    };
  }
}
