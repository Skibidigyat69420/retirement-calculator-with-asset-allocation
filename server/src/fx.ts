const FRANKFURTER_RATES_URL = 'https://api.frankfurter.dev/v2/rates?base=inr';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

export type FxRateSource = 'frankfurter' | 'frankfurter-cache' | 'bundled-fallback';

export interface InrFxRates {
  base: 'INR';
  /** INR per one unit of the quoted currency. */
  rates: Record<string, number>;
  currencies: string[];
  asOf: string;
  fetchedAt: string;
  source: FxRateSource;
  stale: boolean;
}

type FrankfurterRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

type CachedRates = InrFxRates & { cachedAtMs: number };

let cachedRates: CachedRates | null = null;

// Resilient, auditable defaults if the daily reference-rate feed is unavailable.
// These are only a continuity fallback; every successful request replaces them.
const BUNDLED_INR_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 91.2,
  GBP: 106.4,
  SGD: 61.8,
  AED: 22.73,
  JPY: 0.56,
  AUD: 54.6,
  CAD: 61.4,
  CHF: 94.5,
};

function fallbackRates(): InrFxRates {
  return {
    base: 'INR',
    rates: { ...BUNDLED_INR_RATES },
    currencies: Object.keys(BUNDLED_INR_RATES),
    asOf: '',
    fetchedAt: new Date().toISOString(),
    source: 'bundled-fallback',
    stale: true,
  };
}

export function normalizeFrankfurterRows(rows: unknown): Omit<InrFxRates, 'fetchedAt' | 'source' | 'stale'> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const rates: Record<string, number> = { INR: 1 };
  let asOf = '';

  for (const row of rows as FrankfurterRow[]) {
    const quote = typeof row?.quote === 'string' ? row.quote.toUpperCase() : '';
    const rate = Number(row?.rate);
    if (!/^[A-Z]{3}$/.test(quote) || !Number.isFinite(rate) || rate <= 0) continue;
    // Frankfurter returns quote units per INR when base=inr. The planner stores
    // INR per quote so every native-currency amount can be multiplied by it.
    rates[quote] = 1 / rate;
    if (!asOf && typeof row.date === 'string') asOf = row.date;
  }

  const currencies = Object.keys(rates).sort((a, b) => (a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b)));
  return currencies.length > 1 ? { base: 'INR', rates, currencies, asOf } : null;
}

async function loadFrankfurterRates(fetcher: typeof fetch): Promise<InrFxRates> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(FRANKFURTER_RATES_URL, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Frankfurter returned ${response.status}.`);

    const normalized = normalizeFrankfurterRows(await response.json());
    if (!normalized) throw new Error('Frankfurter returned no usable INR rates.');

    return {
      ...normalized,
      fetchedAt: new Date().toISOString(),
      source: 'frankfurter',
      stale: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Loads current daily reference rates and expresses every supported quote in
 * INR. Warm instances serve a bounded cache; temporary upstream failure falls
 * back to the last good observation, then to bundled continuity rates.
 */
export async function getInrFxRates(fetcher: typeof fetch = fetch): Promise<InrFxRates> {
  const now = Date.now();
  if (cachedRates && now - cachedRates.cachedAtMs < CACHE_TTL_MS) {
    const { cachedAtMs: _cachedAtMs, ...cached } = cachedRates;
    return { ...cached, source: 'frankfurter-cache', stale: false };
  }

  try {
    const live = await loadFrankfurterRates(fetcher);
    cachedRates = { ...live, cachedAtMs: now };
    return live;
  } catch {
    if (cachedRates) {
      const { cachedAtMs: _cachedAtMs, ...cached } = cachedRates;
      return { ...cached, source: 'frankfurter-cache', stale: true };
    }
    return fallbackRates();
  }
}

export function clearFxCacheForTests(): void {
  cachedRates = null;
}
