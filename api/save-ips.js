/**
 * Save an IPS document to the local `ips/` folder.
 *
 * POST /api/save-ips
 * Body: { filename: string, content: string }
 *
 * The filename is sanitized and the document is written as Markdown.
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const IPS_DIR = resolve(process.cwd(), 'ips');

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\.|\.$/g, '')
    || 'Untitled';
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, content } = req.body || {};

  if (!filename || typeof content !== 'string') {
    return res.status(400).json({ error: 'filename and content are required' });
  }

  try {
    if (!existsSync(IPS_DIR)) {
      mkdirSync(IPS_DIR, { recursive: true });
    }

    const base = sanitizeFilename(filename);
    const safeFilename = base.endsWith('.md') ? base : `${base}.md`;
    const filePath = resolve(IPS_DIR, safeFilename);

    // Prevent directory traversal outside ips/
    if (!filePath.startsWith(IPS_DIR)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    writeFileSync(filePath, content, 'utf8');

    return res.status(200).json({
      success: true,
      filename: safeFilename,
      path: filePath,
    });
  } catch (err) {
    console.error('Save IPS error:', err);
    return res.status(500).json({ error: 'Failed to save IPS' });
  }
}
