import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEffectiveReturn,
  projectPortfolioGrowth,
  type ProjectableAssetClass,
} from '../src/lib/portfolioProjection';

describe('portfolioProjection', () => {
  it('calculates effective INR and Real returns factoring in currency FX and inflation', () => {
    // USD asset returning 10% in USD with 3.5% USD appreciation against INR, under 6% inflation
    const res = calculateEffectiveReturn(10, 3.5, 6);

    // Compound nominal INR: (1.10 * 1.035 - 1) = 0.1385 (13.85%)
    assert.equal(Math.round(res.inrReturn * 100) / 100, 13.85);

    // Real return: (1.1385 / 1.06 - 1) = 0.074056... (7.41%)
    assert.equal(Math.round(res.realReturn * 100) / 100, 7.41);
  });

  it('projects growth across multiple asset classes with annual rebalancing', () => {
    const assetClasses: ProjectableAssetClass[] = [
      { id: '1', name: 'Domestic Equity', weight: 60, returnRate: 12, currency: 'INR', fxRate: 0 },
      { id: '2', name: 'US Equity', weight: 20, returnRate: 10, currency: 'USD', fxRate: 3.5 },
      { id: '3', name: 'Domestic Debt', weight: 20, returnRate: 7, currency: 'INR', fxRate: 0 },
    ];

    const result = projectPortfolioGrowth({
      initialCorpus: 1_000_000,
      monthlyContribution: 25_000,
      annualStepUp: 5,
      years: 10,
      inflationRate: 6,
      rebalanceAnnually: true,
      assetClasses,
    });

    assert.ok(result.blendedNominalReturn > 10, 'nominal return should be over 10%');
    assert.ok(result.blendedRealReturn > 4, 'real return should exceed 4%');
    assert.ok(result.terminalNominalWealth > result.totalInvested, 'nominal wealth should exceed invested');
    assert.ok(result.terminalNominalWealth > result.terminalRealWealth, 'nominal exceeds real under positive inflation');
    assert.equal(result.snapshots.length, 11, 'should have 11 snapshots (year 0 to 10)');
    assert.ok(result.nominalMultiplier > 1);
  });

  it('handles buy-and-hold drifting weights', () => {
    const assetClasses: ProjectableAssetClass[] = [
      { id: '1', name: 'High Growth Equity', weight: 50, returnRate: 18, currency: 'INR', fxRate: 0 },
      { id: '2', name: 'Cash', weight: 50, returnRate: 4, currency: 'INR', fxRate: 0 },
    ];

    const result = projectPortfolioGrowth({
      initialCorpus: 500_000,
      monthlyContribution: 0,
      annualStepUp: 0,
      years: 5,
      inflationRate: 5,
      rebalanceAnnually: false,
      assetClasses,
    });

    // In buy and hold, the high growth equity should increase its weight over time
    const finalBreakdown = result.snapshots[result.snapshots.length - 1].assetBreakdown;
    const equityFinalWeight = finalBreakdown[0].effectiveWeight;
    const cashFinalWeight = finalBreakdown[1].effectiveWeight;

    assert.ok(equityFinalWeight > 50, 'equity weight should drift higher than 50%');
    assert.ok(cashFinalWeight < 50, 'cash weight should drift lower than 50%');
  });
});
