import { useState, useCallback } from 'react';
import { fetchMarketData, type MarketDataSet, type FetchProgress } from '../lib/marketData';
import type { SmartApiCredentials, SmartApiSession } from '../lib/smartapi';

interface UseMarketDataReturn {
  data: MarketDataSet | null;
  loading: boolean;
  progress: FetchProgress;
  error: string | null;
  fetchData: (symbols: string[], from: string, to: string, creds: SmartApiCredentials, session: SmartApiSession) => Promise<void>;
  clear: () => void;
}

export function useMarketData(): UseMarketDataReturn {
  const [data, setData] = useState<MarketDataSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<FetchProgress>({ completed: 0, total: 0, currentSymbol: '' });
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (
    symbols: string[],
    from: string,
    to: string,
    creds: SmartApiCredentials,
    session: SmartApiSession,
  ) => {
    setLoading(true);
    setError(null);
    setProgress({ completed: 0, total: symbols.length, currentSymbol: symbols[0] || '' });
    try {
      const result = await fetchMarketData(symbols, from, to, creds, session, (p) => setProgress(p));
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch market data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setProgress({ completed: 0, total: 0, currentSymbol: '' });
  }, []);

  return { data, loading, progress, error, fetchData, clear };
}
