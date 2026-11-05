import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, generateIPSMarkdown } from '../src/lib/ipsMarkdown';

describe('IPS allocation policy flow', () => {
  it('carries SAA sleeves, custom corridors and governance into the issued IPS', () => {
    const state = defaultState();
    state.allocation = { equity: 60, debt: 30, gold: 5, realestate: 0, liquid: 5, other: 0 };
    state.currentAllocation = { equity: 57, debt: 31, gold: 5, realestate: 0, liquid: 7, other: 0 };
    state.policyName = 'Sharma Family Strategic Allocation';
    state.policyObjective = 'Fund retirement while retaining a two-year liquidity reserve.';
    state.policyRationale = 'Long horizon supports a diversified equity allocation.';
    state.policyConstraints = 'No direct tobacco exposure.';
    state.reviewFrequency = 'quarterly';
    state.rebalanceThreshold = 4;
    state.allocationRanges = {
      equity: { min: 56, max: 64 }, debt: { min: 26, max: 34 }, gold: { min: 1, max: 9 },
      realestate: { min: 0, max: 4 }, liquid: { min: 1, max: 9 }, other: { min: 0, max: 4 },
    };
    state.sleeves = [
      { id: 'equity-core', assetClass: 'equity', category: 'Core domestic equity', target: 36, purpose: 'Long-term compounding.' },
      { id: 'equity-global', assetClass: 'equity', category: 'International equity', target: 24, purpose: 'Geographic diversification.' },
    ];

    const markdown = generateIPSMarkdown(state, 12_000_000);

    assert.match(markdown, /Sharma Family Strategic Allocation/);
    assert.match(markdown, /56% – 64%/);
    assert.match(markdown, /Investable Category Map/);
    assert.match(markdown, /Core domestic equity/);
    assert.match(markdown, /\*\*Review cadence:\*\* quarterly/);
    assert.match(markdown, /No direct tobacco exposure/);
  });
});
