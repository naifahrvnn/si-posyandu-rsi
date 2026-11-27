import { Router } from 'express';

/**
 * Kontrak satu modul fitur API: alamat dasar (jalur) dan router Express-nya.
 * App.ts cukup memasang setiap Modul tanpa perlu tahu isi modulnya.
 *
 * [ABSTRAKSI] Interface: App hanya bergantung pada kontrak ini, bukan pada kelas controller tertentu.
 * [POLIMORFISME] AuthController, AkunController, KelompokRouter, dan controller lain diperlakukan sama sebagai Modul.
 */
export interface Modul {
  /** Alamat dasar, mis. '/api/v1/akun'. */
  readonly jalur: string;
  readonly router: Router;
}

/** Awalan semua endpoint (versi API). */
export const AWALAN_API = '/api/v1';
