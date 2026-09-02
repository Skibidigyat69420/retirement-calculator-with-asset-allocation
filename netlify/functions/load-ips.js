/**
 * Load a specific IPS document from the local `ips/` folder.
 *
 * GET /api/load-ips?filename=IPS-Client-Name.md
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { errorResponse, handleOptions, jsonResponse } from './_utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IPS_DIR = resolve(__dirname, '..', '..', 'ips');

export default async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');

    if (!filename || typeof filename !== 'string') {
      return errorResponse('filename is required', 400);
    }

    const filePath = resolve(IPS_DIR, filename);

    if (!filePath.startsWith(IPS_DIR) || !existsSync(filePath)) {
      return errorResponse('IPS not found', 404);
    }

    const content = readFileSync(filePath, 'utf8');
    return jsonResponse({ filename, content });
  } catch (err) {
    console.error('Load IPS error:', err);
    return errorResponse('Failed to load IPS', 500);
  }
};
