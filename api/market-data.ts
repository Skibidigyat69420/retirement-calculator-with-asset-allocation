import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { jsonResponse, methodNotAllowed } from './_shared.ts';

/**
 * GET /api/market-data[?symbols=A,B&from=YYYY-MM-DD&to=YYYY-MM-DD]
 *
 * Serves the pre-built market-data bundle from public/data/market-data.json.
 * Optional query params narrow the payload:
 *  - symbols: comma-separated symbol list (filters prices/instruments/stats)
 *  - from/to: date range (filters each price series' dates/closes)
 * Derived matrices (returnsMatrix, covariance, correlation, stats) are
 * recomputed for the filtered subset using the same math as src/lib/returns.ts.
 */

const TRADING_DAYS = 252;

interface PriceSeries {
  symbol: string;
  dates: string[];
  closes: number[];
}

interface MarketDataBundle {
  symbols: string[];
  instruments: Array<{ symbol: string } & Record<string, unknown>>;
  prices: PriceSeries[];
  returnsMatrix?: number[][];
  covariance: number[][];
  correlation: number[][];
  stats: Array<{ symbol: string } & Record<string, unknown>>;
  dateRange: { from: string; to: string };
  defaultSymbols: string[];
  defaultDateRange?: { from: string; to: string };
  fetchedAt: string;
  source: string;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (values.length - 1));
}

function computeLogReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  return returns;
}

function computeReturnStats(symbol: string, closes: number[], riskFreeRate = 0.06) {
  const returns = computeLogReturns(closes);
  const annualReturn = mean(returns) * TRADING_DAYS;
  const annualVol = stdDev(returns) * Math.sqrt(TRADING_DAYS);
  const sharpe = annualVol > 0 ? (annualReturn - riskFreeRate) / annualVol : 0;

  let peak = -Infinity;
  let maxDd = 0;
  for (const price of closes) {
    if (price > peak) peak = price;
    const dd = (price - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }

  return { symbol, annualizedReturn: annualReturn, annualizedVolatility: annualVol, sharpeRatio: sharpe, maxDrawdown: maxDd, count: returns.length };
}

function alignSeries(series: PriceSeries[]): { dates: string[]; matrix: number[][] } {
  if (series.length === 0) return { dates: [], matrix: [] };
  const maps = series.map((s) => {
    const map = new Map<string, number>();
    s.dates.forEach((d, i) => map.set(d, s.closes[i]));
    return map;
  });
  const commonDates = series[0].dates.filter((d) => maps.every((m) => m.has(d)));
  const matrix = series.map((_, idx) => commonDates.map((d) => maps[idx].get(d)!));
  return { dates: commonDates, matrix };
}

function computeCovarianceMatrix(returnsMatrix: number[][]): number[][] {
  const n = returnsMatrix.length;
  if (n === 0) return [];
  const obs = returnsMatrix[0].length;
  if (obs < 2) return Array.from({ length: n }, () => Array(n).fill(0));

  const means = returnsMatrix.map((r) => mean(r));
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < obs; k++) {
        sum += (returnsMatrix[i][k] - means[i]) * (returnsMatrix[j][k] - means[j]);
      }
      const value = (sum / (obs - 1)) * TRADING_DAYS;
      cov[i][j] = value;
      cov[j][i] = value;
    }
  }
  return cov;
}

function computeCorrelationMatrix(cov: number[][]): number[][] {
  return cov.map((row, i) =>
    row.map((value, j) => {
      const denom = Math.sqrt(cov[i][i] * cov[j][j]);
      return denom > 0 ? value / denom : 0;
    }),
  );
}

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600' };

export default async function handler(request: Request) {
  if (request.method !== 'GET') return methodNotAllowed(request.method);

  const filePath = join(process.cwd(), 'public', 'data', 'market-data.json');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return jsonResponse({ error: 'Market data bundle not found at public/data/market-data.json' }, { status: 404, headers: CACHE_HEADERS });
  }

  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get('symbols');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // Fast path: no filtering requested — serve the bundle verbatim.
  if (!symbolsParam && !from && !to) {
    return new Response(raw, { status: 200, headers: { 'Content-Type': 'application/json', ...CACHE_HEADERS } });
  }

  const bundle = JSON.parse(raw) as MarketDataBundle;

  let prices = bundle.prices;
  if (symbolsParam) {
    const wanted = symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const known = new Set(prices.map((p) => p.symbol.toUpperCase()));
    const unknown = wanted.filter((s) => !known.has(s));
    if (unknown.length > 0) {
      return jsonResponse({ error: `Unknown symbols: ${unknown.join(', ')}` }, { status: 400, headers: CACHE_HEADERS });
    }
    const bySymbol = new Map(prices.map((p) => [p.symbol.toUpperCase(), p]));
    prices = wanted.map((s) => bySymbol.get(s)!);
  }

  if (from || to) {
    prices = prices.map((p) => {
      const dates: string[] = [];
      const closes: number[] = [];
      p.dates.forEach((d, i) => {
        if ((!from || d >= from) && (!to || d <= to)) {
          dates.push(d);
          closes.push(p.closes[i]);
        }
      });
      return { symbol: p.symbol, dates, closes };
    });
    const empty = prices.find((p) => p.dates.length < 2);
    if (empty) {
      return jsonResponse({ error: `Date range yields insufficient data for ${empty.symbol}` }, { status: 400, headers: CACHE_HEADERS });
    }
  }

  const symbols = prices.map((p) => p.symbol);
  const { dates, matrix } = alignSeries(prices);
  const returnsMatrix = matrix.map((closes) => computeLogReturns(closes));
  const covariance = computeCovarianceMatrix(returnsMatrix);
  const correlation = computeCorrelationMatrix(covariance);
  const stats = symbols.map((symbol, idx) => computeReturnStats(symbol, matrix[idx]));

  const instrumentSet = new Set(symbols.map((s) => s.toUpperCase()));
  const instruments = bundle.instruments.filter((i) => instrumentSet.has(String(i.symbol).toUpperCase()));

  return jsonResponse(
    {
      symbols,
      instruments,
      prices,
      returnsMatrix,
      covariance,
      correlation,
      stats,
      dateRange: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
      defaultSymbols: bundle.defaultSymbols,
      defaultDateRange: bundle.defaultDateRange,
      fetchedAt: bundle.fetchedAt,
      source: bundle.source,
    },
    { headers: CACHE_HEADERS },
  );
}
