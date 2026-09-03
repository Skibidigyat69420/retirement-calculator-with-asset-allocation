import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runStressTest, CRISIS_PRESETS } from '../src/lib/stressTest';
import { defaultClientInputs } from '../src/lib/scenarios';

describe('stressTest', () => {
  it('runs GFC 2008 stress test and detects drawdown and asset impacts', () => {
    const gfc = CRISIS_PRESETS.find((p) => p.id === 'gfc-2008')!;
    assert.ok(gfc, 'GFC preset should exist');

    const result = runStressTest(defaultClientInputs(), gfc);

    assert.ok(result.baselineNetWorth > 0, 'baseline net worth should be positive');
    assert.ok(result.shockedNetWorth > 0, 'shocked net worth should be positive');
    assert.ok(result.drawdownAmount < 0, 'drawdown should be negative during GFC');
    assert.ok(result.drawdownPercent < 0, 'drawdown percent should be negative');
    assert.ok(result.resilienceScore >= 0 && result.resilienceScore <= 100, 'resilience score in range');
    assert.ok(result.categoryImpacts.length > 0, 'should have category breakdowns');

    // Equity should suffer, Gold should appreciate
    const equityImpact = result.categoryImpacts.find((c) => c.category === 'equity');
    const goldImpact = result.categoryImpacts.find((c) => c.category === 'gold');

    if (equityImpact && equityImpact.initialValue > 0) {
      assert.ok(equityImpact.delta < 0, 'equity should draw down in GFC');
    }
    if (goldImpact && goldImpact.initialValue > 0) {
      assert.ok(goldImpact.delta > 0, 'gold should appreciate in GFC');
    }

    assert.ok(result.mitigationActions.length > 0, 'should generate mitigation actions');
  });

  it('runs Stagflation shock and impacts retirement corpus and inflation', () => {
    const stagflation = CRISIS_PRESETS.find((p) => p.id === 'stagflation-1970s')!;
    const result = runStressTest(defaultClientInputs(), stagflation);

    assert.ok(result.baselineCorpusAtRetirement > 0);
    assert.ok(result.shockedCorpusAtRetirement >= 0);
    assert.ok(Number.isFinite(result.corpusDelta));
  });

  it('handles zero or empty assets gracefully', () => {
    const zeroInputs = {
      ...defaultClientInputs(),
      assets: [],
    };
    const gfc = CRISIS_PRESETS[0];
    const result = runStressTest(zeroInputs, gfc);

    assert.equal(result.baselineNetWorth, 0);
    assert.equal(result.shockedNetWorth, 0);
    assert.equal(result.drawdownAmount, 0);
    assert.equal(result.drawdownPercent, 0);
    assert.ok(result.resilienceScore >= 0);
  });
});
