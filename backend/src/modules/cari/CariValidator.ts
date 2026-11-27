import { z } from 'zod';
import { ValidatorDasar } from '../../core/ValidatorDasar';

/** ?nama= wajib diisi (FSD-2.25 EF-1). */
export class CariValidator extends ValidatorDasar {
  private readonly skema = z.object({ nama: this.teksWajib() });

  validasi(query: unknown): { nama: string } {
    return this.jalankan(this.skema, query);
  }
}
