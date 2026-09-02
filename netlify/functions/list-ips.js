/**
 * List saved IPS documents in the local `ips/` folder.
 *
 * GET /api/list-ips
 * Returns: { files: [{ name, updatedAt }] }
 */
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs';
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

    return jsonResponse({ files });
  } catch (err) {
    console.error('List IPS error:', err);
    return errorResponse('Failed to list IPS files', 500);
  }
};
