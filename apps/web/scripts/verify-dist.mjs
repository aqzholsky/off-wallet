import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function fail(message) {
  process.stderr.write(`verify-dist: ${message}\n`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const files = walk(dist);
const indexPath = files.find((file) => relative(dist, file) === 'index.html');
if (!indexPath) fail('index.html is missing');
const indexHtml = readFileSync(indexPath, 'utf8');

const textFiles = files.filter((file) => /\.(html|js|css|svg)$/u.test(file));
const forbidden = [
  /<script[^>]+src=["']https?:/iu,
  /<link[^>]+href=["']https?:/iu,
  /url\(\s*["']?https?:/iu,
  /fonts\.googleapis\.com/u,
  /fonts\.gstatic\.com/u,
  /unpkg\.com/u,
  /cdn\.jsdelivr\.net/u,
  /raw\.githubusercontent\.com/u,
];
for (const file of textFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      fail(`${relative(dist, file)} references an external resource: ${pattern}`);
    }
  }
}

const jsFiles = files.filter((file) => file.endsWith('.js'));
if (jsFiles.length === 0) fail('no JavaScript bundle emitted');
const bundle = jsFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
if (!bundle.includes('abandon') || !bundle.includes('zoo')) fail('English wordlist is not inlined');
const japaneseInlined = bundle.includes('あいこくしん') || /\\+u3042\\+u3044\\+u3053/u.test(bundle);
if (!japaneseInlined) fail('Japanese wordlist is not inlined');

for (const file of jsFiles) {
  const rel = relative(dist, file);
  if (!indexHtml.includes(rel) && !indexHtml.includes(`/${rel}`)) {
    fail(`${rel} is not referenced from index.html; the worker or a chunk was emitted separately`);
  }
}

const report = files
  .map((file) => `${String(statSync(file).size).padStart(9)}  ${relative(dist, file)}`)
  .join('\n');
process.stdout.write(`verify-dist: ok\n${report}\n`);
