import { Hak, Pengguna, Peran } from './Pengguna';

/** Role 2: Super User / Koordinator. CRUD penuh, Kelola Akun (FSD-2.4), serta Dashboard Monitoring dan Log Aktivitas (FSD-2.5). */
export class Koordinator extends Pengguna {
  private static readonly HAK: readonly Hak[] = ['baca', 'tambah', 'ubah', 'hapus', 'lihat_log', 'kelola_akun'];

  constructor(userId: string, petugasId: string) {
    super(userId, petugasId);
  }

  override get peran(): Peran {
    return 'Super User';
  }

  override get namaPeran(): string {
    return 'Koordinator';
  }

  protected override get daftarHak(): readonly Hak[] {
    return Koordinator.HAK;
  }
}
