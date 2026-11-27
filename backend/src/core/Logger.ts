type Level = 'info' | 'warn' | 'error';

/**
 * Pencatat log server. Satu-satunya kelas yang menulis ke konsol, dalam format satu baris JSON
 * { level, waktu, pesan, ...konteks } agar mudah dibaca dan dicari.
 * Detail teknis (stack trace, pesan SQL) hanya masuk ke sini, tidak pernah dikirim ke pengguna.
 *
 * [ENKAPSULASI] Format penulisan disembunyikan di method private tulis().
 */
export class Logger {
  static info(pesan: string, konteks: Record<string, unknown> = {}): void {
    Logger.tulis('info', pesan, konteks);
  }

  static warn(pesan: string, konteks: Record<string, unknown> = {}): void {
    Logger.tulis('warn', pesan, konteks);
  }

  /** galat boleh berupa Error apa pun; pesan dan stack-nya ikut dicatat. */
  static error(pesan: string, galat?: unknown, konteks: Record<string, unknown> = {}): void {
    const detail = galat instanceof Error ? { galat: galat.message, stack: galat.stack } : galat === undefined ? {} : { galat };
    Logger.tulis('error', pesan, { ...konteks, ...detail });
  }

  private static tulis(level: Level, pesan: string, konteks: Record<string, unknown>): void {
    const baris = JSON.stringify({ ...konteks, level, waktu: new Date().toISOString(), pesan });
    if (level === 'error') console.error(baris);
    else if (level === 'warn') console.warn(baris);
    else console.log(baris);
  }
}
