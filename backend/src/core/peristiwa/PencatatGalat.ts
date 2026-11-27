import { Logger } from '../Logger';
import { Pengamat } from './Pengamat';
import { Peristiwa } from './Peristiwa';

/**
 * Pengamat 2: kebijakan penanganan error (materi RSI-12, Bass et al., 2012):
 * error tidak boleh ditelan diam-diam; setiap error dicatat bersama konteksnya
 * (user ID, waktu, operasi). Detail teknis hanya di log server, tidak dikirim ke pengguna.
 *
 * [POLIMORFISME BERBASIS INTERFACE] implements Pengamat.
 */
export class PencatatGalat implements Pengamat {
  terima(p: Peristiwa): void {
    if (p.jenis !== 'galat') return;
    const { detail, jenis: _jenis, pesan: penyebab, ...konteks } = p;
    if (p.sistem) Logger.error('Galat sistem', detail, { penyebab, ...konteks });
    else Logger.warn('Galat dikenal (validasi, hak akses, atau data)', { penyebab, ...konteks });
  }
}
