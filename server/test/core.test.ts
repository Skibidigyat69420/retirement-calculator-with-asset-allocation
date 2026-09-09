import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  bootTestApp,
  makeJwt,
  seedActor,
  cleanupTestData,
  type BootedApp,
} from './helpers.js';

let booted: BootedApp;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(async () => {
  booted = await bootTestApp();
});

afterAll(async () => {
  await cleanupTestData({ orgIds, userIds });
  await booted.close();
});

describe('GET /health', () => {
  it('returns 200 { status: "ok", engineVersion } without auth', async () => {
    const res = await booted.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.engineVersion).toBe('string');
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });
});

describe('auth', () => {
  it('missing bearer token → 401 UNAUTHORIZED with error envelope', async () => {
    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/anything',
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeTruthy();
    expect(body.error.requestId).toMatch(/^req_/);
  });

  it('valid dev JWT for unknown user → 401 UNAUTHORIZED', async () => {
    const token = await makeJwt({ sub: randomUUID(), aud: 'dev' });
    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/anything',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('bad signature → 401 UNAUTHORIZED', async () => {
    const token = await makeJwt({ sub: randomUUID(), aud: 'dev' });
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/anything',
      headers: { authorization: `Bearer ${tampered}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});

describe('tenancy', () => {
  it('valid user without x-organization-id → 400 ORG_CONTEXT_REQUIRED', async () => {
    const actor = await seedActor({});
    orgIds.push(actor.organizationId);
    userIds.push(actor.userId);
    const token = await makeJwt({ sub: actor.authUserId, aud: 'dev' });

    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/anything',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ORG_CONTEXT_REQUIRED');
  });

  it('valid user, unknown org header → 403 ORG_ACCESS_DENIED', async () => {
    const actor = await seedActor({});
    orgIds.push(actor.organizationId);
    userIds.push(actor.userId);
    const token = await makeJwt({ sub: actor.authUserId, aud: 'dev' });

    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/anything',
      headers: {
        authorization: `Bearer ${token}`,
        'x-organization-id': randomUUID(),
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ORG_ACCESS_DENIED');
  });

  it('valid user + valid org passes auth+tenancy (404 NOT_FOUND envelope from stub)', async () => {
    const actor = await seedActor({ role: 'practice_owner' });
    orgIds.push(actor.organizationId);
    userIds.push(actor.userId);
    const token = await makeJwt({ sub: actor.authUserId, aud: 'dev' });

    const res = await booted.app.inject({
      method: 'GET',
      url: '/api/v1/nonexistent-route',
      headers: {
        authorization: `Bearer ${token}`,
        'x-organization-id': actor.organizationId,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});
