import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearFxCacheForTests, getInrFxRates, normalizeFrankfurterRows } from '../src/fx.js';

test('normalizes Frankfurter INR-base rows into INR per foreign-currency unit', () => {
  const normalized = normalizeFrankfurterRows([
    { date: '2026-11-11', base: 'INR', quote: 'USD', rate: 0.012 },
    { date: '2026-11-11', base: 'INR', quote: 'EUR', rate: 0.01 },
  ]);

  assert.ok(normalized);
  assert.equal(normalized.base, 'INR');
  assert.equal(normalized.rates.INR, 1);
  assert.ok(Math.abs(normalized.rates.USD - 83.33333333333333) < 1e-10);
  assert.equal(normalized.rates.EUR, 100);
  assert.deepEqual(normalized.currencies, ['INR', 'EUR', 'USD']);
});

test('returns bundled INR rates when the external reference feed is unavailable', async () => {
  clearFxCacheForTests();
  const rates = await getInrFxRates(async () => {
    throw new Error('network unavailable');
  });

  assert.equal(rates.base, 'INR');
  assert.equal(rates.rates.INR, 1);
  assert.ok(rates.rates.USD > 0);
  assert.equal(rates.source, 'bundled-fallback');
  assert.equal(rates.stale, true);
});
