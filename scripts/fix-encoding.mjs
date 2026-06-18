#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname, relative } from 'path';

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.scss', '.md', '.mdc',
  '.yml', '.yaml', '.html', '.sql', '.graphql', '.toml', '.txt',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nx', 'coverage', '.turbo', '.cache',
]);

function isTextFile(filePath) {
  const base = filePath.split(/[/\\]/).pop() ?? '';
  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base === 'Dockerfile' || base.endsWith('.Dockerfile')) return true;
  if (TEXT_EXTENSIONS.has(extname(filePath))) return true;
  if (base === '.editorconfig' || base === '.gitattributes' || base === '.gitignore') return true;
  return false;
}

function detectUtf16(buffer) {
  if (buffer.length < 2) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf16le-bom';
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return 'utf16be-bom';
  const sample = Math.min(buffer.length, 512);
  let nullEven = 0;
  let nullOdd = 0;
  for (let i = 0; i < sample; i++) {
    if (buffer[i] === 0) (i % 2 === 1 ? nullOdd++ : nullEven++);
  }
  if (nullOdd > 8 && nullOdd > nullEven * 4) return 'utf16le-heuristic';
  return null;
}

function decodeUtf16(buffer, kind) {
  if (kind === 'utf16be-bom') {
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    let text = swapped.toString('utf16le');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return text;
  }
  let text = buffer.toString('utf16le');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (isTextFile(full)) out.push(full);
  }
  return out;
}

const root = process.cwd();
const files = await walk(root);
let fixed = 0;

for (const file of files) {
  const buffer = await readFile(file);
  const kind = detectUtf16(buffer);
  if (!kind) continue;
  const text = decodeUtf16(buffer, kind);
  await writeFile(file, text, 'utf8');
  console.log(`fixed: ${relative(root, file)} (${kind})`);
  fixed++;
}

console.log(fixed > 0 ? `Converted ${fixed} file(s) to UTF-8.` : 'No UTF-16 files found.');
