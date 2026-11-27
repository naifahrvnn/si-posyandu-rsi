import { Database } from '../../core/Database';
import { SystemError } from '../../core/errors/SystemError';

/**
 * Pemeriksaan kesehatan layanan: server menyala dan basis data bisa dihubungi.
 * Dipakai untuk demo/pengujian kondisi "basis data mati" dan oleh pemantau server.
 *
 * [AGREGASI] Database dibuat di luar (RakitanModul).
 */
export class StatusService {
  constructor(private readonly db: Database) {}

  /** Basis data tidak menjawab -> 503 ERR-SYS-01 (tanpa detail teknis). */
  async periksa() {
    if (!(await this.db.siap())) throw new SystemError('ERR-SYS-01');
    return { server: 'aktif', basis_data: 'terhubung', waktu: new Date().toISOString() };
  }
}
