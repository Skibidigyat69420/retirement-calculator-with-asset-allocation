/**
 * Generates api/lib/ipsDocs.generated.ts from the markdown docs in ips/.
 * Runs as part of the build (see vercel.json buildCommand) so the read-only
 * API can serve the committed IPS documents without relying on serverless
 * filesystem bundling.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const docsDir = join(root, 'ips');
const outFile = join(root, 'api', 'lib', 'ipsDocs.generated.ts');

let entries;
try {
  entries = await readdir(docsDir, { withFileTypes: true });
} catch {
  entries = [];
}

const docs = [];
for (const e of entries) {
  if (!e.isFile() || !e.name.endsWith('.md')) continue;
  const path = join(docsDir, e.name);
  const [content, st] = await Promise.all([readFile(path, 'utf8'), stat(path)]);
  docs.push({ name: e.name, updatedAt: st.mtime.toISOString(), content });
}

docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

const serialized = JSON.stringify(docs, null, 2);
const output = `/**
 * GENERATED FILE — do not edit by hand.
 * Produced by scripts/generate-ips-docs.mjs from ips/*.md at build time.
 */
export interface EmbeddedIpsDoc {
  name: string;
  updatedAt: string;
  content: string;
}

export const IPS_DOCS: EmbeddedIpsDoc[] = ${serialized};
`;

await mkdir(join(root, 'api', 'lib'), { recursive: true });
await writeFile(outFile, output);
console.log(`generate-ips-docs: embedded ${docs.length} doc(s) -> api/lib/ipsDocs.generated.ts`);
