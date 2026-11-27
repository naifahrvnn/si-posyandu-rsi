import { Logger } from '../Logger';
import { Pengamat } from './Pengamat';
import { Peristiwa } from './Peristiwa';

/**
 * Pengamat 1: mencatat peristiwa penting ke log server (stdout) dalam satu baris JSON.
 * Log ini pelengkap log_aktivitas di basis data, untuk pemantauan server.
 *
 * [POLIMORFISME BERBASIS INTERFACE] implements Pengamat.
 */
export class PencatatAktivitas implements Pengamat {
  terima(p: Peristiwa): void {
    if (p.jenis === 'galat') return; // galat ditangani PencatatGalat
    // Percobaan akses ditolak: peringatan di log server; ke log_aktivitas ditulis PencatatAksesDitolak
    if (p.jenis === 'akses.ditolak') Logger.warn('Akses ditolak', { ...p });
    else Logger.info(`Peristiwa ${p.jenis}`, { ...p });
  }
}
