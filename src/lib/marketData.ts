import { fetchCandleData, type SmartApiCredentials, type SmartApiSession } from './smartapi';
import { getInstrument, type Instrument } from './instruments';
import { getCachedPrices, setCachedPrices, type Candle } from './priceCache';
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
  returnsMatrix: number[][];
  covariance: number[][];
  correlation: number[][];
  stats: ReturnStats[];
  dateRange: { from: string; to: string };
  fetchedAt: string;
}

export interface FetchProgress {
  completed: number;
  total: number;
  currentSymbol: string;
}

function formatSmartApiDate(dateStr: string): string {
  return `${dateStr} 09:15`;
}

function parseCandleData(raw: Array<[string, number, number, number, number, number]>): Candle[] {
  return raw
    .map((row) => ({
      date: String(row[0]).split(' ')[0],
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function fetchSymbolHistory(
  symbol: string,
  from: string,
  to: string,
  creds: SmartApiCredentials,
  session: SmartApiSession,
): Promise<Candle[]> {
  const instrument = getInstrument(symbol);
  if (!instrument) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }

  const cached = getCachedPrices(symbol, instrument.exchange, from, to);
  if (cached) return cached;

  const res = await fetchCandleData(creds, session.jwtToken, {
    exchange: instrument.exchange,
    symboltoken: instrument.token,
    interval: 'ONE_DAY',
    fromdate: formatSmartApiDate(from),
    todate: formatSmartApiDate(to),
  });

  if (!res.success || !res.data) {
    throw new Error(res.message || `Failed to fetch ${symbol}`);
  }

  const candles = parseCandleData(res.data);
  setCachedPrices(symbol, instrument.exchange, from, to, candles);
  return candles;
}

/**
 * Load the pre-built market-data bundle from the backend /api/market-data endpoint.
 * This does not require an Angel One login and is the default data source.
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

  // Try the Vercel serverless endpoint first, then fall back to the static bundle.
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
      return response.json();
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }
  throw new Error(lastError);
}

export async function fetchMarketData(
  symbols: string[],
  from: string,
  to: string,
  creds: SmartApiCredentials,
  session: SmartApiSession,
  onProgress?: (p: FetchProgress) => void,
): Promise<MarketDataSet> {
  const prices: PriceSeries[] = [];
  const instruments: Instrument[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    onProgress?.({ completed: i, total: symbols.length, currentSymbol: symbol });
    const candles = await fetchSymbolHistory(symbol, from, to, creds, session);
    prices.push({
      symbol,
      dates: candles.map((c) => c.date),
      closes: candles.map((c) => c.close),
    });
    const inst = getInstrument(symbol);
    if (inst) instruments.push(inst);
  }

  onProgress?.({ completed: symbols.length, total: symbols.length, currentSymbol: '' });

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

  return {
    symbols,
    instruments,
    prices: alignedPrices,
    returnsMatrix,
    covariance,
    correlation,
    stats,
    dateRange: { from: dates[0] || from, to: dates[dates.length - 1] || to },
    fetchedAt: new Date().toISOString(),
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
