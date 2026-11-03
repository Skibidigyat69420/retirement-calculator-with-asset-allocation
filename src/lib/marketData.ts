import { type Instrument } from './instruments';
import {
  alignSeries,
  buildReturnsMatrix,
  computeCorrelationMatrix,
  computeCovarianceMatrix,
  computeReturnStats,
  type PriceSeries,
  type ReturnStats,
} from './returns';

export interface MarketDataSet {
  symbols: string[];
  instruments: Instrument[];
  prices: PriceSeries[];
  returnsMatrix?: number[][];
  covariance: number[][];
  correlation: number[][];
  stats: ReturnStats[];
  dateRange: { from: string; to: string };
  defaultSymbols: string[];
  defaultDateRange?: { from: string; to: string };
  fetchedAt: string;
  source: 'market' | 'yahoo' | 'default';
}

/**
 * Load the pre-built market-data bundle from the backend /api/market-data endpoint or static bundle.
 */
export async function fetchMarketDataFromBackend(
  symbols?: string[],
  from?: string,
  to?: string,
): Promise<MarketDataSet> {
  const params = new URLSearchParams();
  if (symbols && symbols.length > 0) params.set('symbols', symbols.join(','));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();

  // Try the API endpoint first, then fall back to the static bundle.
  const urls = [
    `/api/market-data${query ? `?${query}` : ''}`,
    `/data/market-data.json`,
  ];

  let lastError = 'Market data request failed';
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        lastError = err.error || `Market data request failed: ${response.status}`;
        continue;
      }
      const data: MarketDataSet = await response.json();
      return alignMarketData(data, symbols || data.defaultSymbols);
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }
  throw new Error(lastError);
}

/**
 * Align a subset of symbols from a full-history bundle and recompute covariance,
 * correlation, and stats over their common trading dates.
 */
export function alignMarketData(data: MarketDataSet, symbols: string[]): MarketDataSet {
  const wanted = symbols.map((s) => s.toUpperCase());
  const prices = wanted
    .map((sym) => data.prices.find((p) => p.symbol.toUpperCase() === sym))
    .filter((p): p is PriceSeries => !!p);

  if (prices.length === 0) {
    throw new Error('No valid symbols requested');
  }

  const { dates, matrix } = alignSeries(prices);
  const alignedPrices = prices.map((p, idx) => ({
    symbol: p.symbol,
    dates,
    closes: matrix[idx],
  }));

  const returnsMatrix = buildReturnsMatrix(matrix);
  const covariance = computeCovarianceMatrix(returnsMatrix);
  const correlation = computeCorrelationMatrix(covariance);
  const stats = alignedPrices.map((p) => computeReturnStats(p.symbol, p.closes));

  const instruments = wanted
    .map((sym) => data.instruments.find((i) => i.symbol.toUpperCase() === sym))
    .filter((i): i is Instrument => !!i);

  return {
    symbols: prices.map((p) => p.symbol),
    instruments,
    prices: alignedPrices,
    returnsMatrix,
    covariance,
    correlation,
    stats,
    dateRange: { from: dates[0] || '', to: dates[dates.length - 1] || '' },
    defaultSymbols: data.defaultSymbols,
    defaultDateRange: data.defaultDateRange,
    fetchedAt: data.fetchedAt,
    source: data.source,
  };
}

export function getDefaultDateRange(years = 3): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setFullYear(to.getFullYear() - years);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function getMaxHistoryDateRange(): { from: string; to: string } {
  const to = new Date();
  return {
    from: '2000-01-01',
    to: to.toISOString().split('T')[0],
  };
}
