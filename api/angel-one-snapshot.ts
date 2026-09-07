import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { jsonResponse, methodNotAllowed } from './lib/shared.js';

/**
 * GET /api/angel-one-snapshot — return the newest local Angel One snapshot.
 *
 * Snapshot directories under data/angel_one/<YYYYMMDD_HHMMSS>/ contain a
 * snapshot.json index plus one JSON file per API response. This endpoint
 * returns the index shape { timestamp, client_code, files } with the six
 * top-level JSON documents (profile, rms, holdings, positions, order_book,
 * trade_book) inlined as raw JSON strings — exactly what src/pages/AngelData.tsx
 * parses. Returns 404 JSON when no snapshot exists (e.g. on Vercel, where
 * data/angel_one is not committed).
 */

const INLINE_KEYS = ['profile', 'rms', 'holdings', 'positions', 'order_book', 'trade_book'] as const;

interface SnapshotIndex {
  timestamp: string;
  client_code: string;
  files: Record<string, string>;
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') return methodNotAllowed(request.method);

  const root = join(process.cwd(), 'data', 'angel_one');

  let dirs: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return jsonResponse({ error: 'No Angel One snapshot available' }, { status: 404 });
  }

  // Directory names are timestamped YYYYMMDD_HHMMSS, so lexical order is chronological.
  dirs.sort();
  if (dirs.length === 0) {
    return jsonResponse({ error: 'No Angel One snapshot available' }, { status: 404 });
  }

  try {
    const newest = join(root, dirs[dirs.length - 1]);
    const index = JSON.parse(await readFile(join(newest, 'snapshot.json'), 'utf8')) as SnapshotIndex;

    const files: Record<string, string> = { ...(index.files || {}) };
    for (const key of INLINE_KEYS) {
      const rel = index.files?.[key];
      if (!rel) continue;
      try {
        files[key] = await readFile(join(newest, rel), 'utf8');
      } catch {
        // leave the index value in place if the file is unreadable
      }
    }

    return jsonResponse({ timestamp: index.timestamp, client_code: index.client_code, files });
  } catch {
    return jsonResponse({ error: 'No Angel One snapshot available' }, { status: 404 });
  }
}
