/**
 * Save an IPS document to the local `ips/` folder.
 *
 * POST /api/save-ips
 * Body: { filename: string, content: string }
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { errorResponse, handleOptions, jsonResponse } from './_utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IPS_DIR = resolve(__dirname, '..', '..', 'ips');

function sanitizeFilename(name) {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^\.|\.$/g, '') || 'Untitled'
  );
}

export default async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await request.json();
    const { filename, content } = body || {};

    if (!filename || typeof content !== 'string') {
      return errorResponse('filename and content are required', 400);
    }

    if (!existsSync(IPS_DIR)) {
      mkdirSync(IPS_DIR, { recursive: true });
    }

    const base = sanitizeFilename(filename);
    const safeFilename = base.endsWith('.md') ? base : `${base}.md`;
    const filePath = resolve(IPS_DIR, safeFilename);

    if (!filePath.startsWith(IPS_DIR)) {
      return errorResponse('Invalid filename', 400);
    }

    writeFileSync(filePath, content, 'utf8');

    return jsonResponse({ success: true, filename: safeFilename });
  } catch (err) {
    console.error('Save IPS error:', err);
    return errorResponse('Failed to save IPS', 500);
  }
};
