import { Hak, Pengguna, Peran } from './Pengguna';

/** Role 1: Kader (User). Baca, tambah, dan ubah data; tidak boleh menghapus, mengelola akun, atau melihat log (BR-05). */
export class Kader extends Pengguna {
  private static readonly HAK: readonly Hak[] = ['baca', 'tambah', 'ubah'];

  constructor(userId: string, petugasId: string) {
    super(userId, petugasId);
  }

  override get peran(): Peran {
    return 'User (Kader)';
  }

  override get namaPeran(): string {
    return 'Kader';
  }

  protected override get daftarHak(): readonly Hak[] {
    return Kader.HAK;
  }
}
