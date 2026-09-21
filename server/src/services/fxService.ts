import { env } from '../config.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

// Last-known reference values are only used when the upstream service is
// unavailable before this process has populated its cache. They deliberately
// cover the currencies that were supported by the UI before live FX was added.
const FALLBACK_INR_PER_UNIT: Record<string, number> = {
  INR: 1,
  USD: 95.88,
  EUR: 110.13,
  GBP: 128.37,
  SGD: 74.5,
  AED: 26.1,
  JPY: 0.611,
  AUD: 64.1,
  CAD: 69.3,
  CHF: 118.6,
};

export interface FxRateResponse {
  base: 'INR';
  rates: Record<string, number>;
  currencies: string[];
  asOf: string;
  fetchedAt: string;
  source: 'frankfurter' | 'frankfurter-cache' | 'bundled-fallback';
  stale: boolean;
}

interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

let cache: { value: FxRateResponse; expiresAt: number } | null = null;

export function parseFrankfurterRates(rows: unknown): { rates: Record<string, number>; asOf: string } {
  if (!Array.isArray(rows)) throw new Error('FX provider returned a non-array response.');

  const rates: Record<string, number> = { INR: 1 };
  let asOf = '';
  for (const raw of rows) {
    const row = raw as Partial<FrankfurterRate>;
    const code = typeof row.quote === 'string' ? row.quote.toUpperCase() : '';
    const quotedPerInr = Number(row.rate);
    if (!/^[A-Z]{3}$/.test(code) || !Number.isFinite(quotedPerInr) || quotedPerInr <= 0) continue;
    rates[code] = 1 / quotedPerInr;
    if (typeof row.date === 'string' && row.date > asOf) asOf = row.date;
  }

  if (Object.keys(rates).length < 2) throw new Error('FX provider returned no usable rates.');
  return { rates, asOf };
}

function responseFromFallback(): FxRateResponse {
  return {
    base: 'INR',
    rates: { ...FALLBACK_INR_PER_UNIT },
    currencies: Object.keys(FALLBACK_INR_PER_UNIT).sort(),
    asOf: 'bundled-reference',
    fetchedAt: new Date().toISOString(),
    source: 'bundled-fallback',
    stale: true,
  };
}

export async function getInrFxRates(forceRefresh = false): Promise<FxRateResponse> {
  const now = Date.now();
  if (!forceRefresh && cache && cache.expiresAt > now) return cache.value;

  try {
    const response = await fetch(`${env.FX_API_BASE_URL}/rates?base=INR`, {
      headers: { accept: 'application/json', 'user-agent': 'sound-thesis-wealth/1.0' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`FX provider returned HTTP ${response.status}.`);

    const parsed = parseFrankfurterRates(await response.json());
    const value: FxRateResponse = {
      base: 'INR',
      rates: parsed.rates,
      currencies: Object.keys(parsed.rates).sort(),
      asOf: parsed.asOf,
      fetchedAt: new Date().toISOString(),
      source: 'frankfurter',
      stale: false,
    };
    cache = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    if (cache) {
      return { ...cache.value, source: 'frankfurter-cache', stale: true };
    }
    return responseFromFallback();
  }
}
