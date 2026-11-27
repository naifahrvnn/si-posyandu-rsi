import { Kueri } from '../../core/Kueri';
import { PemeriksaanService } from '../pemeriksaan/PemeriksaanService';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Lansia } from './Lansia';
import { PemeriksaanLansia, PemeriksaanLansiaInput } from './PemeriksaanLansia';

export class PemeriksaanLansiaService extends PemeriksaanService<Lansia, PemeriksaanLansia, PemeriksaanLansiaInput> {
  protected override async buatPemeriksaan(
    _k: Kueri,
    input: PemeriksaanLansiaInput,
    lansia: Lansia,
    acuan: TabelAcuan,
    petugasId: string,
  ): Promise<PemeriksaanLansia> {
    return PemeriksaanLansia.hitung(input, lansia, acuan, petugasId);
  }
}
