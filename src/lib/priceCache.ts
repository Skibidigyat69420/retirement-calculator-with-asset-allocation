export interface Candle {
  date: string; // ISO date string YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CacheEntry {
  fetchedAt: number;
  candles: Candle[];
}

const CACHE_KEY_PREFIX = 'soundthesis_price_cache_';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

function cacheKey(symbol: string, exchange: string, from: string, to: string): string {
  return `${CACHE_KEY_PREFIX}${exchange}_${symbol}_${from}_${to}`;
}

export function getCachedPrices(
  symbol: string,
  exchange: string,
  from: string,
  to: string,
  ttlMs = DEFAULT_TTL_MS,
): Candle[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(symbol, exchange, from, to));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > ttlMs) {
      localStorage.removeItem(cacheKey(symbol, exchange, from, to));
      return null;
    }
    return entry.candles;
  } catch {
    return null;
  }
}

export function setCachedPrices(
  symbol: string,
  exchange: string,
  from: string,
  to: string,
  candles: Candle[],
): void {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), candles };
    localStorage.setItem(cacheKey(symbol, exchange, from, to), JSON.stringify(entry));
  } catch {
    // localStorage full or disabled; silently fail
  }
}

export function clearPriceCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
