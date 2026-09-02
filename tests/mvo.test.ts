import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMVO } from '../src/lib/mvo';

describe('mvo', () => {
  const symbols = ['EQUITY', 'DEBT', 'GOLD'];
  const means = [0.12, 0.07, 0.08];
  const covariance = [
    [0.0225, 0.001, 0.002],
    [0.001, 0.0025, 0.0005],
    [0.002, 0.0005, 0.04],
  ];

  it('runMVO returns the expected result keys', () => {
    const result = runMVO(symbols, means, covariance, { samples: 1000 });

    assert.deepEqual(result.symbols, symbols);
    assert.deepEqual(result.means, means);
    assert.deepEqual(result.covariance, covariance);
    assert.ok(Array.isArray(result.frontier));
    assert.ok(result.maxSharpe && typeof result.maxSharpe === 'object');
    assert.ok(result.minVariance && typeof result.minVariance === 'object');
    assert.ok(result.equalWeight && typeof result.equalWeight === 'object');
    assert.ok(result.riskParity && typeof result.riskParity === 'object');
  });

  it('runMVO frontier contains sampled portfolios', () => {
    const result = runMVO(symbols, means, covariance, {
      samples: 5000,
      constraints: { minWeight: [0, 0, 0], maxWeight: [1, 1, 1] },
    });
    assert.ok(result.frontier.length > 0, 'frontier should contain portfolios');

    for (const p of result.frontier) {
      assert.ok(Array.isArray(p.weights));
      assert.equal(p.weights.length, symbols.length);
      assert.ok(p.weights.every((w) => w >= 0));
      assert.ok(Math.abs(p.weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
      assert.ok(p.volatility >= 0);
      assert.ok(Number.isFinite(p.expectedReturn));
      assert.ok(Number.isFinite(p.sharpe));
    }
  });

  it('runMVO handles a two-asset universe', () => {
    const twoSymbols = ['EQUITY', 'DEBT'];
    const twoMeans = [0.12, 0.07];
    const twoCov = [
      [0.0225, 0.001],
      [0.001, 0.0025],
    ];
    const result = runMVO(twoSymbols, twoMeans, twoCov, { samples: 2000 });
    assert.ok(result.frontier.length > 0);
    assert.ok(result.maxSharpe.weights.length === 2);
    assert.ok(Math.abs(result.maxSharpe.weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  });

  it('runMVO respects equity cap constraints', () => {
    const result = runMVO(symbols, means, covariance, {
      samples: 5000,
      constraints: {
        maxEquity: 0.5,
        equityMask: [true, false, false],
      },
    });
    const equityWeight = result.maxSharpe.weights[0];
    assert.ok(equityWeight <= 0.5 + 1e-6, `equity weight ${equityWeight} exceeds 0.5 cap`);
  });
});
