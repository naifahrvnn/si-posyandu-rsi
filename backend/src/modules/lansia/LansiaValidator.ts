import { z } from 'zod';
import { SasaranValidator } from '../sasaran/SasaranValidator';
import { LansiaInput } from './Lansia';
import { PANJANG } from '../../core/BatasIsian';

/** SCR-12 Form Data Lansia. */
export class LansiaValidator extends SasaranValidator<LansiaInput> {
  protected override readonly isianWajibKhusus = ['jenis_kelamin'];

  protected override isianKhusus(): z.ZodRawShape {
    return {
      jenis_kelamin: this.pilihan(['Laki-laki', 'Perempuan']),
      status_perkawinan: this.teksOpsional(PANJANG.STATUS_PERKAWINAN),
    };
  }
}
