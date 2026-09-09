/**
 * Pure request router for the public `api` Cloud Function.
 *
 * Shared between the Firebase entrypoint (functions/src/index.ts) and local
 * smoke tests (functions/test/router.test.mjs) — no firebase-functions
 * imports here on purpose, so it runs under plain Node.
 *
 * Returns true when the request was fully handled; returns false for
 * `/api/v1/**`, which the entrypoint forwards to the practitioner Fastify app.
 */
import pingHandler from '../../api/ping.js';
import marketDataHandler from '../../api/market-data.js';
import listIpsHandler from '../../api/list-ips.js';
import loadIpsHandler from '../../api/load-ips.js';
import angelSnapshotHandler from '../../api/angel-one-snapshot.js';

export interface RouterReq {
  method?: string;
  path: string;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
  body?: unknown;
}

export interface RouterRes {
  status(code: number): RouterRes;
  setHeader(name: string, value: string): void;
  send(body: string | Buffer): void;
  json(body: unknown): void;
}

const ANGEL_BASE = 'https://apiconnect.angelone.in';

/** Request headers forwarded verbatim to the Angel One proxy target. */
const ANGEL_FORWARD_HEADERS = [
  'content-type',
  'accept',
  'authorization',
  'x-api-key',
  'x-privatekey',
  'x-clientcode',
  'x-feedtoken',
  'x-source',
];

/** Reverse proxy /api/angelone/<path> → https://apiconnect.angelone.in/<path>. */
async function proxyAngelOne(req: RouterReq, res: RouterRes): Promise<void> {
  const upstreamPath = req.path.replace(/^\/api\/angelone/, '');
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') qs.set(key, value);
  }
  const queryString = qs.size > 0 ? `?${qs.toString()}` : '';
  const target = `${ANGEL_BASE}${upstreamPath}${queryString}`;

  const headers: Record<string, string> = {};
  for (const name of ANGEL_FORWARD_HEADERS) {
    const value = req.headers[name];
    if (typeof value === 'string') headers[name] = value;
  }

  const method = req.method ?? 'GET';
  const upstream = await fetch(target, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
  });

  res.status(upstream.status);
  upstream.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'content-encoding' && name.toLowerCase() !== 'transfer-encoding') {
      res.setHeader(name, value);
    }
  });
  res.send(Buffer.from(await upstream.arrayBuffer()));
}

function sendNotFound(res: RouterRes, path: string): void {
  res.status(404);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ error: `Unknown API route: ${path}` }));
}

export async function routeApiRequest(req: RouterReq, res: RouterRes): Promise<boolean> {
  const path = req.path;

  if (path === '/api/ping') {
    await pingHandler(req as never, res as never);
    return true;
  }
  if (path === '/api/market-data') {
    await marketDataHandler(req as never, res as never);
    return true;
  }
  if (path === '/api/list-ips') {
    await listIpsHandler(req as never, res as never);
    return true;
  }
  if (path === '/api/load-ips') {
    await loadIpsHandler(req as never, res as never);
    return true;
  }
  if (path === '/api/angel-one-snapshot') {
    await angelSnapshotHandler(req as never, res as never);
    return true;
  }
  if (path.startsWith('/api/angelone/')) {
    await proxyAngelOne(req, res);
    return true;
  }
  if (path.startsWith('/api/v1/')) {
    return false; // handled by the practitioner Fastify app
  }

  sendNotFound(res, path);
  return true;
}
