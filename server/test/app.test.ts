import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { createInMemoryStore, createStore } from '../src/store.js';
import { FieldCipher } from '../src/fieldEncryption.js';

async function request(app: Awaited<ReturnType<typeof buildApp>>, options: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
}) {
  const response = await app.inject({
    ...options,
    payload: options.payload === undefined ? undefined : JSON.stringify(options.payload),
    headers: options.payload === undefined
      ? options.headers
      : { 'content-type': 'application/json', ...options.headers },
  });
  return { response, body: response.json() as Record<string, any> };
}

test('API persists a client workspace, versions plans, and manages reports', async () => {
  const app = await buildApp(createInMemoryStore());
  try {
    const login = await request(app, {
      method: 'POST',
      url: '/api/v1/auth/dev-login',
      payload: { email: 'adviser@soundthesis.local' },
    });
    assert.equal(login.response.statusCode, 200);
    assert.equal(typeof login.body.token, 'string');

    const headers = {
      authorization: `Bearer ${login.body.token}`,
      'x-organization-id': login.body.memberships[0].organizationId,
    };
    const client = await request(app, {
      method: 'POST',
      url: '/api/v1/clients',
      headers,
      payload: { firstName: 'Aarav', lastName: 'Mehta', email: 'aarav@example.com' },
    });
    assert.equal(client.response.statusCode, 201);
    const clientId = client.body.id as string;

    const asset = await request(app, {
      method: 'POST',
      url: `/api/v1/clients/${clientId}/assets`,
      headers,
      payload: { name: 'Equity portfolio', currentValue: 2_500_000, category: 'equity' },
    });
    assert.equal(asset.response.statusCode, 201);

    const profile = await request(app, { method: 'GET', url: `/api/v1/clients/${clientId}/profile`, headers });
    assert.equal(profile.response.statusCode, 200);
    assert.equal(profile.body.assets.length, 1);
    assert.equal(profile.body.netWorth, 2_500_000);

    const plan = await request(app, {
      method: 'POST',
      url: `/api/v1/clients/${clientId}/plans`,
      headers,
      payload: { name: 'Retirement plan' },
    });
    assert.equal(plan.response.statusCode, 201);
    const planId = plan.body.id as string;

    const version = await request(app, {
      method: 'POST',
      url: `/api/v1/plans/${planId}/versions`,
      headers,
      payload: {
        inputSnapshot: {
          currentAge: 35,
          retirementAge: 60,
          lifeExpectancy: 90,
          inflation: 6,
          annualIncome: 1_200_000,
          monthlyLivingExpenses: 40_000,
          sip: { amount: 50_000, equityReturn: 11, debtReturn: 7 },
          swp: { monthlyNeedToday: 40_000, postRetirementReturn: 7, taxRate: 0, startAge: 60, endAge: 90 },
        },
        assumptionsSnapshot: {},
      },
    });
    assert.equal(version.response.statusCode, 201);
    assert.equal(version.body.versionNumber, 1);

    const calculation = await request(app, { method: 'POST', url: `/api/v1/plans/${planId}/calculate`, headers, payload: {} });
    assert.equal(calculation.response.statusCode, 200);
    assert.equal(calculation.body.result.netWorth, 2_500_000);
    assert.equal(calculation.body.result.calculationVersion, 'wealth-engine-v1');
    assert.equal(typeof calculation.body.result.wealthEngine.monteCarlo.successRate, 'number');
    assert.equal(typeof calculation.body.calculationRunId, 'string');

    const latestCalculation = await request(app, { method: 'GET', url: `/api/v1/plans/${planId}/calculations/latest`, headers });
    assert.equal(latestCalculation.response.statusCode, 200);
    assert.equal(latestCalculation.body.id, calculation.body.calculationRunId);
    assert.equal(latestCalculation.body.result.netWorth, 2_500_000);

    const auditEvents = await request(app, { method: 'GET', url: '/api/v1/audit-events?limit=20', headers });
    assert.equal(auditEvents.response.statusCode, 200);
    assert.ok(auditEvents.body.data.some((event: { eventType: string }) => event.eventType === 'client.created'));
    assert.ok(auditEvents.body.data.some((event: { eventType: string }) => event.eventType === 'calculation.completed'));

    const report = await request(app, {
      method: 'POST',
      url: `/api/v1/clients/${clientId}/reports`,
      headers,
      payload: { kind: 'dossier', name: 'Aarav Wealth Dossier' },
    });
    assert.equal(report.response.statusCode, 201);

    const archived = await request(app, { method: 'POST', url: `/api/v1/reports/${report.body.id}/archive`, headers });
    assert.equal(archived.response.statusCode, 200);
    assert.equal(archived.body.status, 'archived');
  } finally {
    await app.close();
  }
});

test('API rejects requests without a valid session', async () => {
  const app = await buildApp(createInMemoryStore());
  try {
    const result = await request(app, { method: 'GET', url: '/api/v1/clients' });
    assert.equal(result.response.statusCode, 401);
    assert.equal(result.body.error.code, 'UNAUTHORIZED');
  } finally {
    await app.close();
  }
});

test('sample catalog is stable and exposes an isolated usable workspace', async () => {
  const app = await buildApp(createInMemoryStore());
  try {
    const login = await request(app, {
      method: 'POST',
      url: '/api/v1/auth/dev-login',
      payload: { email: 'adviser@soundthesis.local' },
    });
    const headers = {
      authorization: `Bearer ${login.body.token}`,
      'x-organization-id': login.body.memberships[0].organizationId,
    };

    const first = await request(app, { method: 'GET', url: '/api/v1/client-drafts', headers });
    const second = await request(app, { method: 'GET', url: '/api/v1/client-drafts', headers });
    assert.equal(first.response.statusCode, 200);
    assert.equal(first.body.data.length, 1);
    assert.deepEqual(
      first.body.data.map((draft: { id: string }) => draft.id).sort(),
      second.body.data.map((draft: { id: string }) => draft.id).sort(),
    );

    const sampleClientId = first.body.data[0].clientId as string;
    assert.ok(sampleClientId);
    const profile = await request(app, { method: 'GET', url: `/api/v1/clients/${sampleClientId}/profile`, headers });
    assert.equal(profile.response.statusCode, 200);
    assert.equal(profile.body.assets.length, 8);
    assert.equal(profile.body.liabilities.length, 3);
    assert.equal(profile.body.cashflows.length, 3);
    assert.equal(profile.body.goals.length, 6);
  } finally {
    await app.close();
  }
});

test('an unassigned adviser cannot discover another adviser’s client', async () => {
  const store = createInMemoryStore();
  const owner = await store.findUserByEmail('adviser@soundthesis.local');
  assert.ok(owner);
  const organization = (await store.listMemberships(owner.id))[0];
  assert.ok(organization);
  const adviser = await store.upsertUser({ authUserId: 'second-adviser', email: 'second.adviser@example.com', fullName: 'Second Adviser' });
  await store.addMembership({ user: adviser, organization: { id: organization.organizationId, name: organization.organizationName }, role: 'wealth_practitioner' });
  const app = await buildApp(store);
  try {
    const ownerLogin = await request(app, { method: 'POST', url: '/api/v1/auth/dev-login', payload: { email: owner.email } });
    const ownerHeaders = { authorization: `Bearer ${ownerLogin.body.token}`, 'x-organization-id': organization.organizationId };
    const client = await request(app, { method: 'POST', url: '/api/v1/clients', headers: ownerHeaders, payload: { firstName: 'Private', lastName: 'Household' } });
    assert.equal(client.response.statusCode, 201);

    const adviserLogin = await request(app, { method: 'POST', url: '/api/v1/auth/dev-login', payload: { email: adviser.email } });
    const adviserHeaders = { authorization: `Bearer ${adviserLogin.body.token}`, 'x-organization-id': organization.organizationId };
    const list = await request(app, { method: 'GET', url: '/api/v1/clients', headers: adviserHeaders });
    assert.equal(list.response.statusCode, 200);
    assert.equal(list.body.data.length, 0);
    const forbidden = await request(app, { method: 'GET', url: `/api/v1/clients/${client.body.id}`, headers: adviserHeaders });
    assert.equal(forbidden.response.statusCode, 404);
  } finally {
    await app.close();
  }
});

test('field encryption uses authenticated AES-256 encryption', () => {
  const cipher = new FieldCipher('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  const encrypted = cipher.encryptJson({ pan: 'ABCDE1234F', balance: 1_500_000 });
  assert.notEqual(encrypted.ciphertext, 'ABCDE1234F');
  assert.deepEqual(cipher.decryptJson(encrypted), { pan: 'ABCDE1234F', balance: 1_500_000 });
});

test('database-backed API refuses to start without its field-encryption key', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalKey = process.env.FIELD_ENCRYPTION_KEY;
  try {
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/soundthesis';
    delete process.env.FIELD_ENCRYPTION_KEY;
    assert.throws(() => createStore(), /FIELD_ENCRYPTION_KEY is required/);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalKey === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
    else process.env.FIELD_ENCRYPTION_KEY = originalKey;
  }
});
