import type { LiveTick } from '../types';

export interface FeedConnection {
  connect: () => void;
  disconnect: () => void;
  subscribe: (tokens: string[], exchange?: string) => void;
  unsubscribe: (tokens: string[]) => void;
  onTick: (callback: (tick: LiveTick) => void) => () => void;
  onStatus: (callback: (status: FeedStatus) => void) => () => void;
}

export type FeedStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

const WS_URL = 'wss://tns.angelone.in/smartapi/stream/';
const HEARTBEAT_INTERVAL_MS = 25000;
const RECONNECT_DELAY_MS = 5000;

/**
 * SmartAPI websocket credentials. All four values come from the login
 * response / persisted session (see src/lib/smartapi.ts): the JWT auth
 * token, the API key, the client code, and the feed token.
 */
export interface FeedAuth {
  jwtToken: string;
  apiKey: string;
  clientCode: string;
  feedToken: string;
}

export function createFeedManager(auth: FeedAuth): FeedConnection {
  let ws: WebSocket | null = null;
  let status: FeedStatus = 'idle';
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let tickListeners: Array<(tick: LiveTick) => void> = [];
  let statusListeners: Array<(status: FeedStatus) => void> = [];
  let subscribedTokens: string[] = [];

  const setStatus = (s: FeedStatus) => {
    status = s;
    statusListeners.forEach((cb) => cb(s));
  };

  const emitTick = (tick: LiveTick) => {
    tickListeners.forEach((cb) => cb(tick));
  };

  const buildConnectionMessage = () => ({
    correlationID: `soundthesis_${Date.now()}`,
    action: 1,
    params: {
      mode: 2, // LTP mode
      tokenList: [
        {
          exchangeType: 1, // NSE
          tokens: subscribedTokens,
        },
      ],
    },
  });

  const sendHeartbeat = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 1, correlationID: `hb_${Date.now()}` }));
    }
  };

  const buildWsUrl = () => {
    const query = new URLSearchParams({
      clientCode: auth.clientCode,
      feedToken: auth.feedToken,
      apiKey: auth.apiKey,
      jwtToken: auth.jwtToken,
    });
    return `${WS_URL}?${query.toString()}`;
  };

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

    setStatus('connecting');
    try {
      ws = new WebSocket(buildWsUrl());

      ws.onopen = () => {
        setStatus('connected');
        // Authenticate + subscribe in one message; SmartAPI v3 accepts the
        // subscription params on open when connection creds are in the URL.
        ws?.send(JSON.stringify(buildConnectionMessage()));

        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tk && data.lp) {
            const tick: LiveTick = {
              token: String(data.tk),
              symbol: String(data.tk),
              exchange: 'NSE',
              ltp: Number(data.lp),
              open: Number(data.o) || Number(data.lp),
              high: Number(data.h) || Number(data.lp),
              low: Number(data.l) || Number(data.lp),
              close: Number(data.c) || Number(data.lp),
              volume: Number(data.v) || 0,
              change: Number(data.lp) - (Number(data.c) || Number(data.lp)),
              changePercent: Number(data.c) > 0 ? ((Number(data.lp) - Number(data.c)) / Number(data.c)) * 100 : 0,
              timestamp: new Date().toISOString(),
              bid: Number(data.bp1),
              ask: Number(data.sp1),
            };
            emitTick(tick);
          }
        } catch {
          // ignore non-tick messages
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('closed');
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    } catch {
      setStatus('error');
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
    }
  };

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    ws?.close();
    ws = null;
    setStatus('idle');
  };

  const subscribe = (tokens: string[]) => {
    subscribedTokens = Array.from(new Set([...subscribedTokens, ...tokens]));
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(buildConnectionMessage()));
    } else if (status !== 'connecting') {
      connect();
    }
  };

  const unsubscribe = (tokens: string[]) => {
    subscribedTokens = subscribedTokens.filter((t) => !tokens.includes(t));
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          correlationID: `unsub_${Date.now()}`,
          action: 2,
          params: {
            mode: 2,
            tokenList: [{ exchangeType: 1, tokens }],
          },
        }),
      );
    }
  };

  const onTick = (callback: (tick: LiveTick) => void) => {
    tickListeners.push(callback);
    return () => {
      tickListeners = tickListeners.filter((cb) => cb !== callback);
    };
  };

  const onStatus = (callback: (status: FeedStatus) => void) => {
    statusListeners.push(callback);
    callback(status);
    return () => {
      statusListeners = statusListeners.filter((cb) => cb !== callback);
    };
  };

  return { connect, disconnect, subscribe, unsubscribe, onTick, onStatus };
}
