export type Peran = 'User (Kader)' | 'Super User';

/** Hak akses per peran (FSD 4.3 RBAC Matrix, diperbarui: Kader tidak boleh menghapus data). */
export type Hak = 'baca' | 'tambah' | 'ubah' | 'hapus' | 'lihat_log' | 'kelola_akun';

/**
 * Pengguna yang sedang login (tabel sistem pengguna, milik satu petugas).
 *
 * [ABSTRAKSI] Kelas abstract; objeknya selalu salah satu subclass: Kader atau Koordinator.
 * [POLIMORFISME] Pemeriksaan hak cukup memanggil boleh(hak); jawabannya ditentukan subclass.
 * [ENKAPSULASI] Atribut private + readonly: data pengguna tidak bisa diubah setelah dibaca dari sesi.
 * [ASOSIASI] Service hanya "memakai" objek Pengguna yang dikirim sebagai parameter (BR-03).
 * Objek dibuat lewat PabrikPengguna.dari() (Factory Method) yang memilih subclass sesuai kolom peran.
 */
export abstract class Pengguna {
  protected constructor(
    private readonly _userId: string,
    private readonly _petugasId: string,
  ) {}

  /** ID akun (pengguna.user_id): dipakai untuk log_aktivitas. */
  get userId(): string {
    return this._userId;
  }

  /** ID petugas (petugas.petugas_id): dipakai untuk kolom dicatat_oleh. */
  get petugasId(): string {
    return this._petugasId;
  }

  /** Nilai kolom pengguna.peran. */
  abstract get peran(): Peran;

  /** Nama peran di layar. */
  abstract get namaPeran(): string;

  /** Daftar hak milik peran ini. */
  protected abstract get daftarHak(): readonly Hak[];

  /**
   * [OVERLOADING] Dua cara memanggil:
   *   boleh('hapus')                 -> punya satu hak tersebut?
   *   boleh(['baca', 'lihat_log'])   -> punya SEMUA hak dalam daftar?
   */
  boleh(hak: Hak): boolean;
  boleh(daftar: readonly Hak[]): boolean;
  boleh(hakAtauDaftar: Hak | readonly Hak[]): boolean {
    const diminta: readonly Hak[] = typeof hakAtauDaftar === 'string' ? [hakAtauDaftar] : hakAtauDaftar;
    return diminta.every((h) => this.daftarHak.includes(h));
  }
}
