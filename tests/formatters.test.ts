import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatNumber,
  formatDate,
  parseCurrencyInput,
} from '../src/lib/formatters';

describe('formatters', () => {
  it('formatCurrency formats positive and negative INR amounts correctly', () => {
    assert.equal(formatCurrency(0), '₹0');
    assert.ok(formatCurrency(100000).includes('1,00,000'));
    assert.ok(formatCurrency(-50000).includes('50,000'));
  });

  it('formatCurrencyCompact formats Lakhs, Crores, and negative numbers cleanly', () => {
    assert.equal(formatCurrencyCompact(25000000), '₹2.50Cr');
    assert.equal(formatCurrencyCompact(150000), '₹1.50L');
    assert.equal(formatCurrencyCompact(5000), '₹5.00K');
    assert.equal(formatCurrencyCompact(-25000000), '-₹2.50Cr');
    assert.equal(formatCurrencyCompact(-150000), '-₹1.50L');
    assert.equal(formatCurrencyCompact(0), '₹0');
    assert.equal(formatCurrencyCompact(Number.NaN), '₹0');
  });

  it('formatPercent handles numbers, edge cases and decimals', () => {
    assert.equal(formatPercent(12.5), '12.5%');
    assert.equal(formatPercent(12.543, 2), '12.54%');
    assert.equal(formatPercent(Number.NaN), '0%');
  });

  it('formatNumber formats digits with Indian grouping', () => {
    assert.equal(formatNumber(100000), '1,00,000');
    assert.equal(formatNumber(0), '0');
  });

  it('parseCurrencyInput extracts numbers from currency strings', () => {
    assert.equal(parseCurrencyInput('₹1,25,000'), 125000);
    assert.equal(parseCurrencyInput('  ₹ 50,000.50  '), 50000.5);
    assert.equal(parseCurrencyInput('abc'), 0);
  });

  it('formatDate formats dates reliably', () => {
    const d = new Date(2026, 8, 3); // Sept 3, 2026
    const res = formatDate(d);
    assert.ok(res.includes('Sep') || res.includes('September') || res.includes('2026'));
  });
});
