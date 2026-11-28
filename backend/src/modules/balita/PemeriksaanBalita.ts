import { randomUUID } from 'node:crypto';
import { DataPemeriksaan, Pemeriksaan, PemeriksaanJsonDasar } from '../pemeriksaan/Pemeriksaan';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Balita } from './Balita';
import { StandarAntropometri } from './StandarAntropometri';

/** Input SCR-05 Form Antropometri Balita (FSD-2.7). */
export interface PemeriksaanBalitaInput {
  tanggal_periksa: string;
  berat_badan: number;
  tinggi_panjang_badan: number;
  lila: number;
  lika: number;
}

/** BR-19: N = naik, T = tidak naik, B = baru pertama kali ditimbang. */
export type StatusBeratBadan = 'N' | 'T' | 'B';

export interface PemeriksaanBalitaProps extends DataPemeriksaan {
  beratBadan: number;
  tinggiPanjangBadan: number;
  lila: number;
  lika: number;
  statusBeratBadan: StatusBeratBadan;
  kategoriStunting: string;
  kategoriBbu: string;
  kategoriBbTb: string;
  kategoriLila: string;
  kategoriLika: string;
  /** z-score hanya ada saat baru dihitung (tidak disimpan di basis data). */
  zScore?: { bbu: number | null; tbu: number | null; bb_tb: number | null; lku: number | null };
}

/**
 * Pemeriksaan antropometri balita + hasil Pantau Gizi dan Stunting (FSD-2.7, FSD-2.8).
 *
 * [PEWARISAN] PemeriksaanBalita extends Pemeriksaan.
 * [DESIGN PATTERN: FACTORY METHOD] hitung() menghitung status BB dan kategori lalu membuat objek.
 */
export class PemeriksaanBalita extends Pemeriksaan {
  private static readonly LABEL_STATUS: Record<StatusBeratBadan, string> = {
    N: 'Naik',
    T: 'Tidak Naik',
    B: 'Pertama Kali Ditimbang',
  };

  private constructor(private readonly p: PemeriksaanBalitaProps) {
    super(p);
  }

  /**
   * FSD-2.8 Main Flow:
   * 1. umur (bulan) dari tanggal lahir terhadap tanggal pemeriksaan;
   * 2. status BB dibanding pemeriksaan sebelumnya (BR-19);
   * 3. kategori TB/U, BB/U, BB/PB-TB, lingkar kepala dari z-score Permenkes 2/2020 (StandarAntropometri);
   *    kategori LILA dari tabel acuan aturan_kategori (BR-20, BR-24).
   */
  static hitung(
    input: PemeriksaanBalitaInput,
    balita: Balita,
    bbSebelumnya: number | null,
    acuan: TabelAcuan,
    dicatatOleh: string,
  ): PemeriksaanBalita {
    const umur = balita.hitungUmur(input.tanggal_periksa);
    const jk = balita.jenisKelamin;
    const status: StatusBeratBadan = bbSebelumnya === null ? 'B' : input.berat_badan > bbSebelumnya ? 'N' : 'T';
    const k = StandarAntropometri.klasifikasi(jk, umur, input.berat_badan, input.tinggi_panjang_badan, input.lika);
    return new PemeriksaanBalita({
      id: randomUUID(),
      sasaranId: balita.id,
      tanggalPeriksa: input.tanggal_periksa,
      dicatatOleh,
      dibuatPada: null,
      beratBadan: input.berat_badan,
      tinggiPanjangBadan: input.tinggi_panjang_badan,
      lila: input.lila,
      lika: input.lika,
      statusBeratBadan: status,
      kategoriStunting: k.tbu.kategori,
      kategoriBbu: k.bbu.kategori,
      kategoriBbTb: k.bbTb.kategori,
      kategoriLila: acuan.cari('LILA balita', jk, umur, input.lila),
      kategoriLika: k.lku.kategori,
      zScore: { bbu: k.bbu.z, tbu: k.tbu.z, bb_tb: k.bbTb.z, lku: k.lku.z },
    });
  }

  static pulihkan(props: PemeriksaanBalitaProps): PemeriksaanBalita {
    return new PemeriksaanBalita(props);
  }

  get props(): Readonly<PemeriksaanBalitaProps> {
    return this.p;
  }

  /** [OVERRIDING] Aturan rujukan otomatis: BB/U di bawah garis merah atau di atas garis oranye KMS. */
  override get perluDirujuk(): boolean {
    return StandarAntropometri.perluDirujukDariKategori(this.p.kategoriBbu);
  }

  override get ringkasan(): string {
    const p = this.p;
    return (
      `BB ${p.beratBadan} kg, TB/PB ${p.tinggiPanjangBadan} cm, LILA ${p.lila} cm, LIKA ${p.lika} cm; ` +
      `BB/U ${p.kategoriBbu}, TB/U ${p.kategoriStunting}, BB/PB-TB ${p.kategoriBbTb}` +
      (this.perluDirujuk ? '; wajib dirujuk' : '')
    );
  }

  protected override get daftarKategori(): string[] {
    return [this.p.kategoriStunting, this.p.kategoriBbu, this.p.kategoriBbTb, this.p.kategoriLila, this.p.kategoriLika];
  }

  override toJSON(): PemeriksaanJsonDasar & Record<string, unknown> {
    return {
      ...super.toJSON(),
      berat_badan: this.p.beratBadan,
      tinggi_panjang_badan: this.p.tinggiPanjangBadan,
      lila: this.p.lila,
      lika: this.p.lika,
      status_berat_badan: this.p.statusBeratBadan,
      status_berat_badan_label: PemeriksaanBalita.LABEL_STATUS[this.p.statusBeratBadan],
      kategori_stunting: this.p.kategoriStunting,
      kategori_bbu: this.p.kategoriBbu,
      kategori_bb_tb: this.p.kategoriBbTb,
      kategori_lila: this.p.kategoriLila,
      kategori_lika: this.p.kategoriLika,
      ...(this.p.zScore ? { z_score: this.p.zScore } : {}),
      perlu_dirujuk: this.perluDirujuk,
    };
  }
}
