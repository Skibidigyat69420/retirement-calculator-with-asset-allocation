import { readFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

/**
 * Health / status endpoint for the market-data feed.
 *
 * GET /api/market-status
 * Returns metadata about the bundled market data without sending the full price histories.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filePath = resolve(PROJECT_ROOT, 'public', 'data', 'market-data.json');
    const stats = statSync(filePath);
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    return res.status(200).json({
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
    });
  } catch (err) {
    console.error('Market status error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Market data bundle not found. Run `npm run fetch:data` first.',
    });
  }
}
