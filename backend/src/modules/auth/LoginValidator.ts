import { z } from 'zod';
import { ValidatorDasar } from '../../core/ValidatorDasar';

/** SCR-01: username dan password wajib diisi (FSD-2.1 EF-1). */
export class LoginValidator extends ValidatorDasar {
  private readonly skema = z.object({
    username: z.string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' }).trim().min(1, 'ERR-VAL-01'),
    password: z.string({ required_error: 'ERR-VAL-01', invalid_type_error: 'ERR-VAL-01' }).min(1, 'ERR-VAL-01'),
  });

  validasi(body: unknown): { username: string; password: string } {
    return this.jalankan(this.skema, body);
  }
}
