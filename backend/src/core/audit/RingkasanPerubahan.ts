/**
 * Menyusun teks detail untuk log aktivitas: ringkasan data baru dan perubahan "sebelum → sesudah".
 * Kolom log_aktivitas.keterangan hanya NVARCHAR(255), jadi teks dipotong rapi bila terlalu panjang.
 *
 * [ENKAPSULASI] Aturan format (nilai kosong, Ya/Tidak, penyamaran NIK) tersembunyi di kelas ini.
 */
export class RingkasanPerubahan {
  static readonly PANJANG_MAKS = 255;

  /** Kolom yang bukan isian pengguna, jadi tidak dibandingkan. */
  private static readonly ABAIKAN = new Set([
    'id',
    'sasaran_id',
    'pemeriksaan_id',
    'created_at',
    'updated_at',
    'update_at',
    'umur',
    'satuan_umur',
    'dusun_rt_rw',
    'kelompok',
    'faskes_id',
    'status_tindak_lanjut',
    'penanggung_jawab',
  ]);

  /** NIK dan No. KK tidak ditulis utuh di log (data pribadi). */
  private static readonly DISAMARKAN = new Set(['nik', 'no_kk']);

  static samarkan(nilai: string): string {
    return nilai.length > 4 ? `****${nilai.slice(-4)}` : nilai;
  }

  private static teks(kolom: string, v: unknown): string {
    if (v === null || v === undefined || v === '') return '-';
    if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
    const s = String(v);
    return RingkasanPerubahan.DISAMARKAN.has(kolom) ? RingkasanPerubahan.samarkan(s) : s;
  }

  /** "kontak: - → 081234; nama_orang_tua: Ratna → Ratna Dewi". Kosong bila tidak ada yang berubah. */
  static bandingkan(sebelum: Record<string, unknown>, sesudah: Record<string, unknown>): string {
    const beda: string[] = [];
    for (const kolom of Object.keys(sesudah)) {
      if (RingkasanPerubahan.ABAIKAN.has(kolom)) continue;
      const a = RingkasanPerubahan.teks(kolom, sebelum[kolom]);
      const b = RingkasanPerubahan.teks(kolom, sesudah[kolom]);
      if (a !== b) beda.push(`${kolom}: ${a} → ${b}`);
    }
    return beda.join('; ');
  }

  /** Memotong teks agar muat di kolom keterangan. */
  static potong(teks: string): string {
    const maks = RingkasanPerubahan.PANJANG_MAKS;
    return teks.length <= maks ? teks : `${teks.slice(0, maks - 1)}…`;
  }
}
