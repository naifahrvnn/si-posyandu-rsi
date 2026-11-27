import { AppError } from './AppError';
import { DataError } from './DataError';
import { OtorisasiError } from './OtorisasiError';
import { SystemError } from './SystemError';
import { ValidationError } from './ValidationError';

/** Hasil terjemahan: galat untuk pengguna + catatan teknis untuk log server. */
export interface HasilTerjemahan {
  galat: AppError;
  /** Keterangan singkat penyebab, untuk log server (tidak dikirim ke pengguna). */
  penyebab: string;
  /** true = galat tak terduga di server (perlu diperiksa pengembang). */
  sistem: boolean;
  /** true = ditolak kebijakan RLS basis data (percobaan akses ikut dicatat). */
  ditolakRls: boolean;
}

/** Bentuk galat dari library mssql dan body-parser yang dibaca di sini. */
interface GalatMentah {
  number?: number;
  code?: string;
  type?: string;
  name?: string;
  message?: string;
}

/**
 * Menerjemahkan galat apa pun menjadi AppError dengan kode katalog FSD.
 * Pengguna hanya menerima pesan katalog; nama tabel, query, dan stack trace tidak pernah ikut terkirim.
 *
 * [ENKAPSULASI] Nomor galat SQL Server dan kode koneksi disimpan sebagai konstanta private.
 * Dipisah dari ErrorHandler agar satu kelas satu tugas: kelas ini memetakan, ErrorHandler mengirim respons.
 */
export class PenerjemahGalat {
  /** Ditolak block predicate Row-Level Security. */
  private static readonly SQL_RLS_DITOLAK = 33504;
  /** Constraint dilanggar (termasuk foreign key). */
  private static readonly SQL_CONSTRAINT = 547;
  /** Unique index / primary key dilanggar (data ganda). */
  private static readonly SQL_DATA_GANDA = [2601, 2627];
  /** Kode library mssql bila basis data tidak bisa dihubungi atau query melewati batas waktu. */
  private static readonly KODE_KONEKSI = [
    'ESOCKET',
    'ETIMEOUT',
    'ELOGIN',
    'ECONNCLOSED',
    'ENOTOPEN',
    'EINSTLOOKUP',
    'ECONNREFUSED',
    'ECONNRESET',
  ];

  static terjemahkan(err: unknown): HasilTerjemahan {
    const hasil = (galat: AppError, penyebab: string, sistem = false, ditolakRls = false): HasilTerjemahan => ({
      galat,
      penyebab,
      sistem,
      ditolakRls,
    });

    if (err instanceof AppError) return hasil(err, err.details.map((d) => d.code).join(','));

    const g = (err ?? {}) as GalatMentah;
    // Galat dari pembaca body JSON (express.json)
    if (g.type === 'entity.parse.failed') return hasil(new ValidationError('ERR-VAL-17'), 'Body JSON rusak');
    if (g.type === 'entity.too.large') return hasil(new ValidationError('ERR-VAL-18'), 'Body melebihi batas ukuran');

    // Galat SQL Server
    if (g.number === PenerjemahGalat.SQL_RLS_DITOLAK) {
      return hasil(new OtorisasiError('ERR-AUTH-03'), 'Ditolak kebijakan RLS basis data', false, true);
    }
    if (g.number === PenerjemahGalat.SQL_CONSTRAINT && /DELETE statement conflicted with the REFERENCE/i.test(g.message ?? '')) {
      return hasil(new DataError('ERR-DATA-06'), 'Hapus ditolak foreign key');
    }
    if (g.number !== undefined && PenerjemahGalat.SQL_DATA_GANDA.includes(g.number)) {
      return hasil(new DataError('ERR-DATA-11'), 'Data ganda ditolak unique index');
    }
    if ((g.code && PenerjemahGalat.KODE_KONEKSI.includes(g.code)) || g.name === 'ConnectionError') {
      return hasil(new SystemError('ERR-SYS-01'), `Basis data tidak tersedia (${g.code ?? g.name})`, true);
    }

    // Selain itu: galat tak terduga di kode server
    return hasil(new SystemError('ERR-SYS-04'), g.message ?? String(err), true);
  }
}
