import { Konfigurasi } from './config/Konfigurasi';
import { Logger } from './core/Logger';
import { App } from './App';

const app = new App();
const server = app.listen(Konfigurasi.PORT);

/** Galat yang lolos dari semua try/catch tetap dicatat, tidak hilang diam-diam. */
process.on('unhandledRejection', (alasan) => Logger.error('Promise ditolak tanpa penanganan', alasan));
process.on('uncaughtException', (err) => Logger.error('Galat tidak tertangani', err));

/** Ctrl+C atau perintah stop: selesaikan request yang berjalan, lalu tutup koneksi basis data. */
async function matikan(sinyal: string): Promise<void> {
  Logger.info(`Menerima ${sinyal}, server dimatikan`);
  server.close();
  await app.berhenti();
  process.exit(0);
}
process.on('SIGINT', () => void matikan('SIGINT'));
process.on('SIGTERM', () => void matikan('SIGTERM'));
