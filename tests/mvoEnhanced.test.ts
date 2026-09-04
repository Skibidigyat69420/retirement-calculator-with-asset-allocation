import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMVO, evaluateCustomWeights, findPortfolioByVolatility } from '../src/lib/mvo';

describe('mvoEnhanced', () => {
  const symbols = ['EQUITY', 'DEBT', 'GOLD'];
  const means = [0.12, 0.07, 0.08];
  const covariance = [
    [0.0225, 0.001, 0.002],
    [0.001, 0.0025, 0.0005],
    [0.002, 0.0005, 0.04],
  ];

  it('generates Capital Market Line (CML) tangent ray and constituent asset points', () => {
    const result = runMVO(symbols, means, covariance, { samples: 2000, riskFreeRate: 0.06 });

    assert.ok(Array.isArray(result.cml), 'CML should be an array');
    assert.ok(result.cml.length > 5, 'CML should contain ray points');
    // First point should start at risk-free rate with zero volatility
    assert.equal(result.cml[0].volatility, 0);
    assert.equal(result.cml[0].expectedReturn, 0.06);

    assert.ok(Array.isArray(result.assets), 'Assets should be an array');
    assert.equal(result.assets.length, symbols.length);
    assert.equal(result.assets[0].symbol, 'EQUITY');
    assert.ok(result.assets[0].volatility > 0);
    assert.equal(result.assets[0].expectedReturn, 0.12);
  });

  it('evaluates custom weights accurately', () => {
    const customWeights = [0.5, 0.3, 0.2];
    const evaluated = evaluateCustomWeights(customWeights, means, covariance, 0.06);

    assert.ok(Array.isArray(evaluated.weights));
    assert.equal(evaluated.weights.length, 3);
    assert.ok(Math.abs(evaluated.weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
    // Expected return: 0.5*0.12 + 0.3*0.07 + 0.2*0.08 = 0.06 + 0.021 + 0.016 = 0.097
    assert.ok(Math.abs(evaluated.expectedReturn - 0.097) < 1e-6);
    assert.ok(evaluated.volatility > 0);
    assert.ok(evaluated.sharpe > 0);
  });

  it('finds closest portfolio on the frontier by volatility target', () => {
    const result = runMVO(symbols, means, covariance, { samples: 2000 });
    const targetVol = 0.10;
    const portfolio = findPortfolioByVolatility(result.frontier, targetVol);

    assert.ok(portfolio !== null);
    assert.ok(portfolio.volatility >= 0);
    assert.ok(Number.isFinite(portfolio.expectedReturn));
  });
});
