import { randomUUID } from 'node:crypto';
import { Tanggal } from '../../core/Tanggal';

export const JENIS_KEGIATAN = ['Posyandu', 'Penyuluhan Kesehatan', 'Imunisasi/Pemeriksaan', 'Distribusi Vitamin'] as const;
export type JenisKegiatan = (typeof JENIS_KEGIATAN)[number];

/** Input form jadwal kegiatan. Jam disimpan di kolom keterangan karena tabel tidak punya kolom jam. */
export interface JadwalInput {
  nama_kegiatan: string;
  jenis_kegiatan: JenisKegiatan;
  tanggal_pelaksanaan: string;
  jam_mulai: string;
  jam_selesai: string;
  lokasi: string;
  keterangan?: string | null;
}

export interface JadwalProps {
  id: string;
  namaKegiatan: string;
  jenisKegiatan: JenisKegiatan;
  tanggal: string;
  jamMulai: string | null;
  jamSelesai: string | null;
  lokasi: string;
  keterangan: string | null;
  penanggungJawab: string;
  namaPenanggungJawab: string | null;
}

/**
 * Jadwal kegiatan Posyandu (tabel jadwal_kegiatan).
 * Tabel tidak punya kolom jam, jadi jam disimpan di baris pertama keterangan: "Jam: 08:00-11:00".
 *
 * [ENKAPSULASI] Format penyimpanan jam disembunyikan di kelas ini (keKeterangan / dariKeterangan).
 * [DESIGN PATTERN: FACTORY METHOD] buat() dan dariBaris().
 */
export class JadwalKegiatan {
  private static readonly POLA_JAM = /^Jam: (\d{2}:\d{2})-(\d{2}:\d{2})(?:\r?\n|$)/;

  private constructor(private p: JadwalProps) {}

  static buat(input: JadwalInput, penanggungJawab: string): JadwalKegiatan {
    return new JadwalKegiatan({
      id: randomUUID(),
      namaKegiatan: input.nama_kegiatan,
      jenisKegiatan: input.jenis_kegiatan,
      tanggal: input.tanggal_pelaksanaan,
      jamMulai: input.jam_mulai,
      jamSelesai: input.jam_selesai,
      lokasi: input.lokasi,
      keterangan: input.keterangan ?? null,
      penanggungJawab,
      namaPenanggungJawab: null,
    });
  }

  static dariBaris(b: Record<string, unknown>): JadwalKegiatan {
    const teks = (b.keterangan as string | null) ?? '';
    const jam = JadwalKegiatan.POLA_JAM.exec(teks);
    const sisa = jam ? teks.slice(jam[0].length).trim() : teks.trim();
    return new JadwalKegiatan({
      id: String(b.jadwal_id),
      namaKegiatan: String(b.nama_kegiatan),
      jenisKegiatan: b.jenis_kegiatan as JenisKegiatan,
      tanggal: Tanggal.dariDb(b.tanggal_pelaksanaan),
      jamMulai: jam ? jam[1] : null,
      jamSelesai: jam ? jam[2] : null,
      lokasi: String(b.lokasi),
      keterangan: sisa || null,
      penanggungJawab: b.penanggung_jawab ? String(b.penanggung_jawab) : '',
      namaPenanggungJawab: (b.nama_penanggung_jawab as string | null) ?? null,
    });
  }

  get id(): string {
    return this.p.id;
  }

  get props(): Readonly<JadwalProps> {
    return this.p;
  }

  terapkanPerubahan(input: Partial<JadwalInput>): void {
    this.p = {
      ...this.p,
      namaKegiatan: input.nama_kegiatan ?? this.p.namaKegiatan,
      jenisKegiatan: input.jenis_kegiatan ?? this.p.jenisKegiatan,
      tanggal: input.tanggal_pelaksanaan ?? this.p.tanggal,
      jamMulai: input.jam_mulai ?? this.p.jamMulai,
      jamSelesai: input.jam_selesai ?? this.p.jamSelesai,
      lokasi: input.lokasi ?? this.p.lokasi,
      keterangan: input.keterangan !== undefined ? input.keterangan : this.p.keterangan,
    };
  }

  /** Nilai kolom keterangan yang disimpan ke basis data. */
  get keteranganTersimpan(): string | null {
    const jam = this.p.jamMulai && this.p.jamSelesai ? `Jam: ${this.p.jamMulai}-${this.p.jamSelesai}` : null;
    return [jam, this.p.keterangan].filter(Boolean).join('\n') || null;
  }

  toJSON() {
    return {
      id: this.p.id,
      nama_kegiatan: this.p.namaKegiatan,
      jenis_kegiatan: this.p.jenisKegiatan,
      tanggal_pelaksanaan: this.p.tanggal,
      jam_mulai: this.p.jamMulai,
      jam_selesai: this.p.jamSelesai,
      lokasi: this.p.lokasi,
      keterangan: this.p.keterangan,
      penanggung_jawab: this.p.namaPenanggungJawab,
    };
  }
}
