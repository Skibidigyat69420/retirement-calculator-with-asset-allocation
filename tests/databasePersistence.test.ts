import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// In Node environment, polyfill minimal window and localStorage if not present
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, String(value)); },
  removeItem: (key: string) => { storage.delete(key); },
  clear: () => { storage.clear(); },
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { localStorageStore, getActivePlanId, setActivePlanId } from '../src/lib/store/localStorageStore.js';
import { saveClientData, loadClientData, resetClientData } from '../src/lib/persistenceUtils.js';
import { getCRMClients, createCRMClient, saveCRMClient, addCRMInteraction, toggleCRMActionCompleted, getCRMInteractions } from '../src/lib/crm.js';
import { defaultClientInputs } from '../src/lib/scenarios.js';
import { buildApp } from '../server/src/app.js';

describe('Database & Persistence System Verification', () => {

  beforeEach(() => {
    storage.clear();
  });

  describe('1. Local Storage Store (Browser DB)', () => {
    test('isAvailable returns true when storage works', () => {
      assert.equal(localStorageStore.isAvailable(), true);
    });

    test('listPlans returns empty array initially', async () => {
      const plans = await localStorageStore.listPlans();
      assert.deepEqual(plans, []);
    });

    test('savePlan, loadPlan, and deletePlan work reliably', async () => {
      const planId = 'test-plan-123';
      const samplePlan: any = {
        id: planId,
        name: 'Sharma Family Retirement Plan',
        inputs: { currentAge: 45, retirementAge: 60 },
        assumptions: {},
        riskAnswers: { q1: 3, q2: 4 },
        manualTargets: null,
        manualAllocationPolicy: null,
        updatedAt: new Date().toISOString(),
      };

      const saveRes = await localStorageStore.savePlan(samplePlan);
      assert.equal(saveRes.success, true);

      const loaded = await localStorageStore.loadPlan(planId);
      assert.ok(loaded);
      assert.equal(loaded.id, planId);
      assert.equal(loaded.name, 'Sharma Family Retirement Plan');
      assert.equal((loaded.inputs as any).currentAge, 45);

      const list = await localStorageStore.listPlans();
      assert.equal(list.length, 1);
      assert.equal(list[0].id, planId);

      const deleteRes = await localStorageStore.deletePlan(planId);
      assert.equal(deleteRes.success, true);

      const afterDelete = await localStorageStore.loadPlan(planId);
      assert.equal(afterDelete, null);
    });

    test('getActivePlanId and setActivePlanId track active plan in storage', () => {
      assert.equal(getActivePlanId(), null);
      setActivePlanId('active-plan-456');
      assert.equal(getActivePlanId(), 'active-plan-456');
      setActivePlanId(null);
      assert.equal(getActivePlanId(), null);
    });
  });

  describe('2. Client Inputs Persistence Utils', () => {
    test('saveClientData and loadClientData preserves complete household state', () => {
      const defaults = defaultClientInputs();
      const customInputs: typeof defaults = {
        ...defaults,
        currentAge: 38,
        retirementAge: 55,
        annualIncome: 3600000,
        monthlyLivingExpenses: 120000,
        client: {
          ...defaults.client,
          name: 'Priya & Vikram Malhotra',
          email: 'vikram@example.com',
          familyMembers: [
            { id: 'fm-1', name: 'Priya', relation: 'Spouse', age: 36 },
            { id: 'fm-2', name: 'Aarav', relation: 'Child', age: 8 },
          ],
        },
        assets: [
          { id: 'ast-1', name: 'Nifty 50 Index Fund', value: 2500000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: false },
          { id: 'ast-2', name: 'Corporate Debt Fund', value: 1500000, returnRate: 7.5, category: 'debt', currency: 'INR', liquidateAtRetirement: false },
        ],
        liabilities: [
          { id: 'lia-1', name: 'Home Loan', principal: 4500000, rate: 8.5, tenureYears: 15, monthlyPayment: 44300, includeInExpenses: true },
        ],
        goals: [
          { id: 'gol-1', name: 'Aarav College Education', targetAmount: 4000000, yearsToGoal: 10, priority: 'essential', inflation: 8, recurring: false },
        ],
      };

      saveClientData(customInputs);
      const reloaded = loadClientData();
      assert.ok(reloaded);
      assert.equal(reloaded.currentAge, 38);
      assert.equal(reloaded.retirementAge, 55);
      assert.equal(reloaded.client.name, 'Priya & Vikram Malhotra');
      assert.equal(reloaded.client.familyMembers?.length, 2);
      assert.equal(reloaded.assets.length, 2);
      assert.equal(reloaded.assets[0].name, 'Nifty 50 Index Fund');
      assert.equal(reloaded.liabilities.length, 1);
      assert.equal(reloaded.liabilities[0].name, 'Home Loan');
      assert.equal(reloaded.goals.length, 1);
      assert.equal(reloaded.goals[0].name, 'Aarav College Education');

      resetClientData();
      assert.equal(loadClientData(), null);
    });

    test('loadClientData gracefully recovers if storage is empty or malformed', () => {
      mockLocalStorage.setItem('soundthesis_client_inputs_v2', 'invalid json string');
      assert.equal(loadClientData(), null);

      mockLocalStorage.setItem('soundthesis_client_inputs_v2', JSON.stringify({ _version: 1 }));
      assert.equal(loadClientData(), null);
    });
  });

  describe('3. CRM Directory & Interaction Logs', () => {
    test('getCRMClients provides seed directory when unpopulated', () => {
      const clients = getCRMClients();
      assert.ok(Array.isArray(clients));
      assert.ok(clients.length > 0);
      assert.equal(clients[0].name, 'Rhea and Karan Shah');
    });

    test('createCRMClient appends client and sets as active', () => {
      const newClient = createCRMClient({
        name: 'Sunita & Deepak Verma',
        tier: 'HNI',
        stage: 'Risk Profiling',
        email: 'deepak.verma@example.com',
      });
      assert.ok(newClient.id.startsWith('client-'));
      assert.equal(newClient.name, 'Sunita & Deepak Verma');

      const all = getCRMClients();
      const found = all.find((c) => c.id === newClient.id);
      assert.ok(found);
      assert.equal(found.tier, 'HNI');
    });

    test('saveCRMClient updates existing client attributes', () => {
      const client = createCRMClient({ name: 'Ananya Roy', tier: 'Affluent' });
      saveCRMClient({ ...client, annualIncome: 5000000, primaryGoal: 'Retire in Goa' });

      const all = getCRMClients();
      const updated = all.find((c) => c.id === client.id);
      assert.ok(updated);
      assert.equal(updated.annualIncome, 5000000);
      assert.equal(updated.primaryGoal, 'Retire in Goa');
    });

    test('addCRMInteraction and toggleCRMActionCompleted log interactions', () => {
      const client = createCRMClient({ name: 'Rohit Joshi' });
      const interaction = addCRMInteraction(client.id, {
        clientId: client.id,
        date: '2026-11-04',
        type: 'meeting',
        title: 'Q4 Portfolio Review',
        notes: 'Discussed equity rebalancing towards sovereign green bonds.',
        nextAction: 'Draft and ratify revised IPS corridor',
        actionCompleted: false,
      });

      assert.ok(interaction.id);
      assert.equal(interaction.title, 'Q4 Portfolio Review');

      toggleCRMActionCompleted(client.id, interaction.id);
      const interactions = getCRMInteractions(client.id);
      const found = interactions.find((i) => i.id === interaction.id);
      assert.ok(found);
      assert.equal(found.actionCompleted, true);
    });
  });

  describe('4. Practitioner Backend API & AppStore Lifecycle', () => {
    let app: any;
    let token: string;
    let orgId: string;

    beforeEach(async () => {
      app = await buildApp();
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/dev-login',
        payload: { email: 'adviser@soundthesis.local' },
      });
      assert.equal(loginRes.statusCode, 200);
      const body = loginRes.json();
      token = body.token;
      orgId = body.memberships[0].organizationId;
    });

    test('health check reports active status', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' });
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().ok, true);
    });

    test('Client CRUD works end-to-end', async () => {
      // 1. Create client
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { firstName: 'Rajesh', lastName: 'Khanna', email: 'rajesh@example.com', phone: '+91 99000 11222' },
      });
      assert.equal(createRes.statusCode, 201);
      const client = createRes.json();
      assert.equal(client.name, 'Rajesh Khanna');

      // 2. Get client
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/v1/clients/' + client.id,
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(getRes.statusCode, 200);
      assert.equal(getRes.json().id, client.id);

      // 3. Patch client
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/clients/' + client.id,
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { notes: 'High net worth client interested in tax-efficient SWP.' },
      });
      assert.equal(patchRes.statusCode, 200);
      assert.equal(patchRes.json().notes, 'High net worth client interested in tax-efficient SWP.');
    });

    test('Financial resources CRUD including goals archiving operates cleanly', async () => {
      const clientId = '00000000-0000-0000-0000-000000000000';

      // 1. Add Asset
      const assetRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/assets',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { name: 'Direct Equity Portfolio', assetType: 'equity', assetCategory: 'equity', currentValue: 12000000, expectedReturn: 13 },
      });
      assert.equal(assetRes.statusCode, 201);
      const assetId = assetRes.json().id;

      // 2. Add Liability
      const liabilityRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/liabilities',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { name: 'Auto Loan', liabilityType: 'loan', outstandingAmount: 800000, interestRate: 9 },
      });
      assert.equal(liabilityRes.statusCode, 201);

      // 3. Add Goal
      const goalRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/goals',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { name: 'Holiday Home in Nilgiris', targetAmount: 7500000, yearsToGoal: 7, priority: 'aspirational' },
      });
      assert.equal(goalRes.statusCode, 201);
      const goalId = goalRes.json().id;

      // 4. Verify Profile aggregation
      const profileRes = await app.inject({
        method: 'GET',
        url: '/api/v1/clients/' + clientId + '/profile',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(profileRes.statusCode, 200);
      const profile = profileRes.json();
      assert.equal(profile.assets.length, 1);
      assert.equal(profile.liabilities.length, 1);
      assert.equal(profile.goals.length, 1);
      assert.equal(profile.netWorth, 12000000 - 800000);

      // 5. Archive goal (verify route exists and succeeds)
      const archiveGoalRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/goals/' + goalId + '/archive',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(archiveGoalRes.statusCode, 200);
      assert.equal(archiveGoalRes.json().status, 'archived');

      // 6. Archive asset
      const archiveAssetRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/assets/' + assetId + '/archive',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(archiveAssetRes.statusCode, 200);
      assert.equal(archiveAssetRes.json().status, 'archived');
    });

    test('Plan creation and versioning preserves snapshot data', async () => {
      const clientId = '00000000-0000-0000-0000-000000000000';

      // 1. Create plan
      const planRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/plans',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { name: 'Comprehensive Retirement & Wealth Strategy' },
      });
      assert.equal(planRes.statusCode, 201);
      const plan = planRes.json();

      // 2. Create version with complete inputs snapshot
      const versionRes = await app.inject({
        method: 'POST',
        url: '/api/v1/plans/' + plan.id + '/versions',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: {
          inputSnapshot: {
            currentAge: 50,
            retirementAge: 62,
            monthlyLivingExpenses: 150000,
            goals: [{ name: 'World Travel', targetAmount: 2000000 }],
            manualTargets: { equity: 60, debt: 30, gold: 10, realestate: 0, liquid: 0, other: 0 },
          },
          assumptionsSnapshot: { inflation: 6 },
        },
      });
      assert.equal(versionRes.statusCode, 201);
      assert.equal(versionRes.json().versionNumber, 1);

      // 3. Fetch plan and check version content
      const getPlanRes = await app.inject({
        method: 'GET',
        url: '/api/v1/plans/' + plan.id,
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(getPlanRes.statusCode, 200);
      const loadedPlan = getPlanRes.json();
      assert.equal(loadedPlan.currentVersion.inputSnapshot.currentAge, 50);
      assert.equal(loadedPlan.currentVersion.inputSnapshot.goals[0].name, 'World Travel');

      // 4. Calculate plan
      const calcRes = await app.inject({
        method: 'POST',
        url: '/api/v1/plans/' + plan.id + '/calculate',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(calcRes.statusCode, 200);
      assert.ok(calcRes.json().result);
    });

    test('Reports management lifecycle functions properly', async () => {
      const clientId = '00000000-0000-0000-0000-000000000000';

      // 1. Create Report
      const repRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clients/' + clientId + '/reports',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { kind: 'dossier', name: 'Annual Strategic Wealth Dossier' },
      });
      assert.equal(repRes.statusCode, 201);
      const report = repRes.json();
      assert.equal(report.name, 'Annual Strategic Wealth Dossier');
      assert.equal(report.status, 'review');

      // 2. List Reports
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/reports?clientId=' + clientId,
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(listRes.statusCode, 200);
      assert.ok(listRes.json().data.length > 0);

      // 3. Update Report Status
      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/reports/' + report.id,
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
        payload: { status: 'approved' },
      });
      assert.equal(patchRes.statusCode, 200);
      assert.equal(patchRes.json().status, 'approved');

      // 4. Archive Report
      const archiveRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/' + report.id + '/archive',
        headers: { authorization: 'Bearer ' + token, 'x-organization-id': orgId },
      });
      assert.equal(archiveRes.statusCode, 200);
      assert.equal(archiveRes.json().status, 'archived');
    });
  });
});
