import { Pengamat } from './Pengamat';
import { Peristiwa } from './Peristiwa';
import { Logger } from '../Logger';

/** Data peristiwa tanpa waktu; waktu diisi otomatis saat diterbitkan. */
export type PeristiwaBaru = Peristiwa extends infer P ? (P extends Peristiwa ? Omit<P, 'waktu'> : never) : never;

/**
 * [DESIGN PATTERN: OBSERVER] Peran "subject": menyimpan daftar pengamat dan memberi tahu semuanya.
 * Service yang menerbitkan peristiwa tidak tahu siapa saja pengamatnya (low coupling):
 * pengamat baru cukup didaftarkan di RakitanModul tanpa mengubah service.
 *
 * [ENKAPSULASI] Daftar pengamat private; dari luar hanya daftarkan(), lepaskan(), terbitkan().
 * [AGREGASI] Pengamat dibuat di luar lalu didaftarkan; hidupnya tidak bergantung pada objek ini.
 */
export class PusatPeristiwa {
  private readonly pengamat = new Set<Pengamat>();

  daftarkan(p: Pengamat): this {
    this.pengamat.add(p);
    return this;
  }

  lepaskan(p: Pengamat): void {
    this.pengamat.delete(p);
  }

  /** Pengamat yang gagal tidak boleh menggagalkan proses utama (mis. pemeriksaan tetap tersimpan). */
  terbitkan(data: PeristiwaBaru): void {
    const peristiwa = { ...data, waktu: new Date().toISOString() } as Peristiwa;
    for (const p of this.pengamat) {
      try {
        p.terima(peristiwa);
      } catch (err) {
        Logger.error('Pengamat peristiwa gagal; proses utama tetap berjalan', err, { peristiwa: peristiwa.jenis });
      }
    }
  }
}
