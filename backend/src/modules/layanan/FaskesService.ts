import { Database } from '../../core/Database';
import { FaskesRepository } from './FaskesRepository';

/**
 * Daftar fasilitas kesehatan (faskes) untuk pilihan tujuan rujukan (FSD-2.10, 2.17, 2.23).
 * Lapisan service ditambahkan agar alurnya sama dengan modul lain: Controller → Service → Repository.
 *
 * [AGREGASI] Database dibuat di luar (RakitanModul) lalu dipakai bersama.
 */
export class FaskesService {
  constructor(private readonly db: Database) {}

  async daftar() {
    return new FaskesRepository(await this.db.kueri()).daftar();
  }
}
