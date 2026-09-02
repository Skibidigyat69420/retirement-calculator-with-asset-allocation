import { readFileSync, statSync, existsSync } from 'fs';
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

    const stats = statSync(filePath);
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    return new Response(
      JSON.stringify({
        ok: true,
        source: data.source,
        fetchedAt: data.fetchedAt,
        fileSizeBytes: stats.size,
        fileModifiedAt: stats.mtime.toISOString(),
        symbolCount: data.symbols?.length || 0,
        symbols: data.symbols || [],
        defaultSymbols: data.defaultSymbols || [],
        defaultDateRange: data.defaultDateRange || null,
        fullDateRange: data.dateRange || null,
        hasCovariance: Array.isArray(data.covariance) && data.covariance.length > 0,
        hasCorrelation: Array.isArray(data.correlation) && data.correlation.length > 0,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Market status error:', err);
    return errorResponse('Market data bundle not found. Run `npm run fetch:data` first.', 404);
  }
};
