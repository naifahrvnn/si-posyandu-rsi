/*
 * Peta konsep OOP: mencari tanda [KONSEP] di komentar kode lalu menampilkan lokasinya.
 * Jalankan: npm.cmd run oop
 * Dipakai untuk memeriksa bahwa kedelapan konsep OOP benar-benar ada di kode.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const AKAR = join(__dirname, '..', 'src');
const KONSEP = [
  'ENKAPSULASI',
  'POLIMORFISME',
  'OVERRIDING',
  'OVERLOADING',
  'ASINKRON',
  'ASOSIASI',
  'AGREGASI',
  'KOMPOSISI',
  'PEWARISAN',
  'ABSTRAKSI',
  'DESIGN PATTERN',
] as const;

function semuaFile(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? semuaFile(p) : p.endsWith('.ts') ? [p] : [];
  });
}

const temuan = new Map<string, string[]>(KONSEP.map((k) => [k, []]));
for (const file of semuaFile(AKAR)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((baris, i) => {
      for (const k of KONSEP) {
        if (baris.includes(`[${k}`)) temuan.get(k)!.push(`${relative(AKAR, file).replace(/\\/g, '/')}:${i + 1}`);
      }
    });
}

let kurang = 0;
for (const [k, lokasi] of temuan) {
  console.log(`\n${k} (${lokasi.length})`);
  if (lokasi.length === 0) kurang++;
  for (const l of lokasi) console.log(`  - src/${l}`);
}
console.log(kurang === 0 ? '\nSemua konsep ditemukan.' : `\n${kurang} konsep belum ditemukan.`);
process.exit(kurang === 0 ? 0 : 1);
