import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'product', 'migration-roadmap.md');
const content = readFileSync(join(root, 'scripts', 'migration-roadmap-content.md'), 'utf8');

writeFileSync(out, content, 'utf8');
console.log('wrote', out);
