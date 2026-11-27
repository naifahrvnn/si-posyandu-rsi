import { Kueri } from '../../core/Kueri';
import { PemeriksaanService } from '../pemeriksaan/PemeriksaanService';
import { TabelAcuan } from '../pemeriksaan/TabelAcuan';
import { Balita } from './Balita';
import { PemeriksaanBalita, PemeriksaanBalitaInput } from './PemeriksaanBalita';
import { PemeriksaanBalitaRepository } from './PemeriksaanBalitaRepository';

/** [OVERRIDING] Balita butuh BB pemeriksaan sebelumnya untuk status N/T/B (BR-19). */
export class PemeriksaanBalitaService extends PemeriksaanService<Balita, PemeriksaanBalita, PemeriksaanBalitaInput> {
  protected override async buatPemeriksaan(
    k: Kueri,
    input: PemeriksaanBalitaInput,
    balita: Balita,
    acuan: TabelAcuan,
    petugasId: string,
  ): Promise<PemeriksaanBalita> {
    const bbLalu = await new PemeriksaanBalitaRepository(k).beratSebelumnya(balita.id, input.tanggal_periksa);
    return PemeriksaanBalita.hitung(input, balita, bbLalu, acuan, petugasId);
  }
}
