import { describe, expect, it } from 'vitest';
import { parseFrankfurterRates } from '../src/services/fxService.js';

describe('FX normalization', () => {
  it('converts quote-per-INR provider rates to INR-per-unit rates', () => {
    const parsed = parseFrankfurterRates([
      { date: '2026-09-21', base: 'INR', quote: 'USD', rate: 0.01 },
      { date: '2026-09-20', base: 'INR', quote: 'JPY', rate: 2 },
    ]);

    expect(parsed.rates.INR).toBe(1);
    expect(parsed.rates.USD).toBe(100);
    expect(parsed.rates.JPY).toBe(0.5);
    expect(parsed.asOf).toBe('2026-09-21');
  });

  it('rejects empty or unusable provider payloads', () => {
    expect(() => parseFrankfurterRates({})).toThrow(/non-array/);
    expect(() => parseFrankfurterRates([])).toThrow(/no usable rates/);
  });
});
