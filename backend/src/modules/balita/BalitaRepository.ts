import { Baris, Parameter } from '../../core/Kueri';
import { DataIdentitas, JenisKelamin } from '../sasaran/Sasaran';
import { SasaranRepository } from '../sasaran/SasaranRepository';
import { Balita } from './Balita';

/** Subclass dbo.balita (jenis kelamin disimpan di dbo.warga). */
export class BalitaRepository extends SasaranRepository<Balita> {
  protected override readonly tabel = 'balita';
  protected override readonly kolomKhusus = ['nama_orang_tua', 'berat_badan_lahir', 'panjang_badan_lahir'];

  protected override nilaiKhusus(b: Balita): Parameter {
    return { nama_orang_tua: b.namaOrangTua, berat_badan_lahir: b.beratLahir, panjang_badan_lahir: b.panjangLahir };
  }

  protected override keEntitas(identitas: DataIdentitas, b: Baris): Balita {
    return Balita.pulihkan({
      ...identitas,
      jenisKelamin: b.jenis_kelamin as JenisKelamin,
      beratLahir: Number(b.berat_badan_lahir),
      panjangLahir: Number(b.panjang_badan_lahir),
      namaOrangTua: String(b.nama_orang_tua),
    });
  }
}
