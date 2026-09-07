import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { sendJson, methodNotAllowed, queryParam } from './lib/shared.js';
import { IPS_DOCS } from './lib/ipsDocs.generated.js';

/**
 * GET /api/load-ips?filename=<name>.md — return { content } for a markdown
 * policy document in the ips/ directory. Filename is strictly sanitized:
 * basename only, .md extension required, path traversal rejected with 400.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, req.method);

  const filename = queryParam(req, 'filename') || '';

  const name = basename(filename);
  const isSafe =
    filename.length > 0 &&
    name === filename &&
    !filename.includes('..') &&
    !filename.includes('\0') &&
    name.endsWith('.md') &&
    name !== '.md';

  if (!isSafe) {
    return sendJson(res, { error: 'Invalid filename. Expected a bare .md file name.' }, 400);
  }

  try {
    const embedded = IPS_DOCS.find((d) => d.name === name);
    if (embedded) return sendJson(res, { content: embedded.content });
    const content = await readFile(join(process.cwd(), 'ips', name), 'utf8');
    return sendJson(res, { content });
  } catch {
    return sendJson(res, { error: `Document not found: ${name}` }, 404);
  }
}
