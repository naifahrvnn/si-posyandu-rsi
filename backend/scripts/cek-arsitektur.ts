/*
 * Pemeriksa aturan lapisan (layer) backend. Jalankan: npm.cmd run arsitektur
 * Gagal (exit 1) bila ada file yang melanggar arah ketergantungan:
 *
 *   Router/Controller -> Validator -> Service -> Repository -> Kueri -> SQL Server
 *
 * Aturan:
 *  1. core/ berdiri sendiri: tidak boleh import dari keamanan/ atau modules/.
 *  2. keamanan/ tidak boleh import dari modules/.
 *  3. Controller tidak menyentuh basis data: tidak import Database, Kueri, atau *Repository.
 *  4. SQL hanya ada di Repository (dan core/Kueri, core/audit/PencatatAudit): file lain tidak boleh berisi "dbo.".
 *  5. Hanya RakitanModul.ts yang merakit controller (tidak ada controller yang import controller lain).
 *  6. Hanya core/Logger.ts yang menulis ke konsol (tidak ada console.log sisa debug).
 *  7. Hanya config/Konfigurasi.ts yang membaca process.env (pengaturan tidak tersebar).
 *  8. config/ tidak mengimpor bagian lain proyek.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const AKAR = join(__dirname, '..', 'src');
const BOLEH_SQL = new Set(['core/Kueri.ts', 'core/audit/PencatatAudit.ts']);

function semuaFile(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? semuaFile(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const pelanggaran: string[] = [];
for (const file of semuaFile(AKAR)) {
  const rel = relative(AKAR, file).replace(/\\/g, '/');
  const isi = readFileSync(file, 'utf8');
  // Komentar tidak dihitung sebagai SQL
  const kode = isi.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const impor = [...isi.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  const langgar = (aturan: string) => pelanggaran.push(`${rel}: ${aturan}`);

  if (rel.startsWith('core/') && impor.some((i) => /\/(keamanan|modules)\//.test(i)))
    langgar('core/ import keamanan/ atau modules/ (aturan 1)');
  if (rel.startsWith('keamanan/') && impor.some((i) => i.includes('/modules/'))) langgar('keamanan/ import modules/ (aturan 2)');
  if (/Controller\.ts$|KelompokRouter\.ts$/.test(rel)) {
    if (impor.some((i) => /\/(Database|Kueri)$|Repository$/.test(i))) langgar('controller menyentuh basis data (aturan 3)');
    if (impor.some((i) => /Controller$/.test(i))) langgar('controller import controller lain (aturan 5)');
  }
  if (!rel.endsWith('Repository.ts') && !BOLEH_SQL.has(rel) && /\bdbo\./.test(kode))
    langgar('berisi SQL di luar Repository (aturan 4)');
  if (rel !== 'core/Logger.ts' && /\bconsole\./.test(kode)) langgar('memakai console di luar Logger (aturan 6)');
  if (rel !== 'config/Konfigurasi.ts' && /process\.env/.test(kode)) langgar('membaca process.env di luar Konfigurasi (aturan 7)');
  if (rel.startsWith('config/') && impor.some((i) => i.startsWith('.')))
    langgar('config/ mengimpor bagian lain proyek (aturan 8)');
}

const jumlah = semuaFile(AKAR).length;
if (pelanggaran.length === 0) {
  console.log(`Arsitektur rapi: ${jumlah} file diperiksa, 0 pelanggaran.`);
} else {
  console.log(`${pelanggaran.length} pelanggaran dari ${jumlah} file:`);
  for (const p of pelanggaran) console.log(`  - ${p}`);
  process.exit(1);
}
