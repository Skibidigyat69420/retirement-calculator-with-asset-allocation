import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { errorResponse, handleOptions } from './_utils.js';

const PROJECT_ROOT = process.cwd();

export default async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const filePath = resolve(PROJECT_ROOT, 'public', 'data', 'market-data.json');
    if (!existsSync(filePath)) {
      return errorResponse('Market data bundle not found. Run `npm run fetch:data` first.', 404);
    }

    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    const url = new URL(request.url);
    const symbols = url.searchParams.get('symbols');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let result = data;

    if (symbols) {
      const wanted = symbols.split(',').map((s) => s.trim().toUpperCase());
      const indices = wanted.map((sym) => data.symbols.indexOf(sym)).filter((idx) => idx >= 0);

      if (indices.length === 0) {
        return errorResponse('No valid symbols requested', 400);
      }

      result = {
        ...data,
        symbols: indices.map((idx) => data.symbols[idx]),
        instruments: indices.map((idx) => data.instruments[idx]),
        prices: indices.map((idx) => data.prices[idx]),
        stats: indices.map((idx) => data.stats[idx]),
        covariance: [],
        correlation: [],
      };
    }

    if (from || to) {
      const startDate = from || '2000-01-01';
      const endDate = to || new Date().toISOString().split('T')[0];
      result = filterByDateRange(result, startDate, endDate);
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Market data API error:', err);
    return errorResponse('Market data bundle not found. Run `npm run fetch:data` first.', 404);
  }
};

function filterByDateRange(data, startDate, endDate) {
  if (!data.prices || data.prices.length === 0) return data;

  const slicePrices = data.prices.map((series) => {
    const dates = series.dates;
    const startIdx = dates.findIndex((d) => d >= startDate);
    const endIdx = dates.findIndex((d) => d > endDate);
    const start = startIdx >= 0 ? startIdx : 0;
    const end = endIdx >= 0 ? endIdx : dates.length;
    if (start >= end) {
      return { ...series, dates: [], closes: [] };
    }
    return {
      ...series,
      dates: dates.slice(start, end),
      closes: series.closes.slice(start, end),
    };
  });

  const validPrices = slicePrices.filter((p) => p.dates.length > 0);
  const dateRange =
    validPrices.length > 0
      ? { from: validPrices[0].dates[0], to: validPrices[0].dates[validPrices[0].dates.length - 1] }
      : data.dateRange;

  return { ...data, prices: slicePrices, dateRange };
}
