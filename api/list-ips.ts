import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { jsonResponse, methodNotAllowed } from './_shared.ts';

/**
 * GET /api/list-ips — list markdown policy documents in the ips/ directory.
 * Returns { files: [{ name, updatedAt }] }; an empty list when the
 * directory does not exist (e.g. on deployments with no committed docs).
 */
export default async function handler(request: Request) {
  if (request.method !== 'GET') return methodNotAllowed(request.method);

  const dir = join(process.cwd(), 'ips');
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return jsonResponse({ files: [] });
  }

  const files = await Promise.all(
    entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
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

  files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return jsonResponse({ files });
}
