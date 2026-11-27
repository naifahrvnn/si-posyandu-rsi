import { Kueri } from '../../core/Kueri';
import { PemeriksaanService } from '../pemeriksaan/PemeriksaanService';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Ibu } from './Ibu';
import { PemeriksaanIbu, PemeriksaanIbuInput } from './PemeriksaanIbu';

export class PemeriksaanIbuService extends PemeriksaanService<Ibu, PemeriksaanIbu, PemeriksaanIbuInput> {
  protected override async buatPemeriksaan(
    _k: Kueri,
    input: PemeriksaanIbuInput,
    ibu: Ibu,
    acuan: TabelAcuan,
    petugasId: string,
  ): Promise<PemeriksaanIbu> {
    return PemeriksaanIbu.hitung(input, ibu, acuan, petugasId);
  }
}
