import { randomUUID } from 'node:crypto';
import { AppError } from '../../core/errors/AppError';
import { ErrorDetail } from '../../core/errors/ErrorCatalog';
import { ValidationError } from '../../core/errors/ValidationError';
import { DataPemeriksaan, Pemeriksaan, PemeriksaanJsonDasar } from '../pemeriksaan/Pemeriksaan';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Lansia } from './Lansia';

export type HasilTes = 'Normal' | 'Gangguan';

/** Input SCR-13 Form Pemeriksaan Lansia (FSD-2.20 dan FSD-2.21 dalam satu formulir). */
export interface PemeriksaanLansiaInput {
  tanggal_periksa: string;
  berat_badan: number;
  tinggi_badan: number;
  lingkar_perut: number;
  tekanan_darah_sistolik: number;
  tekanan_darah_diastolik: number;
  gula_darah: number;
  hitung_jari_kanan?: HasilTes | null;
  hitung_jari_kiri?: HasilTes | null;
  berbisik_kanan?: HasilTes | null;
  berbisik_kiri?: HasilTes | null;
  merokok?: boolean | null;
  /** Rata-rata batang rokok per hari (kuesioner PUMA). */
  rokok_per_hari?: number | null;
  /** Lama merokok dalam tahun (kuesioner PUMA). */
  lama_merokok_tahun?: number | null;
  puma_gejala_1?: boolean | null;
  puma_gejala_2?: boolean | null;
  puma_gejala_3?: boolean | null;
  puma_gejala_4?: boolean | null;
}

export interface PemeriksaanLansiaProps extends DataPemeriksaan {
  beratBadan: number;
  tinggiBadan: number;
  lingkarPerut: number;
  imt: number;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  gulaDarah: number | null;
  hitungJariKanan: HasilTes | null;
  hitungJariKiri: HasilTes | null;
  berbisikKanan: HasilTes | null;
  berbisikKiri: HasilTes | null;
  merokok: boolean | null;
  bungkusPerTahun: number | null;
  pumaGejala: [boolean | null, boolean | null, boolean | null, boolean | null];
  kategoriImt: string | null;
  kategoriTekananDarah: string | null;
  kategoriGulaDarah: string | null;
  skorPuma: number | null;
}

/**
 * Pemeriksaan lansia + hasil Pantau Risiko Penyakit (FSD-2.20 s.d. 2.22).
 *
 * [PEWARISAN] PemeriksaanLansia extends Pemeriksaan.
 */
export class PemeriksaanLansia extends Pemeriksaan {
  /** BR-18: skor PUMA lebih dari 6 (>= 7) ditandai sebagai dasar kader untuk merujuk ke FKTP. */
  static readonly BATAS_RUJUK_PUMA = 6;
  /** Ambang komponen skor PUMA sesuai lampiran kuesioner. */
  private static readonly PUMA = {
    USIA_MIN: 40, // di bawah ini tidak diskrining
    USIA_SKOR_1: 50, // 50-60 tahun = 1
    USIA_SKOR_2_DI_ATAS: 60, // di atas 60 tahun = 2
    PACK_YEARS_SKOR_1: 20, // 20-30 pack years = 1
    PACK_YEARS_SKOR_2_DI_ATAS: 30, // di atas 30 pack years = 2
    BATANG_PER_BUNGKUS: 20,
  } as const;
  private static readonly CM_PER_METER = 100;

  /** Pembulatan satu angka desimal, mis. 22.83 -> 22.8. */
  private static bulatSatuDesimal(n: number): number {
    return Math.round(n * 10) / 10;
  }

  private constructor(private readonly p: PemeriksaanLansiaProps) {
    super(p);
  }

  /** BR-17: IMT = BB (kg) / (TB m)^2, dibulatkan satu angka desimal. */
  static hitungImt(beratBadan: number, tinggiBadanCm: number): number {
    const tinggiMeter = tinggiBadanCm / PemeriksaanLansia.CM_PER_METER;
    return PemeriksaanLansia.bulatSatuDesimal(beratBadan / (tinggiMeter * tinggiMeter));
  }

  /**
   * Kuesioner PUMA: Pack years = lama merokok (tahun) x jumlah batang per hari / 20,
   * dibulatkan satu angka desimal. Hasil disimpan pada kolom bungkus_per_tahun.
   */
  static hitungPackYears(rokokPerHari: number, lamaMerokokTahun: number): number {
    return PemeriksaanLansia.bulatSatuDesimal((lamaMerokokTahun * rokokPerHari) / PemeriksaanLansia.PUMA.BATANG_PER_BUNGKUS);
  }

  /**
   * BR-18 / kuesioner PUMA: JK (P 0, L 1) + usia (40-49 0, 50-60 1, > 60 2; sesuai lampiran kuesioner)
   * + pack years (< 20 0, 20-30 1, > 30 2) + 4 pertanyaan gejala (Ya 1).
   * Hanya bila usia >= 40 tahun dan merokok; selain itu null.
   */
  static hitungSkorPuma(
    jenisKelamin: string,
    usia: number,
    merokok: boolean | null | undefined,
    bungkusPerTahun: number | null | undefined,
    gejala: (boolean | null | undefined)[],
  ): number | null {
    const A = PemeriksaanLansia.PUMA;
    if (usia < A.USIA_MIN || merokok !== true) return null;
    const packYears = bungkusPerTahun ?? 0;
    const skorJenisKelamin = jenisKelamin === 'Laki-laki' ? 1 : 0;
    const skorUsia = usia > A.USIA_SKOR_2_DI_ATAS ? 2 : usia >= A.USIA_SKOR_1 ? 1 : 0;
    const skorPackYears = packYears > A.PACK_YEARS_SKOR_2_DI_ATAS ? 2 : packYears >= A.PACK_YEARS_SKOR_1 ? 1 : 0;
    const skorGejala = gejala.filter((g) => g === true).length; // tiap jawaban Ya = 1
    return skorJenisKelamin + skorUsia + skorPackYears + skorGejala;
  }

  static hitung(input: PemeriksaanLansiaInput, lansia: Lansia, acuan: TabelAcuan, dicatatOleh: string): PemeriksaanLansia {
    const usia = lansia.hitungUmur(input.tanggal_periksa);
    const gejala = [input.puma_gejala_1, input.puma_gejala_2, input.puma_gejala_3, input.puma_gejala_4];

    // FSD-2.21 EF-3: merokok Ya pada usia >= 40 tahun -> isian PUMA wajib lengkap (ERR-VAL-01)
    if (usia >= PemeriksaanLansia.PUMA.USIA_MIN && input.merokok === true) {
      const kosong: ErrorDetail[] = [];
      for (const field of ['rokok_per_hari', 'lama_merokok_tahun'] as const) {
        if (input[field] === null || input[field] === undefined) kosong.push(AppError.buatDetail('ERR-VAL-01', field));
      }
      gejala.forEach((g, i) => {
        if (g === null || g === undefined) kosong.push(AppError.buatDetail('ERR-VAL-01', `puma_gejala_${i + 1}`));
      });
      if (kosong.length > 0) throw new ValidationError(kosong);
    }

    const jk = lansia.jenisKelamin;
    const imt = PemeriksaanLansia.hitungImt(input.berat_badan, input.tinggi_badan);
    const merokok = input.merokok ?? null;
    const packYears =
      merokok === true && input.rokok_per_hari != null && input.lama_merokok_tahun != null
        ? PemeriksaanLansia.hitungPackYears(input.rokok_per_hari, input.lama_merokok_tahun)
        : null;
    return new PemeriksaanLansia({
      id: randomUUID(),
      sasaranId: lansia.id,
      tanggalPeriksa: input.tanggal_periksa,
      dicatatOleh,
      dibuatPada: null,
      beratBadan: input.berat_badan,
      tinggiBadan: input.tinggi_badan,
      lingkarPerut: input.lingkar_perut,
      imt,
      tdSistolik: input.tekanan_darah_sistolik,
      tdDiastolik: input.tekanan_darah_diastolik,
      gulaDarah: input.gula_darah,
      hitungJariKanan: input.hitung_jari_kanan ?? null,
      hitungJariKiri: input.hitung_jari_kiri ?? null,
      berbisikKanan: input.berbisik_kanan ?? null,
      berbisikKiri: input.berbisik_kiri ?? null,
      merokok,
      bungkusPerTahun: packYears,
      pumaGejala: [gejala[0] ?? null, gejala[1] ?? null, gejala[2] ?? null, gejala[3] ?? null],
      kategoriImt: acuan.cari('IMT lansia', jk, usia, imt),
      kategoriTekananDarah: acuan.cari('Tekanan darah', jk, usia, input.tekanan_darah_sistolik),
      kategoriGulaDarah: acuan.cari('Gula darah', jk, usia, input.gula_darah),
      skorPuma: PemeriksaanLansia.hitungSkorPuma(jk, usia, merokok, packYears, gejala),
    });
  }

  static pulihkan(props: PemeriksaanLansiaProps): PemeriksaanLansia {
    return new PemeriksaanLansia(props);
  }

  get props(): Readonly<PemeriksaanLansiaProps> {
    return this.p;
  }

  override get ringkasan(): string {
    const p = this.p;
    return (
      `BB ${p.beratBadan} kg, TB ${p.tinggiBadan} cm, IMT ${p.imt} (${p.kategoriImt ?? '-'}), ` +
      `TD ${p.tdSistolik ?? '-'}/${p.tdDiastolik ?? '-'} (${p.kategoriTekananDarah ?? '-'}), gula darah ${p.gulaDarah ?? '-'}` +
      (p.skorPuma !== null ? `; skor PUMA ${p.skorPuma}` : '')
    );
  }

  protected override get daftarKategori(): (string | null)[] {
    return [this.p.kategoriImt, this.p.kategoriTekananDarah, this.p.kategoriGulaDarah];
  }

  override toJSON(): PemeriksaanJsonDasar & Record<string, unknown> {
    const [g1, g2, g3, g4] = this.p.pumaGejala;
    return {
      ...super.toJSON(),
      berat_badan: this.p.beratBadan,
      tinggi_badan: this.p.tinggiBadan,
      lingkar_perut: this.p.lingkarPerut,
      imt: this.p.imt,
      tekanan_darah_sistolik: this.p.tdSistolik,
      tekanan_darah_diastolik: this.p.tdDiastolik,
      gula_darah: this.p.gulaDarah,
      hitung_jari_kanan: this.p.hitungJariKanan,
      hitung_jari_kiri: this.p.hitungJariKiri,
      berbisik_kanan: this.p.berbisikKanan,
      berbisik_kiri: this.p.berbisikKiri,
      merokok: this.p.merokok,
      bungkus_per_tahun: this.p.bungkusPerTahun,
      puma_gejala_1: g1,
      puma_gejala_2: g2,
      puma_gejala_3: g3,
      puma_gejala_4: g4,
      kategori_imt: this.p.kategoriImt,
      kategori_tekanan_darah: this.p.kategoriTekananDarah,
      kategori_gula_darah: this.p.kategoriGulaDarah,
      skor_puma: this.p.skorPuma,
      perlu_rujuk_puma: this.p.skorPuma !== null && this.p.skorPuma > PemeriksaanLansia.BATAS_RUJUK_PUMA,
    };
  }
}
