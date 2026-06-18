#!/usr/bin/env node
import { readdir, readFile } from 'fs/promises';
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
const bad = [];

for (const file of files) {
  const buffer = await readFile(file);
  const encoding = detectUtf16(buffer);
  if (encoding) bad.push({ file: relative(root, file), encoding });
}

if (bad.length > 0) {
  console.error('UTF-16 text files detected (Node/Next/dotenv require UTF-8):');
  for (const { file, encoding } of bad) {
    console.error(`  ${file} (${encoding})`);
  }
  console.error('');
  console.error('Fix with: npm run encoding:fix');
  process.exit(1);
}

console.log(`Encoding OK: ${files.length} text file(s) checked.`);
