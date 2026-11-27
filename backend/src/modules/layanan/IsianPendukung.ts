import { randomUUID } from 'node:crypto';

/** Input isian pendukung (SCR-07, SCR-11, SCR-15; FSD-2.10, 2.17, 2.23). */
export interface IsianPendukungInput {
  tbc_batuk?: boolean | null;
  tbc_demam?: boolean | null;
  tbc_bb_tidak_naik?: boolean | null;
  tbc_kontak_erat?: boolean | null;
  status_rujukan?: boolean | null;
  /** Tujuan rujukan = faskes (tabel dbo.faskes), wajib bila status_rujukan Ya. */
  faskes_id?: string | null;
  alasan_rujukan?: string | null;
  catatan_edukasi?: string | null;
}

/** Data rujukan (tabel dbo.rujukan) yang melekat pada isian pendukung. */
export interface DataRujukan {
  faskesId: string;
  namaFaskes: string | null;
  alasanRujukan: string;
  statusTindakLanjut: string | null;
}

export interface IsianPendukungProps {
  id: string;
  pemeriksaanId: string;
  tbcBatuk: boolean;
  tbcDemam: boolean;
  tbcBbTidakNaik: boolean;
  tbcKontakErat: boolean;
  statusRujukan: boolean;
  catatanEdukasi: string | null;
  rujukan: DataRujukan | null;
}

/**
 * Isian pendukung: skrining gejala TBC, status rujukan, catatan edukasi (BR-14, BR-15, BR-37).
 * Bila dirujuk, tujuan rujukan disimpan di tabel rujukan (faskes mana pun).
 *
 * [ENKAPSULASI] Atribut private; diubah hanya lewat isiUlang() (AF-2: isian diubah pada kunjungan yang sama).
 * [KOMPOSISI] Data rujukan dibuat dan dimiliki oleh isian pendukung.
 */
export class IsianPendukung {
  private constructor(private p: IsianPendukungProps) {}

  /** Default semua isian = Tidak (SCR-07 kolom "Default Tidak"). */
  static buat(input: IsianPendukungInput, pemeriksaanId: string): IsianPendukung {
    return new IsianPendukung(IsianPendukung.dariInput(randomUUID(), pemeriksaanId, input));
  }

  static pulihkan(props: IsianPendukungProps): IsianPendukung {
    return new IsianPendukung(props);
  }

  /** Simpan ulang memperbarui isian yang sama, tidak membuat catatan ganda (NFR-013). */
  isiUlang(input: IsianPendukungInput): void {
    this.p = IsianPendukung.dariInput(this.p.id, this.p.pemeriksaanId, input);
  }

  get props(): Readonly<IsianPendukungProps> {
    return this.p;
  }

  toJSON() {
    return {
      id: this.p.id,
      tbc_batuk: this.p.tbcBatuk,
      tbc_demam: this.p.tbcDemam,
      tbc_bb_tidak_naik: this.p.tbcBbTidakNaik,
      tbc_kontak_erat: this.p.tbcKontakErat,
      status_rujukan: this.p.statusRujukan,
      faskes_id: this.p.rujukan?.faskesId ?? null,
      nama_faskes: this.p.rujukan?.namaFaskes ?? null,
      alasan_rujukan: this.p.rujukan?.alasanRujukan ?? null,
      status_tindak_lanjut: this.p.rujukan?.statusTindakLanjut ?? null,
      catatan_edukasi: this.p.catatanEdukasi,
    };
  }

  private static dariInput(id: string, pemeriksaanId: string, input: IsianPendukungInput): IsianPendukungProps {
    const rujuk = input.status_rujukan === true;
    return {
      id,
      pemeriksaanId,
      tbcBatuk: input.tbc_batuk === true,
      tbcDemam: input.tbc_demam === true,
      tbcBbTidakNaik: input.tbc_bb_tidak_naik === true,
      tbcKontakErat: input.tbc_kontak_erat === true,
      statusRujukan: rujuk,
      catatanEdukasi: input.catatan_edukasi ?? null,
      rujukan: rujuk
        ? {
            faskesId: input.faskes_id ?? '',
            namaFaskes: null,
            alasanRujukan: input.alasan_rujukan ?? '',
            statusTindakLanjut: null,
          }
        : null,
    };
  }
}
