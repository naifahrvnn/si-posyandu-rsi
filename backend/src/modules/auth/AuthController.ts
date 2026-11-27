import { Request, Response, Router } from 'express';
import { HttpResponse } from '../../core/HttpResponse';
import { AuthService } from './AuthService';
import { SesiMiddleware } from '../../keamanan/SesiMiddleware';
import { LoginValidator } from './LoginValidator';
import { AWALAN_API, Modul } from '../../core/Modul';

/** Rute /api/v1/auth: login (publik) dan logout (wajib sesi). */
export class AuthController implements Modul {
  readonly jalur = `${AWALAN_API}/auth`;
  readonly router: Router;
  /** [KOMPOSISI] Validator dibuat dan dimiliki controller ini; tidak dipakai bersama objek lain. */
  private readonly validator = new LoginValidator();

  constructor(
    private readonly service: AuthService,
    sesi: SesiMiddleware,
  ) {
    this.router = Router();
    this.router.post('/login', this.login);
    this.router.post('/logout', sesi.handle, this.logout);
  }

  private readonly login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = this.validator.validasi(req.body);
    HttpResponse.sukses(res, await this.service.login(username, password), 'Login berhasil.');
  };

  private readonly logout = async (_req: Request, res: Response): Promise<void> => {
    await this.service.logout(SesiMiddleware.idSesiDari(res), SesiMiddleware.penggunaDari(res));
    HttpResponse.sukses(res, null, 'Logout berhasil.');
  };
}
