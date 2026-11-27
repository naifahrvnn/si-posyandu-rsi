import { Kueri } from '../../core/Kueri';

/** Akses tabel dbo.faskes (tujuan rujukan). */
export class FaskesRepository {
  constructor(private readonly k: Kueri) {}

  async daftar() {
    const baris = await this.k.pilih(
      'SELECT faskes_id, nama_faskes, jenis_faskes FROM dbo.faskes ORDER BY jenis_faskes, nama_faskes',
    );
    return baris.map((b) => ({
      faskes_id: String(b.faskes_id),
      nama_faskes: String(b.nama_faskes),
      jenis_faskes: String(b.jenis_faskes),
    }));
  }

  async ada(faskesId: string): Promise<boolean> {
    return (await this.k.satu('SELECT 1 AS ada FROM dbo.faskes WHERE faskes_id = @id', { id: faskesId })) !== null;
  }
}
