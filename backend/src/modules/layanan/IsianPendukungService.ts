import { Pengguna } from '../../keamanan/Pengguna';
import { PencatatAudit } from '../../core/audit/PencatatAudit';
import { RingkasanPerubahan } from '../../core/audit/RingkasanPerubahan';
import { OtorisasiError } from '../../core/errors/OtorisasiError';
import { ValidationError } from '../../core/errors/ValidationError';
import { Pemeriksaan } from '../pemeriksaan/Pemeriksaan';
import { FaskesRepository } from './FaskesRepository';
import { IsianPendukung, IsianPendukungInput } from './IsianPendukung';
import { IsianPendukungRepository } from './IsianPendukungRepository';
import { KunjunganService } from './KunjunganService';

/**
 * Catat isian pendukung (FSD-2.10, 2.17, 2.23): skrining TBC, status rujukan, catatan edukasi.
 * Satu isian per pemeriksaan; simpan ulang memperbarui isian yang sama (AF-2, NFR-013).
 * Bila dirujuk, tujuan rujukan disimpan di tabel rujukan (faskes).
 * Balita dengan BB/U < -2 SD atau > +1 SD wajib dirujuk (status_rujukan = true).
 *
 * [PEWARISAN] IsianPendukungService extends KunjunganService.
 */
export class IsianPendukungService<P extends Pemeriksaan> extends KunjunganService<P> {
  async simpan(sasaranId: string, pemeriksaanId: string, input: IsianPendukungInput, pengguna: Pengguna) {
    return this.db.transaksi(pengguna, async (k) => {
      const pemeriksaan = await this.pastikanPemeriksaan(k, sasaranId, pemeriksaanId);
      // [POLIMORFISME] perluDirujuk dijawab oleh subclass pemeriksaan (balita: garis KMS; lainnya: tidak)
      if (pemeriksaan.perluDirujuk && input.status_rujukan !== true) {
        throw new ValidationError('ERR-VAL-16', 'status_rujukan');
      }
      if (input.status_rujukan === true && !(await new FaskesRepository(k).ada(input.faskes_id as string))) {
        throw new ValidationError('ERR-VAL-06', 'faskes_id'); // faskes tujuan tidak terdaftar
      }
      const repo = new IsianPendukungRepository(k);
      let isian = await repo.cari(this.kelompok, pemeriksaanId);
      const baru = isian === null;
      const sebelum = isian ? (isian.toJSON() as Record<string, unknown>) : null;
      // Membatalkan rujukan = menghapus baris rujukan: hanya Koordinator (Kader dilarang menghapus data)
      if (isian?.props.rujukan && input.status_rujukan !== true && !pengguna.boleh('hapus')) {
        throw new OtorisasiError('ERR-AUTH-03');
      }
      if (isian) {
        isian.isiUlang(input);
        await repo.perbarui(isian);
      } else {
        isian = IsianPendukung.buat(input, pemeriksaanId);
        await repo.simpan(this.kelompok, isian);
      }
      await repo.simpanRujukan(isian, pemeriksaan.tanggalPeriksa);
      const tersimpan = (await repo.cari(this.kelompok, pemeriksaanId)) ?? isian;
      const json = tersimpan.toJSON() as Record<string, unknown>;
      const rujuk = json.status_rujukan ? `dirujuk ke ${json.nama_faskes ?? '-'}` : 'tidak dirujuk';
      await PencatatAudit.catat(k, pengguna.userId, {
        jenis: baru ? 'Input' : 'Edit',
        entitas: 'isian_pendukung',
        idData: tersimpan.props.id,
        keterangan: baru
          ? `Isian pendukung ${this.kelompok} (pemeriksaan ${pemeriksaan.tanggalPeriksa}): ${rujuk}` +
            (json.catatan_edukasi ? `; catatan: ${json.catatan_edukasi}` : '')
          : `Ubah isian pendukung ${this.kelompok} (pemeriksaan ${pemeriksaan.tanggalPeriksa}): ` +
            (RingkasanPerubahan.bandingkan(sebelum ?? {}, json) || 'disimpan tanpa perubahan'),
      });
      return { baru, isian: tersimpan.toJSON() };
    });
  }
}
