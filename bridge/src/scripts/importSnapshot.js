import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Copies a PlusOne SQLite export into bridge/data/plusone_backup.sqlite.
 *
 * SAFETY GUARANTEES:
 *  - Uses fs.copyFileSync with COPYFILE_EXCL-free plain copy (source untouched, opened read-only by the OS copy).
 *  - Never opens the source file for writing.
 *  - Never touches anything under the PlusOne extension folder — this script
 *    only knows about the .sqlite file path you give it.
 *  - Keeps the previous snapshot as a timestamped backup instead of overwriting silently.
 *
 * Usage: npm run sync -- /path/to/plusone_backup_fixed.sqlite
 */
const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Usage: npm run sync -- /path/to/plusone_export.sqlite');
  process.exit(1);
}
if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`);
  process.exit(1);
}

const dataDir = path.resolve('data');
fs.mkdirSync(dataDir, { recursive: true });

const target = path.join(dataDir, 'plusone_backup.sqlite');

if (fs.existsSync(target)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archived = path.join(dataDir, `plusone_backup.${stamp}.sqlite`);
  fs.copyFileSync(target, archived);
  console.log(`[sync] Archived previous snapshot -> ${archived}`);
}

fs.copyFileSync(sourcePath, target);

const hash = crypto.createHash('md5').update(fs.readFileSync(sourcePath)).digest('hex');
console.log(`[sync] Copied ${sourcePath} -> ${target}`);
console.log(`[sync] Source file md5: ${hash} (unchanged — copy is one-directional)`);
