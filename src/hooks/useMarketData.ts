import { useState, useCallback } from 'react';
import {
  fetchMarketData,
  fetchMarketDataFromBackend,
  alignMarketData,
  type MarketDataSet,
  type FetchProgress,
} from '../lib/marketData';
import type { SmartApiCredentials, SmartApiSession } from '../lib/smartapi';

interface UseMarketDataReturn {
  data: MarketDataSet | null;
  rawBundle: MarketDataSet | null;
  loading: boolean;
  progress: FetchProgress;
  error: string | null;
  fetchData: (symbols: string[], from: string, to: string, creds: SmartApiCredentials, session: SmartApiSession) => Promise<void>;
  loadBackendData: (symbols?: string[], from?: string, to?: string) => Promise<void>;
  alignToSymbols: (symbols: string[]) => MarketDataSet | null;
  clear: () => void;
}

export function useMarketData(): UseMarketDataReturn {
  const [rawBundle, setRawBundle] = useState<MarketDataSet | null>(null);
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
      setRawBundle(result);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch market data');
      setData(null);
      setRawBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBackendData = useCallback(async (symbols?: string[], from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    setProgress({ completed: 0, total: 1, currentSymbol: 'backend-bundle' });
    try {
      const result = await fetchMarketDataFromBackend(symbols, from, to);
      setRawBundle(result);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load backend market data');
      setData(null);
      setRawBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const alignToSymbols = useCallback((symbols: string[]): MarketDataSet | null => {
    if (!rawBundle) return data;
    try {
      return alignMarketData(rawBundle, symbols);
    } catch {
      return data;
    }
  }, [rawBundle, data]);

  const clear = useCallback(() => {
    setData(null);
    setRawBundle(null);
    setError(null);
    setProgress({ completed: 0, total: 0, currentSymbol: '' });
  }, []);

  return { data, rawBundle, loading, progress, error, fetchData, loadBackendData, alignToSymbols, clear };
}
