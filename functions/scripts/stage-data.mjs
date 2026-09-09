/**
 * Stages the data files the API functions read at runtime into _staged/,
 * preserving the repo-relative layout the handlers expect:
 *   _staged/public/data/market-data.json   (market-data endpoint + SPA bundle)
 *   _staged/ips/*.md                       (list-ips / load-ips endpoints)
 *   _staged/data/angel_one/**              (angel-one-snapshot endpoint)
 *
 * _staged/ ships inside the functions directory, so it is uploaded with the
 * function source and available at runtime via DATA_DIR.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const dest = resolve(here, '..', '_staged');

const copies = [
  ['public/data/market-data.json', 'public/data/market-data.json'],
  ['ips', 'ips'],
  ['data/angel_one', 'data/angel_one'],
];

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const [from, to] of copies) {
  const src = join(root, from);
  const target = join(dest, to);
  if (!existsSync(src)) {
    console.warn(`stage-data: WARNING missing ${from} — skipped`);
    continue;
  }
  cpSync(src, target, { recursive: true });
  console.log(`stage-data: ${from} -> _staged/${to}`);
}
console.log('stage-data: done');
