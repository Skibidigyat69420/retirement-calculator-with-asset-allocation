/**
 * Shared helpers for the read-only Vercel serverless API.
 *
 * Uses the classic (req, res) handler signature throughout — empirically
 * verified to work on this deployment, unlike the Web Request/Response
 * handler form, which hangs/crashes at runtime.
 */

import type { VercelResponse } from '@vercel/node';

export function sendJson(res: VercelResponse, body: unknown, status = 200, headers: Record<string, string> = {}) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.send(JSON.stringify(body));
}

export function methodNotAllowed(res: VercelResponse, method: string | undefined) {
  sendJson(res, { error: `Method ${method || 'UNKNOWN'} not allowed. This endpoint is read-only (GET only).` }, 405, {
    Allow: 'GET',
  });
}

/** Read a query param that may arrive as string | string[] | undefined. */
export function queryParam(req: { query: Record<string, unknown> }, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === 'string' ? value : undefined;
}
