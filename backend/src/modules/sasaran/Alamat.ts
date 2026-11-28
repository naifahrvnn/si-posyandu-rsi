/** Data alamat dari kartu_keluarga (alamat, dusun, RT, RW, desa, kecamatan). */
export interface DataAlamat {
  alamat: string;
  dusun: string;
  rt: string;
  rw: string;
  desa: string;
  kecamatan: string;
}

/**
 * Alamat sasaran. Di basis data SMBD alamat disimpan di kartu_keluarga, jadi alamat
 * anggota keluarga mengikuti KK-nya.
 *
 * [KOMPOSISI] Objek Alamat dibuat oleh Sasaran di dalam constructor-nya sendiri dan ikut hilang bersamanya.
 * [ENKAPSULASI] Atribut private readonly (immutable).
 */
export class Alamat {
  constructor(private readonly d: DataAlamat) {}

  get alamat(): string {
    return this.d.alamat;
  }

  get dusun(): string {
    return this.d.dusun;
  }

  get rt(): string {
    return this.d.rt;
  }

  get rw(): string {
    return this.d.rw;
  }

  get desa(): string {
    return this.d.desa;
  }

  get kecamatan(): string {
    return this.d.kecamatan;
  }

  /** Bentuk ringkas untuk tampilan, mis. "Dusun Krajan RT 01/RW 02". */
  get dusunRtRw(): string {
    return `Dusun ${this.d.dusun} RT ${this.d.rt}/RW ${this.d.rw}`;
  }

  toJSON(): DataAlamat & { dusun_rt_rw: string } {
    return { ...this.d, dusun_rt_rw: this.dusunRtRw };
  }
}
