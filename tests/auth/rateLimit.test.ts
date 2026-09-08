import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { createRateLimiter } from '../../server/middleware/rateLimit.js';

interface MockRes {
  statusCode: number;
  body: unknown;
  setHeader(k: string, v: string): void;
  status(code: number): MockRes;
  json(payload: unknown): MockRes;
}

function mockReqRes(path = '/api/v1/auth/login', ip = '10.0.0.1') {
  const headers: Record<string, string> = {};
  const req = {
    ip,
    method: 'POST',
    baseUrl: '',
    path,
    originalUrl: path,
    requestId: 'req_test',
  } as unknown as Request;
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return { req, res, headers };
}

function run(limiter: ReturnType<typeof createRateLimiter>, req: Request, res: MockRes): boolean {
  let called = false;
  limiter.middleware(req, res as unknown as Response, () => {
    called = true;
  });
  return called;
}

test('allows requests under the limit and reports headers', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
  for (let i = 0; i < 3; i++) {
    const { req, res, headers } = mockReqRes();
    assert.equal(run(limiter, req, res), true, `request ${i + 1} should pass`);
    assert.equal(headers['X-RateLimit-Remaining'], String(3 - i - 1));
  }
});

test('returns 429 with error contract over the limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  for (let i = 0; i < 2; i++) {
    const m = mockReqRes();
    assert.equal(run(limiter, m.req, m.res), true);
  }
  const { req, res, headers } = mockReqRes();
  assert.equal(run(limiter, req, res), false);
  assert.equal(res.statusCode, 429);
  const body = res.body as { error: { code: string; message: string; details: { retryAfterSeconds: number } } };
  assert.equal(body.error.code, 'RATE_LIMITED');
  assert.ok(body.error.details.retryAfterSeconds > 0);
  assert.ok('Retry-After' in headers);
});

test('sliding window: keys are per IP + route', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
  const first = mockReqRes('/api/v1/auth/login', '10.0.0.1');
  const second = mockReqRes('/api/v1/auth/login', '10.0.0.2');
  const third = mockReqRes('/api/v1/clients', '10.0.0.1');
  assert.equal(run(limiter, first.req, first.res), true);
  assert.equal(run(limiter, second.req, second.res), true, 'different IP not limited');
  assert.equal(run(limiter, third.req, third.res), true, 'different route not limited');
});

test('window slides: old requests stop counting', () => {
  let t = 1_000_000;
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  const a = mockReqRes();
  assert.equal(run(limiter, a.req, a.res), true);
  t += 500;
  const b = mockReqRes();
  assert.equal(run(limiter, b.req, b.res), true);
  t += 600; // first request is now outside the window
  const c = mockReqRes();
  assert.equal(run(limiter, c.req, c.res), true, 'oldest hit should have expired');
  t += 10;
  const d = mockReqRes();
  assert.equal(run(limiter, d.req, d.res), false, 'second hit still inside window');
});

test('reset clears state', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
  const a = mockReqRes();
  run(limiter, a.req, a.res);
  limiter.reset();
  const b = mockReqRes();
  assert.equal(run(limiter, b.req, b.res), true);
});
