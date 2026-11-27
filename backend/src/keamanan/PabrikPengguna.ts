import { Kader } from './Kader';
import { Koordinator } from './Koordinator';
import { Pengguna, Peran } from './Pengguna';

/**
 * [DESIGN PATTERN: FACTORY METHOD] Membuat objek Pengguna yang tepat dari kolom pengguna.peran.
 * Pemanggil (SesiRepository) hanya tahu tipe abstract Pengguna, bukan subclass-nya (low coupling).
 * Dipisah dari kelas Pengguna agar tidak terjadi import melingkar (Pengguna <-> Kader/Koordinator).
 */
export class PabrikPengguna {
  static dari(userId: string, peran: Peran, petugasId: string): Pengguna {
    return peran === 'Super User' ? new Koordinator(userId, petugasId) : new Kader(userId, petugasId);
  }
}
