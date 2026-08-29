import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Serves the most recent Angel One SELECT * snapshot from data/angel_one/{timestamp}/.
 * Returns 404 if no snapshot has been generated yet.
 *
 * Query params:
 *   file - specific file inside the snapshot (e.g., profile.json, holdings.json)
 *          defaults to snapshot.json which contains the index and metadata.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const baseDir = resolve(process.cwd(), 'data', 'angel_one');
    const entries = readdirSync(baseDir)
      .map((name) => ({ name, path: resolve(baseDir, name) }))
      .filter((entry) => statSync(entry.path).isDirectory())
      .sort((a, b) => statSync(b.path).mtimeMs - statSync(a.path).mtimeMs);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'No Angel One snapshot found. Run npm run fetch:angel:all first.' });
    }

    const latestDir = entries[0].path;
    const { file = 'snapshot.json' } = req.query;
    const filePath = resolve(latestDir, file);

    // Basic path traversal guard.
    if (!filePath.startsWith(latestDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Angel One snapshot API error:', err);
    return res.status(500).json({ error: 'Failed to read Angel One snapshot' });
  }
}
