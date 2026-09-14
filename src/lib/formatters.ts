/**
 * Multi-currency aware formatting utilities.
 *
 * `formatCurrency` now accepts an optional currency code (ISO 4217).
 * The Indian numbering system (Lakhs/Crores) is used for INR;
 * Western grouping is used for everything else.
 */

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AED' | 'JPY' | 'AUD' | 'CAD' | 'CHF';

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AED: 'د.إ',
  JPY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'CHF ',
};

const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
  SGD: 'en-SG', AED: 'ar-AE', JPY: 'ja-JP', AUD: 'en-AU',
  CAD: 'en-CA', CHF: 'de-CH',
};

export const getCurrencySymbol = (code: string): string =>
  CURRENCY_SYMBOLS[code] ?? code + ' ';

export const formatCurrency = (
  val: any,
  fractionDigitsOrIndex: any = 0,
  currencyStr?: any,
): string => {
  const fractionDigits = typeof fractionDigitsOrIndex === 'number' ? fractionDigitsOrIndex : 0;
  const currency = typeof currencyStr === 'string' ? currencyStr : (typeof fractionDigitsOrIndex === 'string' ? fractionDigitsOrIndex : 'INR');
  const numericVal = typeof val === 'number' ? val : Number(val);

  if (numericVal === undefined || numericVal === null || Number.isNaN(numericVal))
    return `${getCurrencySymbol(currency)}0`;

  const locale = CURRENCY_LOCALES[currency] ?? 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(numericVal);
  } catch {
    // Fallback for unknown currency codes
    return `${getCurrencySymbol(currency)}${numericVal.toFixed(fractionDigits)}`;
  }
};

export const formatCurrencyCompact = (
  val: any,
  currencyOrIndex?: any,
): string => {
  const currency = typeof currencyOrIndex === 'string' ? currencyOrIndex : 'INR';
  const numericVal = typeof val === 'number' ? val : Number(val);

  if (numericVal === undefined || numericVal === null || Number.isNaN(numericVal))
    return `${getCurrencySymbol(currency)}0`;

  const sym = getCurrencySymbol(currency);
  const sign = numericVal < 0 ? '-' : '';
  const abs = Math.abs(numericVal);

  // Indian system for INR, Western for everything else
  if (currency === 'INR') {
    if (abs >= 1_00_00_000) return `${sign}${sym}${(abs / 1_00_00_000).toFixed(2)}Cr`;
    if (abs >= 1_00_000) return `${sign}${sym}${(abs / 1_00_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
  } else {
    if (abs >= 1_000_000_000) return `${sign}${sym}${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(numericVal, 0, currency);
};

// Alias matching the audit-plan naming; same Lakhs/Crores-by-magnitude logic.
export const formatCompactCurrency = formatCurrencyCompact;

export const formatPercent = (val: number, fractionDigits = 1): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '0%';
  return `${val.toFixed(fractionDigits)}%`;
};

export const formatNumber = (val: number, fractionDigits = 0): string => {
  if (val === undefined || val === null || Number.isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(val);
};

export const formatDate = (val: Date | string | number, withTime = false): string => {
  const date = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

export const parseCurrencyInput = (val: string): number => {
  const cleaned = val.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Available currencies for dropdown selectors */
export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
];
