import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sendJson, methodNotAllowed } from './lib/shared.js';
import { IPS_DOCS } from './lib/ipsDocs.generated.js';

/**
 * GET /api/list-ips — list markdown policy documents in the ips/ directory.
 * Returns { files: [{ name, updatedAt }] }; an empty list when the
 * directory does not exist (e.g. on deployments with no committed docs).
 *
 * Documents committed in ips/ are embedded at build time (see
 * scripts/generate-ips-docs.mjs), so they are served even when the
 * serverless filesystem does not carry the directory. Additional docs
 * found on disk (e.g. locally generated snapshots) are merged in.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, req.method);

  const embedded = IPS_DOCS.map((d) => ({ name: d.name, updatedAt: d.updatedAt }));
  const embeddedNames = new Set(embedded.map((f) => f.name));

  let diskFiles: Array<{ name: string; updatedAt: string }> = [];
  try {
    const dir = join(process.env.DATA_DIR ?? process.cwd(), 'ips');
    const entries = await readdir(dir, { withFileTypes: true });
    diskFiles = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith('.md') && !embeddedNames.has(e.name))
        .map(async (e) => {
          let updatedAt = new Date(0).toISOString();
          try {
            updatedAt = (await stat(join(dir, e.name))).mtime.toISOString();
          } catch {
            // keep epoch fallback
          }
          return { name: e.name, updatedAt };
        }),
    );
  } catch {
    // no ips/ directory on disk — embedded docs only
  }

  const files = [...embedded, ...diskFiles].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  // `embedded` count doubles as a deployment marker: 2 means the build-time
  // generator ran against the committed ips/ docs on this deployment.
  sendJson(res, { files, embedded: IPS_DOCS.length });
}
