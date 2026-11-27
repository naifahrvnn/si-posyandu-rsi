import { Baris, Parameter } from '../../core/Kueri';
import { DataIdentitas } from '../sasaran/Sasaran';
import { SasaranRepository } from '../sasaran/SasaranRepository';
import { Ibu, StatusIbu } from './Ibu';

/** Subclass dbo.ibu. */
export class IbuRepository extends SasaranRepository<Ibu> {
  protected override readonly tabel = 'ibu';
  protected override readonly kolomKhusus = ['status_ibu', 'nama_suami', 'kehamilan_ke'];

  protected override nilaiKhusus(i: Ibu): Parameter {
    return { status_ibu: i.statusIbu, nama_suami: i.namaSuami, kehamilan_ke: i.kehamilanKe };
  }

  protected override keEntitas(identitas: DataIdentitas, b: Baris): Ibu {
    return Ibu.pulihkan({
      ...identitas,
      statusIbu: b.status_ibu as StatusIbu,
      namaSuami: String(b.nama_suami),
      kehamilanKe: (b.kehamilan_ke as number | null) ?? null,
    });
  }
}
