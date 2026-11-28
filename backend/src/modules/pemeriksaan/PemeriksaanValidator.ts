import { ValidatorDasar } from '../../core/ValidatorDasar';

/**
 * Kontrak validator pemeriksaan.
 * [PEWARISAN] Validator tiap kelompok mewarisi ValidatorDasar dan mengisi validasi().
 */
export abstract class PemeriksaanValidator<In> extends ValidatorDasar {
  abstract validasi(body: unknown): In;
}
