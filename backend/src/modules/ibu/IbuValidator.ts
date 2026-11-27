import { z } from 'zod';
import { SasaranValidator } from '../sasaran/SasaranValidator';
import { IbuInput, STATUS_IBU } from './Ibu';
import { NILAI_MAKS } from '../../core/BatasIsian';

/** SCR-08 Form Data Ibu. */
export class IbuValidator extends SasaranValidator<IbuInput> {
  protected override readonly isianWajibKhusus = ['status_ibu', 'nama_suami'];

  protected override isianKhusus(): z.ZodRawShape {
    return {
      status_ibu: this.pilihan([...STATUS_IBU]),
      nama_suami: this.teksWajib(),
      kehamilan_ke: this.bulatPositifOpsional(NILAI_MAKS.KEHAMILAN_KE),
    };
  }
}
