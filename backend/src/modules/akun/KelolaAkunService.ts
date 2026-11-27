import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { RingkasanPerubahan } from '../../core/audit/RingkasanPerubahan';
import { Database } from '../../core/Database';
import { DataError } from '../../core/errors/DataError';
import { Password } from '../../keamanan/Password';
import { Pengguna } from '../../keamanan/Pengguna';
import { Uuid } from '../../core/Uuid';
import { Akun, PERAN_AWAL, StatusAkun } from './Akun';
import { AkunRepository } from './AkunRepository';
import { TambahAkunInput, UbahAkunInput } from './AkunValidator';

/**
 * Kelola Akun Pengguna (FSD-2.4, SCR-18). Hanya Super User (BR-05): dicek di rute (AksesPeran 'kelola_akun').
 * Setiap perubahan dicatat ke log aktivitas dalam transaksi yang sama (BR-03).
 *
 * [AGREGASI] Database dibuat di luar (RakitanModul) dan dipakai bersama.
 * [ASOSIASI] Pengguna (Super User yang login) hanya dipakai sebagai parameter.
 * [ASINKRON] Semua method async; pemeriksaan yang tidak saling bergantung dijalankan bersamaan (Promise.all).
 */
export class KelolaAkunService {
  constructor(private readonly db: Database) {}

  /** Tabel daftar akun: nama, username/NIK, peran, status. */
  async daftar(pengguna: Pengguna) {
    const akun = await new AkunRepository(await this.db.kueri()).daftar();
    return akun.map((a) => a.toJSON(pengguna));
  }

  /** Pilihan "kader terdaftar" pada Tambah Akun. */
  async kaderTanpaAkun() {
    return new AkunRepository(await this.db.kueri()).daftarKaderTanpaAkun();
  }

  /**
   * Main Flow Step 2-4: akun baru berstatus Aktif.
   * - sumber 'kader_terdaftar': akun untuk kader yang sudah ada di tabel kader dan belum punya akun.
   * - sumber 'petugas_baru': data petugas + kader dibuat dulu, lalu akunnya (satu transaksi).
   * EF-2: username/NIK sudah dipakai -> ERR-DATA-03. EF-5: password awal < 8 karakter -> ERR-VAL-07.
   * Kader tidak ditemukan atau sudah punya akun -> ERR-DATA-08.
   */
  async tambah(input: TambahAkunInput, pengguna: Pengguna) {
    const password = Password.baru(input.password_awal, 'password_awal');
    const hash = await password.hash();
    const peran = input.peran ?? PERAN_AWAL;

    return this.db.transaksi(pengguna, async (k) => {
      const repo = new AkunRepository(k);
      const [dipakai, namaKader] = await Promise.all([
        repo.usernameDipakai(input.username),
        input.sumber === 'kader_terdaftar' ? repo.namaKaderTanpaAkun(input.petugas_id) : Promise.resolve(null),
      ]);
      if (dipakai) throw new DataError('ERR-DATA-03', 'username');
      if (input.sumber === 'kader_terdaftar' && namaKader === null) throw new DataError('ERR-DATA-08', 'petugas_id');

      const petugasId =
        input.sumber === 'kader_terdaftar'
          ? input.petugas_id
          : await repo.buatPetugasKader({
              nama: input.nama,
              jenisKelamin: input.jenis_kelamin,
              jabatanKader: input.jabatan_kader,
            });
      const userId = await repo.buat({ username: input.username, passwordHash: hash, peran, petugasId });
      const akun = await this.ambil(repo, userId);

      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Input',
        entitas: 'pengguna',
        idData: userId,
        keterangan:
          `Tambah akun ${akun.username} (${akun.labelPeran}) untuk ${akun.nama}` +
          (input.sumber === 'petugas_baru' ? `; petugas baru, jabatan ${input.jabatan_kader}` : '; kader terdaftar'),
      });
      return akun.toJSON(pengguna);
    });
  }

  /** AF-1: ubah nama, username/NIK, atau peran. */
  async ubah(id: string, perubahan: UbahAkunInput, pengguna: Pengguna) {
    Uuid.pastikan('ERR-DATA-07', id);
    return this.db.transaksi(pengguna, async (k) => {
      const repo = new AkunRepository(k);
      const [akun, bentrok] = await Promise.all([
        repo.cariById(id, true),
        perubahan.username ? repo.usernameDipakai(perubahan.username, id) : Promise.resolve(false),
      ]);
      if (!akun) throw new DataError('ERR-DATA-07');
      if (bentrok) throw new DataError('ERR-DATA-03', 'username');

      const sebelum = akun.isianAudit;
      akun.terapkanPerubahan(perubahan, pengguna);
      await repo.perbarui(akun);
      const beda = RingkasanPerubahan.bandingkan(sebelum, akun.isianAudit);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Edit',
        entitas: 'pengguna',
        idData: id,
        keterangan: `Ubah akun ${akun.username}: ${beda || 'disimpan tanpa perubahan'}`,
      });
      return (await this.ambil(repo, id)).toJSON(pengguna);
    });
  }

  /** AF-2: nonaktifkan / aktifkan kembali. EF-4: akun sendiri tidak boleh dinonaktifkan (ERR-DATA-05). */
  async ubahStatus(id: string, status: StatusAkun, pengguna: Pengguna) {
    Uuid.pastikan('ERR-DATA-07', id);
    return this.db.transaksi(pengguna, async (k) => {
      const repo = new AkunRepository(k);
      const akun = await repo.cariById(id, true);
      if (!akun) throw new DataError('ERR-DATA-07');
      const sebelum = akun.status;
      akun.ubahStatus(status, pengguna);
      await repo.perbaruiStatus(id, akun.status);
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: 'Edit',
        entitas: 'pengguna',
        idData: id,
        keterangan:
          sebelum === status
            ? `Status akun ${akun.username} tetap ${status}`
            : `${status === 'Nonaktif' ? 'Nonaktifkan' : 'Aktifkan kembali'} akun ${akun.username} (status_akun: ${sebelum} → ${status})`,
      });
      return (await this.ambil(repo, id)).toJSON(pengguna);
    });
  }

  private async ambil(repo: AkunRepository, id: string): Promise<Akun> {
    const akun = await repo.cariById(id);
    if (!akun) throw new DataError('ERR-DATA-07');
    return akun;
  }
}
