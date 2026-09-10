/**
 * Standalone server for the public utility API (no Firebase required).
 *
 * Serves the same routes as the Firebase `api` function — ping, market-data,
 * list-ips, load-ips, angel-one-snapshot, and the /api/angelone/** reverse
 * proxy — by running the tested router-shim bundle under plain Node. Used by
 * functions/Dockerfile for the docker-compose `api-utils` service.
 */
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DATA_DIR ??= resolve(dirname(fileURLToPath(import.meta.url)), '_staged');

const { routeApiRequest } = await import('./lib/router-shim.mjs');

function readJsonBody(req) {
  return new Promise((resolveBody) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) return resolveBody(undefined);
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolveBody(undefined);
      }
    });
    req.on('error', () => resolveBody(undefined));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await readJsonBody(req);

  const compatRes = {
    status(code) {
      res.statusCode = code;
      return compatRes;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    send(payload) {
      if (res.writableEnded) return;
      if (payload === undefined || payload === null) {
        res.end();
      } else if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
        res.end(payload);
      } else {
        res.end(JSON.stringify(payload));
      }
    },
    json(payload) {
      compatRes.setHeader('content-type', 'application/json');
      compatRes.send(JSON.stringify(payload));
    },
  };

  try {
    const handled = await routeApiRequest(
      {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        headers: req.headers,
        body,
      },
      compatRes,
    );
    if (!handled) {
      compatRes.status(404).json({ error: 'Unknown API route' });
    }
  } catch (err) {
    if (!res.writableEnded) {
      compatRes.status(500).json({
        error: { message: err instanceof Error ? err.message : 'Internal error' },
      });
    }
  }
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, '0.0.0.0', () => {
  console.log(`api-utils listening on 0.0.0.0:${port} (DATA_DIR=${process.env.DATA_DIR})`);
});
