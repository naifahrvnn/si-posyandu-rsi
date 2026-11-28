import { z } from 'zod';
import { PemeriksaanValidator } from '../pemeriksaan/PemeriksaanValidator';
import { PemeriksaanBalitaInput } from './PemeriksaanBalita';

/** SCR-05 Form Antropometri Balita (FSD-2.7 EF-1 s.d. EF-3). */
export class PemeriksaanBalitaValidator extends PemeriksaanValidator<PemeriksaanBalitaInput> {
  private readonly skema = z.object({
    tanggal_periksa: this.tanggalLalu(),
    berat_badan: this.angkaPositif(),
    tinggi_panjang_badan: this.angkaPositif(),
    lila: this.angkaPositif(),
    lika: this.angkaPositif(),
  });

  override validasi(body: unknown): PemeriksaanBalitaInput {
    return this.jalankan(this.skema, body) as PemeriksaanBalitaInput;
  }
}
