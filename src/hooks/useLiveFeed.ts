import { useState, useEffect, useRef, useCallback } from 'react';
import { createFeedManager, type FeedStatus } from '../lib/feed';
import type { LiveTick } from '../types';
import { loadSession } from '../lib/smartapi';

interface UseLiveFeedOptions {
  autoConnect?: boolean;
  maxHistoryPerSymbol?: number;
}

interface UseLiveFeedReturn {
  status: FeedStatus;
  ticks: Record<string, LiveTick>;
  history: Record<string, number[]>;
  connect: () => void;
  disconnect: () => void;
  subscribe: (tokens: string[]) => void;
  unsubscribe: (tokens: string[]) => void;
}

export function useLiveFeed(options: UseLiveFeedOptions = {}): UseLiveFeedReturn {
  const { autoConnect = false, maxHistoryPerSymbol = 100 } = options;
  const managerRef = useRef<ReturnType<typeof createFeedManager> | null>(null);
  const [status, setStatus] = useState<FeedStatus>('idle');
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    const manager = createFeedManager(session.jwtToken, session.jwtToken, session.userProfile?.clientcode || '');
    managerRef.current = manager;

    const unsubStatus = manager.onStatus((s) => setStatus(s));
    const unsubTick = manager.onTick((tick) => {
      setTicks((prev) => ({ ...prev, [tick.token]: tick }));
      setHistory((prev) => {
        const existing = prev[tick.token] || [];
        const next = [...existing, tick.ltp].slice(-maxHistoryPerSymbol);
        return { ...prev, [tick.token]: next };
      });
    });

    if (autoConnect) {
      manager.connect();
    }

    return () => {
      unsubStatus();
      unsubTick();
      manager.disconnect();
      managerRef.current = null;
    };
  }, [autoConnect, maxHistoryPerSymbol]);

  const connect = useCallback(() => managerRef.current?.connect(), []);
  const disconnect = useCallback(() => managerRef.current?.disconnect(), []);
  const subscribe = useCallback((tokens: string[]) => managerRef.current?.subscribe(tokens), []);
  const unsubscribe = useCallback((tokens: string[]) => managerRef.current?.unsubscribe(tokens), []);

  return { status, ticks, history, connect, disconnect, subscribe, unsubscribe };
}
