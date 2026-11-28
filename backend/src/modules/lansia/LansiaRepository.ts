import { Baris, Parameter } from '../../core/Kueri';
import { DataIdentitas, JenisKelamin } from '../sasaran/Sasaran';
import { SasaranRepository } from '../sasaran/SasaranRepository';
import { Lansia } from './Lansia';

/** Subclass dbo.lansia (jenis kelamin dan pekerjaan disimpan di dbo.warga). */
export class LansiaRepository extends SasaranRepository<Lansia> {
  protected override readonly tabel = 'lansia';
  protected override readonly kolomKhusus = ['status_perkawinan'];

  protected override nilaiKhusus(l: Lansia): Parameter {
    return { status_perkawinan: l.statusPerkawinan };
  }

  protected override keEntitas(identitas: DataIdentitas, b: Baris): Lansia {
    return Lansia.pulihkan({
      ...identitas,
      jenisKelamin: b.jenis_kelamin as JenisKelamin,
      statusPerkawinan: (b.status_perkawinan as string | null) ?? null,
    });
  }
}
