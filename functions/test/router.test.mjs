/**
 * Smoke tests for the Firebase API router — runs under plain Node
 * (node --test functions/test) with mocked req/res objects. Verifies routing,
 * the market-data filtering pipeline, IPS fallbacks, and that /api/v1/**
 * correctly falls through to the practitioner app.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DATA_DIR = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '_staged',
);

const { routeApiRequest } = await import('../lib/router-shim.mjs');

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    send(payload) {
      this.body = payload.toString();
    },
    json(payload) {
      this.setHeader('content-type', 'application/json');
      this.body = JSON.stringify(payload);
    },
  };
  return res;
}

test('ping responds ok', async () => {
  const res = mockRes();
  const handled = await routeApiRequest({ method: 'GET', path: '/api/ping', query: {}, headers: {} }, res);
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).ok, true);
});

test('unknown route returns 404 JSON', async () => {
  const res = mockRes();
  const handled = await routeApiRequest({ method: 'GET', path: '/api/nope', query: {}, headers: {} }, res);
  assert.equal(handled, true);
  assert.equal(res.statusCode, 404);
});

test('/api/v1/** falls through to Fastify', async () => {
  const res = mockRes();
  const handled = await routeApiRequest({ method: 'GET', path: '/api/v1/clients', query: {}, headers: {} }, res);
  assert.equal(handled, false);
});

test('market-data filters by symbol', async () => {
  const res = mockRes();
  const handled = await routeApiRequest(
    { method: 'GET', path: '/api/market-data', query: { symbols: 'NIFTY50' }, headers: {} },
    res,
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200, res.body);
  const payload = JSON.parse(res.body);
  assert.deepEqual(payload.symbols, ['NIFTY50']);
  assert.ok(Array.isArray(payload.prices) && payload.prices.length === 1);
});

test('list-ips returns docs from staged ips/ dir', async () => {
  const res = mockRes();
  const handled = await routeApiRequest({ method: 'GET', path: '/api/list-ips', query: {}, headers: {} }, res);
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200, res.body);
  const names = JSON.parse(res.body).files.map((d) => d.name);
  assert.ok(JSON.stringify(names).includes('Smoke_Test.md'));
});

test('load-ips sanitizes traversal attempts', async () => {
  const res = mockRes();
  await routeApiRequest(
    { method: 'GET', path: '/api/load-ips', query: { filename: '../server/.env' }, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 400);
});

test('angelone path triggers proxy handler (fetch stubbed)', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).startsWith('https://apiconnect.angelone.in/'));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const res = mockRes();
  const handled = await routeApiRequest(
    { method: 'GET', path: '/api/angelone/rest/secure/x', query: {}, headers: {} },
    res,
  );
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).ok, true);
});
