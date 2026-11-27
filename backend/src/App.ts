import cors from 'cors';
import { Server } from 'node:http';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { Konfigurasi } from './config/Konfigurasi';
import { ErrorHandler } from './core/ErrorHandler';
import { Logger } from './core/Logger';
import { openapiSpec } from './docs/openapi';
import { RakitanModul } from './RakitanModul';

/**
 * Aplikasi Express. Isinya hanya tiga langkah yang mudah ditelusuri:
 *   1. middleware global (CORS, JSON, halaman dokumentasi API);
 *   2. pasang setiap modul di jalurnya (daftar modul ada di RakitanModul);
 *   3. penangan URL tidak dikenal dan penangan error terpusat (format JSON standar, AC-03).
 *
 * [KOMPOSISI] Objek Express dibuat dan dimiliki App.
 */
export class App {
  readonly express: Express;
  private readonly rakitan: RakitanModul;

  constructor(rakitan = new RakitanModul()) {
    this.rakitan = rakitan;
    this.express = express();

    // 1. Middleware global
    this.express.use(
      cors({
        origin: [...Konfigurasi.CORS_ORIGIN],
        allowedHeaders: ['Content-Type', 'x-id-sesi'],
      }),
    );
    this.express.use(express.json({ limit: Konfigurasi.BATAS_BODY }));
    // Halaman uji API di browser: http://localhost:3000/docs
    this.express.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'API Posyandu' }));
    this.express.get('/', (_req, res) => res.redirect('/docs'));

    // 2. Modul fitur. [POLIMORFISME] Setiap modul diperlakukan sama lewat interface Modul.
    for (const modul of rakitan.modul()) this.express.use(modul.jalur, modul.router);

    // 3. Error
    const errorHandler = new ErrorHandler(rakitan.peristiwa);
    this.express.use(errorHandler.tidakDitemukan); // URL tidak terdaftar -> JSON 404
    this.express.use(errorHandler.handle);
  }

  listen(port: number): Server {
    const server = this.express.listen(port, () => Logger.info(`API Posyandu berjalan di http://localhost:${port}`));
    // Sesi yang lewat 8 jam diakhiri dan dicatat sebagai Logout setiap 10 menit
    this.rakitan.pengakhirSesi.mulaiBerkala();
    return server;
  }

  /** Dipanggil saat server dimatikan: hentikan penyapu sesi dan tutup pool basis data. */
  async berhenti(): Promise<void> {
    this.rakitan.pengakhirSesi.berhenti();
    await this.rakitan.tutup();
  }
}
