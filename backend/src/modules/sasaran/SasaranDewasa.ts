import { Tanggal } from '../../core/Tanggal';
import { Sasaran } from './Sasaran';

/**
 * Sasaran yang umurnya dihitung dalam tahun: Ibu dan Lansia (BR-10).
 *
 * [PEWARISAN] Tingkat tengah: Sasaran -> SasaranDewasa -> Ibu / Lansia (tidak lebih dari 3 tingkat).
 * [OVERRIDING] hitungUmur() dan satuanUmur diisi sekali di sini, dipakai bersama oleh Ibu dan Lansia.
 */
export abstract class SasaranDewasa extends Sasaran {
  override hitungUmur(tanggalAcuan: string = Tanggal.hariIni()): number {
    return Tanggal.selisihTahun(this.tanggalLahir, tanggalAcuan);
  }

  override get satuanUmur(): 'tahun' {
    return 'tahun';
  }
}
