import { randomUUID } from 'node:crypto';

export const JENIS_LAYANAN_BALITA = ['Vitamin A', 'Obat Cacing', 'Imunisasi'] as const; // BR-26
export const JENIS_LAYANAN_IBU = ['TTD', 'MT', 'Imunisasi TT'] as const; // BR-27, BR-16
export type JenisLayanan = (typeof JENIS_LAYANAN_BALITA)[number] | (typeof JENIS_LAYANAN_IBU)[number];
export type KelompokLayanan = 'balita' | 'ibu';

/** Input satu layanan (SCR-07, SCR-11). */
export interface LayananInput {
  jenis_layanan: JenisLayanan;
  tanggal_layanan: string;
  jumlah_tablet?: number | null;
  konsumsi_harian?: boolean | null;
  komposisi_mt?: string | null;
  porsi_mt?: string | null;
  konsumsi_mt?: boolean | null;
  keterangan?: string | null;
}

export interface LayananProps {
  id: string;
  kelompok: KelompokLayanan;
  sasaranId: string;
  tanggalLayanan: string;
  jenisLayanan: JenisLayanan;
  jumlahTablet: number | null;
  konsumsiHarian: boolean | null;
  komposisiMt: string | null;
  porsiMt: string | null;
  konsumsiMt: boolean | null;
  keterangan: string | null;
  dicatatOleh: string;
  dibuatPada: string | null;
}

/**
 * Layanan/intervensi balita dan ibu (FSD-2.9, FSD-2.16; BR-28: lansia tidak memiliki layanan).
 * Satu baris per jenis layanan yang dicentang (FSD-2.9 AF-2).
 *
 * [ENKAPSULASI] Isian khusus TTD dan MT hanya disimpan untuk jenisnya sendiri.
 */
export class Layanan {
  private constructor(private readonly p: LayananProps) {}

  static buat(input: LayananInput, kelompok: KelompokLayanan, sasaranId: string, dicatatOleh: string): Layanan {
    const ttd = input.jenis_layanan === 'TTD';
    const mt = input.jenis_layanan === 'MT';
    return new Layanan({
      id: randomUUID(),
      kelompok,
      sasaranId,
      tanggalLayanan: input.tanggal_layanan,
      jenisLayanan: input.jenis_layanan,
      jumlahTablet: ttd ? (input.jumlah_tablet ?? null) : null,
      konsumsiHarian: ttd ? (input.konsumsi_harian ?? null) : null,
      komposisiMt: mt ? (input.komposisi_mt ?? null) : null,
      porsiMt: mt ? (input.porsi_mt ?? null) : null,
      konsumsiMt: mt ? (input.konsumsi_mt ?? null) : null,
      keterangan: input.keterangan ?? null,
      dicatatOleh,
      dibuatPada: null,
    });
  }

  static pulihkan(props: LayananProps): Layanan {
    return new Layanan(props);
  }

  get props(): Readonly<LayananProps> {
    return this.p;
  }

  toJSON() {
    return {
      id: this.p.id,
      tanggal_layanan: this.p.tanggalLayanan,
      jenis_layanan: this.p.jenisLayanan,
      jumlah_tablet: this.p.jumlahTablet,
      konsumsi_harian: this.p.konsumsiHarian,
      komposisi_mt: this.p.komposisiMt,
      porsi_mt: this.p.porsiMt,
      konsumsi_mt: this.p.konsumsiMt,
      keterangan: this.p.keterangan,
      created_at: this.p.dibuatPada,
    };
  }
}
