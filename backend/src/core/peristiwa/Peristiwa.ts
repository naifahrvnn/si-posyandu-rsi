/**
 * Jenis peristiwa (event) yang diterbitkan aplikasi untuk pengamat (Observer).
 * Setiap peristiwa membawa konteks: siapa (userId), kapan (waktu), dan operasi apa.
 */
interface PeristiwaDasar {
  /** Waktu kejadian, ISO 8601. */
  waktu: string;
  /** user_id pengguna yang login; null bila belum login (mis. login gagal). */
  userId: string | null;
}

export interface PeristiwaPemeriksaan extends PeristiwaDasar {
  jenis: 'pemeriksaan.dicatat';
  kelompok: 'balita' | 'ibu' | 'lansia';
  sasaranId: string;
  pemeriksaanId: string;
  perluDirujuk: boolean;
}

export interface PeristiwaJadwal extends PeristiwaDasar {
  jenis: 'jadwal.diubah';
  aksi: 'tambah' | 'ubah' | 'hapus';
  jadwalId: string;
}

export interface PeristiwaGalat extends PeristiwaDasar {
  jenis: 'galat';
  /** Method + path, mis. "POST /api/v1/balita". */
  operasi: string;
  kode: string;
  pesan: string;
  /** true = error sistem (ERR-SYS-01); false = error yang sudah dikenal (validasi, auth, data). */
  sistem: boolean;
  detail?: unknown;
}

export interface PeristiwaAksesDitolak extends PeristiwaDasar {
  jenis: 'akses.ditolak';
  peran: string;
  hak: string;
  operasi: string;
}

/** [POLIMORFISME] Union bertanda (discriminated union): pengamat membedakan lewat properti jenis. */
export type Peristiwa = PeristiwaPemeriksaan | PeristiwaJadwal | PeristiwaGalat | PeristiwaAksesDitolak;
