import { Pengguna } from '../../keamanan/Pengguna';
import { Pemeriksaan } from '../pemeriksaan/Pemeriksaan';
import { KunjunganService } from './KunjunganService';
import { Layanan, LayananInput } from './Layanan';
import { LayananRepository } from './LayananRepository';

/**
 * Catat layanan balita (FSD-2.9) dan ibu (FSD-2.16). Lansia tidak punya layanan (BR-28).
 * Satu baris per jenis layanan yang dicentang (FSD-2.9 AF-2), dalam satu transaksi (BR-36).
 *
 * [PEWARISAN] LayananService extends KunjunganService.
 * [ASOSIASI] Pengguna dipakai sebagai parameter: petugasId untuk dicatat_oleh, userId untuk log.
 */
export class LayananService<P extends Pemeriksaan> extends KunjunganService<P> {
  async simpan(sasaranId: string, pemeriksaanId: string, daftar: LayananInput[], pengguna: Pengguna) {
    return this.db.transaksi(pengguna, async (k) => {
      await this.pastikanPemeriksaan(k, sasaranId, pemeriksaanId);
      const repo = new LayananRepository(k);
      const tersimpan: Layanan[] = [];
      for (const item of daftar) {
        const l = Layanan.buat(item, this.kelompok as 'balita' | 'ibu', sasaranId, pengguna.petugasId);
        await repo.simpan(l); // log 'Input' ditulis trigger trg_audit_layanan_insert (02_objects.sql)
        tersimpan.push(l);
      }
      return tersimpan.map((l) => l.toJSON());
    });
  }
}
