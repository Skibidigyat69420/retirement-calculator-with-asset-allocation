/**
 * List saved IPS documents in the local `ips/` folder.
 *
 * GET /api/list-ips
 * Returns: { files: [{ name, updatedAt }] }
 */
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const IPS_DIR = resolve(process.cwd(), 'ips');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!existsSync(IPS_DIR)) {
      mkdirSync(IPS_DIR, { recursive: true });
    }

    const files = readdirSync(IPS_DIR)
      .filter((name) => name.endsWith('.md'))
      .map((name) => {
        const stat = statSync(resolve(IPS_DIR, name));
        return {
          name,
          updatedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.status(200).json({ files });
  } catch (err) {
    console.error('List IPS error:', err);
    return res.status(500).json({ error: 'Failed to list IPS files' });
  }
}
