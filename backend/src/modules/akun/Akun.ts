import { DataError } from '../../core/errors/DataError';
import { PabrikPengguna } from '../../keamanan/PabrikPengguna';
import { Pengguna, Peran } from '../../keamanan/Pengguna';

export type StatusAkun = 'Aktif' | 'Nonaktif';
export const PERAN_AKUN: readonly Peran[] = ['User (Kader)', 'Super User'];
export const STATUS_AKUN: readonly StatusAkun[] = ['Aktif', 'Nonaktif'];

/** BRL-06 (SCR-18): akun baru otomatis User (Kader) bila peran tidak dipilih. */
export const PERAN_AWAL: Peran = 'User (Kader)';

/** Data satu akun pengguna (tabel pengguna + nama dari tabel petugas). */
export interface AkunProps {
  userId: string;
  petugasId: string;
  nama: string;
  username: string;
  peran: Peran;
  status: StatusAkun;
  jabatanKader: string | null;
  lastLogin: string | null;
  dibuatPada: string | null;
  diubahPada: string | null;
}

/** Isian yang boleh diubah lewat Ubah Data Akun (FSD-2.4 AF-1). */
export interface PerubahanAkun {
  nama?: string;
  username?: string;
  peran?: Peran;
}

/**
 * Akun pengguna yang dikelola Super User (FSD-2.4, SCR-18).
 *
 * [ENKAPSULASI] Props private; perubahan hanya lewat terapkanPerubahan() dan ubahStatus(),
 *   sehingga aturan BR-06 dan EF-4 tidak bisa dilewati.
 * [ASOSIASI] terapkanPerubahan() dan ubahStatus() memakai objek Pengguna (yang sedang login) sebagai parameter, tanpa menyimpannya.
 * [POLIMORFISME] Label peran diambil dari subclass Pengguna (Kader / Koordinator) lewat PabrikPengguna.
 */
export class Akun {
  private constructor(private readonly p: AkunProps) {}

  static pulihkan(props: AkunProps): Akun {
    return new Akun({ ...props });
  }

  get id(): string {
    return this.p.userId;
  }

  get petugasId(): string {
    return this.p.petugasId;
  }

  get nama(): string {
    return this.p.nama;
  }

  get username(): string {
    return this.p.username;
  }

  get peran(): Peran {
    return this.p.peran;
  }

  get status(): StatusAkun {
    return this.p.status;
  }

  /** 'Kader' atau 'Koordinator', dijawab oleh subclass Pengguna. */
  get labelPeran(): string {
    return PabrikPengguna.dari(this.p.userId, this.p.peran, this.p.petugasId).namaPeran;
  }

  /**
   * AF-1: ubah nama, username/NIK, atau peran. Isian yang tidak dikirim tidak berubah.
   * Super User tidak boleh mengubah peran akunnya sendiri (ERR-DATA-10), agar selalu ada Super User aktif.
   */
  terapkanPerubahan(ubah: PerubahanAkun, oleh: Pengguna): void {
    if (ubah.peran !== undefined && ubah.peran !== this.p.peran && oleh.userId === this.p.userId) {
      throw new DataError('ERR-DATA-10', 'peran');
    }
    if (ubah.nama !== undefined) this.p.nama = ubah.nama;
    if (ubah.username !== undefined) this.p.username = ubah.username;
    if (ubah.peran !== undefined) this.p.peran = ubah.peran;
  }

  /**
   * AF-2: nonaktifkan (atau aktifkan kembali) akun. Akun tidak pernah dihapus permanen (BR-06).
   * EF-4: Super User tidak boleh menonaktifkan akunnya sendiri -> ERR-DATA-05.
   */
  ubahStatus(status: StatusAkun, oleh: Pengguna): void {
    if (status === 'Nonaktif' && oleh.userId === this.p.userId) throw new DataError('ERR-DATA-05', 'status_akun');
    this.p.status = status;
  }

  /** Isian yang dibandingkan untuk detail log "sebelum → sesudah". */
  get isianAudit(): Record<string, unknown> {
    return { nama: this.p.nama, username: this.p.username, peran: this.labelPeran, status_akun: this.p.status };
  }

  /** @param penggunaAktif bila diisi, ditambah tanda akun_saya (layar menyembunyikan tombol Nonaktifkan). */
  toJSON(penggunaAktif?: Pengguna) {
    return {
      id: this.p.userId,
      petugas_id: this.p.petugasId,
      nama: this.p.nama,
      username: this.p.username,
      peran: this.p.peran,
      label_peran: this.labelPeran,
      status_akun: this.p.status,
      jabatan_kader: this.p.jabatanKader,
      last_login: this.p.lastLogin,
      created_at: this.p.dibuatPada,
      update_at: this.p.diubahPada,
      akun_saya: penggunaAktif ? penggunaAktif.userId === this.p.userId : false,
    };
  }
}
