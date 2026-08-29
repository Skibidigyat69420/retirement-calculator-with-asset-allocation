/**
 * Load a specific IPS document from the local `ips/` folder.
 *
 * GET /api/load-ips?filename=IPS-Client-Name.md
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IPS_DIR = resolve(__dirname, '..', 'ips');

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

  const { filename } = req.query || {};

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename is required' });
  }

  try {
    const filePath = resolve(IPS_DIR, filename);

    if (!filePath.startsWith(IPS_DIR) || !existsSync(filePath)) {
      return res.status(404).json({ error: 'IPS not found' });
    }

    const content = readFileSync(filePath, 'utf8');
    return res.status(200).json({ filename, content });
  } catch (err) {
    console.error('Load IPS error:', err);
    return res.status(500).json({ error: 'Failed to load IPS' });
  }
}
