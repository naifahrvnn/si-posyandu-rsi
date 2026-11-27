import { JenisKelamin } from '../sasaran/Sasaran';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import tabel from './standar-who.json';

/** Indikator antropometri anak (Permenkes No. 2 Tahun 2020). */
export type IndikatorAnak = 'BB/U' | 'TB/U' | 'BB/PB' | 'BB/TB' | 'LK/U';

/** Satu baris LMS: [umur bulan atau panjang/tinggi cm, L, M, S]. */
type BarisLms = [number, number, number, number];

export interface HasilIndikator {
  z: number | null;
  kategori: string;
}

/**
 * Klasifikasi status gizi balita dengan z-score (SD) WHO Child Growth Standards,
 * sesuai Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak (grafik KMS / Buku KIA).
 *
 * Ambang kategori:
 * - BB/U  : < -3 SD sangat kurang; -3 s.d. < -2 kurang; -2 s.d. +1 normal; > +1 risiko berat badan lebih.
 * - BB/PB, BB/TB : < -3 gizi buruk; -3 s.d. < -2 gizi kurang; -2 s.d. +1 gizi baik; > +1 s.d. +2 berisiko
 *                  gizi lebih; > +2 s.d. +3 gizi lebih; > +3 obesitas.
 * - LK/U  : < -2 mikrosefali; -2 s.d. +2 normal; > +2 makrosefali.
 * - TB/U  : < -3 sangat pendek; -3 s.d. < -2 pendek; -2 s.d. +3 normal; > +3 tinggi
 *           (tidak ada di foto acuan; diambil dari Permenkes 2/2020, masuk usulan revisi FSD).
 *
 * Aturan rujukan balita: posisi BB/U di bawah garis merah (-2 SD) atau di atas garis oranye (+1 SD)
 * pada KMS -> wajib dirujuk.
 *
 * [ENKAPSULASI] Tabel LMS dan rumus z-score private; dari luar hanya klasifikasi().
 */
export class StandarAntropometri {
  /** Garis simpangan baku (SD) pada grafik KMS / Permenkes 2/2020. */
  private static readonly SD = { MIN_3: -3, MIN_2: -2, PLUS_1: 1, PLUS_2: 2, PLUS_3: 3 } as const;
  static readonly GARIS_MERAH = StandarAntropometri.SD.MIN_2;
  static readonly GARIS_ORANYE = StandarAntropometri.SD.PLUS_1;
  /** Ketelitian: z-score 2 desimal, panjang/tinggi acuan BB/PB-TB 1 desimal. */
  private static readonly DESIMAL_Z = 100;
  private static readonly DESIMAL_CM = 10;
  /** Umur 24 bulan ke atas diukur berdiri (tinggi badan), di bawahnya berbaring (panjang badan). */
  private static readonly BATAS_BERDIRI = 24;
  private static readonly UMUR_MAKS = 60;

  private static readonly data = tabel.data as unknown as Record<IndikatorAnak, Record<JenisKelamin, BarisLms[]>>;

  /** Rumus LMS WHO; untuk indikator berbasis berat, |z| > 3 dihitung dengan cara terbatas WHO. */
  private static zScore(x: number, [, L, M, S]: BarisLms, beratBadan: boolean): number {
    const { MIN_3, MIN_2, PLUS_2, PLUS_3 } = StandarAntropometri.SD;
    const sd = (n: number) => M * Math.pow(1 + L * S * n, 1 / L);
    let z = (Math.pow(x / M, L) - 1) / (L * S);
    if (beratBadan && z > PLUS_3) z = PLUS_3 + (x - sd(PLUS_3)) / (sd(PLUS_3) - sd(PLUS_2));
    if (beratBadan && z < MIN_3) z = MIN_3 + (x - sd(MIN_3)) / (sd(MIN_2) - sd(MIN_3));
    return Math.round(z * StandarAntropometri.DESIMAL_Z) / StandarAntropometri.DESIMAL_Z;
  }

  /** Baris LMS untuk umur (bulan penuh) atau panjang/tinggi (interpolasi linear antar 0,5 cm). */
  private static baris(indikator: IndikatorAnak, jk: JenisKelamin, acuan: number): BarisLms | null {
    const rows = StandarAntropometri.data[indikator][jk];
    const pertama = rows[0][0];
    const terakhir = rows[rows.length - 1][0];
    if (acuan < pertama || acuan > terakhir) return null;
    const i = rows.findIndex((r) => r[0] >= acuan);
    if (rows[i][0] === acuan || i === 0) return rows[i];
    const [a, b] = [rows[i - 1], rows[i]];
    const t = (acuan - a[0]) / (b[0] - a[0]);
    return [acuan, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
  }

  private static kategori(indikator: IndikatorAnak, z: number): string {
    const { MIN_3, MIN_2, PLUS_1, PLUS_2, PLUS_3 } = StandarAntropometri.SD;
    switch (indikator) {
      case 'BB/U':
        if (z < MIN_3) return 'Berat badan sangat kurang';
        if (z < MIN_2) return 'Berat badan kurang';
        if (z <= PLUS_1) return 'Berat badan normal';
        return 'Risiko berat badan lebih';
      case 'TB/U':
        if (z < MIN_3) return 'Sangat pendek';
        if (z < MIN_2) return 'Pendek';
        if (z <= PLUS_3) return 'Normal';
        return 'Tinggi';
      case 'BB/PB':
      case 'BB/TB':
        if (z < MIN_3) return 'Gizi buruk';
        if (z < MIN_2) return 'Gizi kurang';
        if (z <= PLUS_1) return 'Gizi baik';
        if (z <= PLUS_2) return 'Berisiko gizi lebih';
        if (z <= PLUS_3) return 'Gizi lebih';
        return 'Obesitas';
      case 'LK/U':
        if (z < MIN_2) return 'Mikrosefali';
        if (z <= PLUS_2) return 'Normal';
        return 'Makrosefali';
    }
  }

  private static hasil(indikator: IndikatorAnak, jk: JenisKelamin, acuan: number, nilai: number): HasilIndikator {
    const b = StandarAntropometri.baris(indikator, jk, acuan);
    if (!b || !Number.isFinite(nilai) || nilai <= 0) return { z: null, kategori: TabelAcuan.BELUM_TERSEDIA };
    const z = StandarAntropometri.zScore(nilai, b, indikator !== 'TB/U' && indikator !== 'LK/U');
    return { z, kategori: StandarAntropometri.kategori(indikator, z) };
  }

  /** Semua indikator untuk satu pemeriksaan balita. */
  static klasifikasi(jk: JenisKelamin, umurBulan: number, bb: number, tbPb: number, lk: number) {
    const dalamRentang = umurBulan >= 0 && umurBulan <= StandarAntropometri.UMUR_MAKS;
    const kosong: HasilIndikator = { z: null, kategori: TabelAcuan.BELUM_TERSEDIA };
    const berdiri = umurBulan >= StandarAntropometri.BATAS_BERDIRI;
    return {
      bbu: dalamRentang ? StandarAntropometri.hasil('BB/U', jk, umurBulan, bb) : kosong,
      tbu: dalamRentang ? StandarAntropometri.hasil('TB/U', jk, umurBulan, tbPb) : kosong,
      bbTb: dalamRentang
        ? StandarAntropometri.hasil(
            berdiri ? 'BB/TB' : 'BB/PB',
            jk,
            Math.round(tbPb * StandarAntropometri.DESIMAL_CM) / StandarAntropometri.DESIMAL_CM,
            bb,
          )
        : kosong,
      lku: dalamRentang ? StandarAntropometri.hasil('LK/U', jk, umurBulan, lk) : kosong,
    };
  }

  /** Di bawah garis merah (BB/U < -2 SD) atau di atas garis oranye (BB/U > +1 SD) -> wajib dirujuk. */
  static perluDirujuk(zBbu: number | null): boolean {
    return zBbu !== null && (zBbu < StandarAntropometri.GARIS_MERAH || zBbu > StandarAntropometri.GARIS_ORANYE);
  }

  /** Sama dengan perluDirujuk(), dari label kategori BB/U yang tersimpan di basis data. */
  static perluDirujukDariKategori(kategoriBbu: string): boolean {
    return ['Berat badan sangat kurang', 'Berat badan kurang', 'Risiko berat badan lebih'].includes(kategoriBbu);
  }
}
