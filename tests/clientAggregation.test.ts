import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientSummary } from '../src/lib/api';
import { aggregateClients } from '../src/lib/clientAggregation';

function client(
  id: string,
  name: string,
  householdId: string,
  totalAssets: number,
  liabilities: number,
  extra?: Partial<ClientSummary>,
): ClientSummary {
  return {
    id,
    name,
    status: 'active',
    householdId,
    assignedPractitioners: [],
    financialSummary: {
      netWorth: totalAssets - liabilities,
      investableAssets: totalAssets,
      totalAssets,
      totalLiabilities: liabilities,
    },
    ...extra,
  };
}

describe('clientAggregation', () => {
  it('tolerates an empty client list', () => {
    const result = aggregateClients([]);
    assert.equal(result.clientCount, 0);
    assert.equal(result.householdCount, 0);
    assert.equal(result.totalAUM, 0);
    assert.equal(result.totalLiabilities, 0);
    assert.equal(result.totalNetWorth, 0);
    assert.deepEqual(result.byClient, []);
    assert.deepEqual(result.topClientsByAUM, []);
    assert.deepEqual(result.byCategory, { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 });
  });

  it('sums AUM, liabilities and net worth across clients', () => {
    const clients = [
      client('c1', 'Asha Verma', 'h1', 10_000_000, 2_000_000),
      client('c2', 'Rohit Verma', 'h1', 5_000_000, 1_000_000),
      client('c3', 'Meera Iyer', 'h2', 20_000_000, 0),
    ];
    const result = aggregateClients(clients);
    assert.equal(result.clientCount, 3);
    assert.equal(result.householdCount, 2);
    assert.equal(result.totalAUM, 35_000_000);
    assert.equal(result.totalLiabilities, 3_000_000);
    assert.equal(result.totalNetWorth, 32_000_000);
  });

  it('counts one household per client when household ids are missing', () => {
    const clients = [
      client('c1', 'Asha Verma', '', 100, 0),
      client('c2', 'Rohit Nair', '', 200, 0),
    ];
    clients[0].householdId = '' as string;
    const result = aggregateClients(clients);
    assert.equal(result.householdCount, 2);
  });

  it('aggregates the optional per-category breakdown when present and tolerates its absence', () => {
    const withCategories = client('c1', 'Asha Verma', 'h1', 1_000, 0, {
      financialSummary: {
        netWorth: 1000,
        investableAssets: 1000,
        totalAssets: 1000,
        totalLiabilities: 0,
        byCategory: { equity: 700, gold: 300, realestate: 500 },
        assetCount: 4,
      },
    });
    const without = client('c2', 'Rohit Nair', 'h2', 500, 0);
    const result = aggregateClients([withCategories, without]);
    assert.equal(result.byCategory.equity, 700);
    assert.equal(result.byCategory.gold, 300);
    assert.equal(result.byCategory.realestate, 500);
    assert.equal(result.byCategory.debt, 0);

    const row = result.byClient.find((r) => r.clientId === 'c1');
    assert.equal(row?.assetCount, 4);
    assert.equal(result.byClient.find((r) => r.clientId === 'c2')?.assetCount, 0);
  });

  it('orders topClientsByAUM descending and caps at five', () => {
    const clients = [
      client('c1', 'One', 'h1', 100, 0),
      client('c2', 'Two', 'h2', 900, 0),
      client('c3', 'Three', 'h3', 500, 0),
      client('c4', 'Four', 'h4', 700, 0),
      client('c5', 'Five', 'h5', 300, 0),
      client('c6', 'Six', 'h6', 400, 0),
    ];
    const result = aggregateClients(clients);
    assert.equal(result.topClientsByAUM.length, 5);
    assert.deepEqual(result.topClientsByAUM.map((r) => r.clientId), ['c2', 'c4', 'c3', 'c6', 'c5']);
    assert.deepEqual(result.topClientsByAUM.map((r) => r.aum), [900, 700, 500, 400, 300]);
  });

  it('falls back to computed net worth and total assets when summary fields are missing', () => {
    const sparse = {
      id: 'c1',
      name: 'Sparse Client',
      status: 'active',
      householdId: 'h1',
      assignedPractitioners: [],
      financialSummary: {
        netWorth: 0,
        investableAssets: 0,
        totalAssets: 800,
        totalLiabilities: 300,
      },
    } as ClientSummary;
    const result = aggregateClients([sparse]);
    assert.equal(result.totalAUM, 800);
    assert.equal(result.totalNetWorth, 500);
  });
});
