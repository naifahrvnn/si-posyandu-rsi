import { Peristiwa } from './Peristiwa';

/**
 * [DESIGN PATTERN: OBSERVER] Peran "observer": objek yang ingin diberi tahu saat ada peristiwa.
 * [ABSTRAKSI / POLIMORFISME BERBASIS INTERFACE] Setiap pengamat mengimplementasikan terima() dengan caranya sendiri.
 */
export interface Pengamat {
  terima(peristiwa: Peristiwa): void;
}
