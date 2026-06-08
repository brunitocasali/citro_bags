/**
 * Copia recursos de ebooks/ → public/ebooks/ para que /ebooks/*.css etc. existan en build y en dev.
 * No copia README.md ni el index.html raíz (el markup lo sirve Astro desde ebooks/index.html).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'ebooks');
const destDir = path.join(root, 'public', 'ebooks');

function shouldSkip(relPosix) {
  if (relPosix === 'README.md') return true;
  if (relPosix === 'index.html') return true;
  return false;
}

function copyRecursive(from, to, rel = '') {
  if (!fs.existsSync(from)) {
    console.warn('[sync-ebooks] Carpeta ebooks/ no existe. Saltando.');
    return;
  }
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

  for (const name of fs.readdirSync(from, { withFileTypes: true })) {
    const relPosix = rel ? `${rel}/${name.name}` : name.name;
    if (shouldSkip(relPosix)) continue;

    const srcPath = path.join(from, name.name);
    const destPath = path.join(to, name.name);

    if (name.isDirectory()) {
      copyRecursive(srcPath, destPath, relPosix);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Limpiar destino previo (excepto .gitkeep si queremos conservar carpeta vacía)
if (fs.existsSync(destDir)) {
  for (const name of fs.readdirSync(destDir)) {
    if (name === '.gitkeep') continue;
    const p = path.join(destDir, name);
    fs.rmSync(p, { recursive: true, force: true });
  }
}

copyRecursive(srcDir, destDir);
console.log('[sync-ebooks] OK → public/ebooks/ (sin index.html ni README.md)');
