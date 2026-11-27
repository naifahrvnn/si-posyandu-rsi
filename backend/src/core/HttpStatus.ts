/**
 * Kode status HTTP yang dipakai aplikasi, diberi nama agar tidak ada angka "ajaib" di kode.
 * Pemetaan kode error FSD -> status ada di ErrorCatalog.
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type KodeHttp = (typeof HttpStatus)[keyof typeof HttpStatus];
