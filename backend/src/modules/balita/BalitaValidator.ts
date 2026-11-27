import { z } from 'zod';
import { SasaranValidator } from '../sasaran/SasaranValidator';
import { BalitaInput } from './Balita';
import { NILAI_MAKS } from '../../core/BatasIsian';

/** SCR-04 Form Data Balita. */
export class BalitaValidator extends SasaranValidator<BalitaInput> {
  protected override readonly isianWajibKhusus = ['jenis_kelamin', 'berat_lahir', 'panjang_lahir', 'nama_orang_tua'];

  protected override isianKhusus(): z.ZodRawShape {
    return {
      jenis_kelamin: this.pilihan(['Laki-laki', 'Perempuan']),
      berat_lahir: this.angkaPositif(NILAI_MAKS.BERAT_LAHIR_KG),
      panjang_lahir: this.angkaPositif(NILAI_MAKS.PANJANG_LAHIR_CM),
      nama_orang_tua: this.teksWajib(),
    };
  }
}
