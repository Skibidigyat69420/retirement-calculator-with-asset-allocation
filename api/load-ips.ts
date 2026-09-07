import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { jsonResponse, methodNotAllowed } from './_shared.ts';

/**
 * GET /api/load-ips?filename=<name>.md — return { content } for a markdown
 * policy document in the ips/ directory. Filename is strictly sanitized:
 * basename only, .md extension required, path traversal rejected with 400.
 */
export default async function handler(request: Request) {
  if (request.method !== 'GET') return methodNotAllowed(request.method);

  const url = new URL(request.url);
  const filename = url.searchParams.get('filename') || '';

  const name = basename(filename);
  const isSafe =
    filename.length > 0 &&
    name === filename &&
    !filename.includes('..') &&
    !filename.includes('\0') &&
    name.endsWith('.md') &&
    name !== '.md';

  if (!isSafe) {
    return jsonResponse({ error: 'Invalid filename. Expected a bare .md file name.' }, { status: 400 });
  }

  try {
    const content = await readFile(join(process.cwd(), 'ips', name), 'utf8');
    return jsonResponse({ content });
  } catch {
    return jsonResponse({ error: `Document not found: ${name}` }, { status: 404 });
  }
}
