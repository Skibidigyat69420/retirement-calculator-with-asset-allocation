import { useState, useMemo } from 'react';
import { Activity, Wifi, WifiOff, Plus, Trash2, RefreshCw } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { MiniSparkline } from '../components/ui/MiniSparkline';
import { useLiveFeed } from '../hooks/useLiveFeed';
import { INSTRUMENTS } from '../lib/instruments';
import { formatCurrency } from '../lib/formatters';

const INSTRUMENT_OPTIONS = INSTRUMENTS.filter((i) => i.benchmark || ['NIFTYBEES', 'GOLDBEES', 'LIQUIDBEES'].includes(i.symbol));

export const LiveMarket = () => {
  const { status, ticks, history, connect, disconnect, subscribe, unsubscribe } = useLiveFeed();
  const [watchlist, setWatchlist] = useState<string[]>(['NIFTY50', 'BANKNIFTY', 'GOLDBEES']);
  const [selectedSymbol, setSelectedSymbol] = useState(INSTRUMENT_OPTIONS[0]?.symbol || 'NIFTY50');

  const watchlistInstruments = useMemo(
    () => watchlist.map((sym) => INSTRUMENTS.find((i) => i.symbol === sym)).filter(Boolean),
    [watchlist],
  );

  const handleSubscribe = () => {
    const tokens = watchlistInstruments.map((i) => i?.token).filter(Boolean) as string[];
    subscribe(tokens);
  };

  const addSymbol = () => {
    if (!watchlist.includes(selectedSymbol)) {
      const next = [...watchlist, selectedSymbol];
      setWatchlist(next);
      const inst = INSTRUMENTS.find((i) => i.symbol === selectedSymbol);
      if (inst) subscribe([inst.token]);
    }
  };

  const removeSymbol = (sym: string) => {
    setWatchlist(watchlist.filter((s) => s !== sym));
    const inst = INSTRUMENTS.find((i) => i.symbol === sym);
    if (inst) unsubscribe([inst.token]);
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Live Market Watch"
        subtitle="Stream real-time LTP quotes from Angel One SmartAPI. Build watchlists and track intraday moves."
        badge="Data Stream"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={status === 'connected' ? 'success' : status === 'connecting' ? 'default' : 'outline'} className="px-3 py-1.5">
          {status === 'connected' ? <Wifi size={14} className="mr-1" /> : <WifiOff size={14} className="mr-1" />}
          {status === 'connected' ? 'Live Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Badge>
        {status !== 'connected' ? (
          <Button size="sm" onClick={connect}>
            <RefreshCw size={14} className="mr-1.5" /> Connect Feed
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleSubscribe} disabled={status !== 'connected'}>
          <Activity size={14} className="mr-1.5" /> Subscribe Watchlist
        </Button>
      </div>

      {status === 'error' && (
        <Alert variant="warning">
          WebSocket feed could not connect. Angel One live streaming requires a valid SmartAPI session and may be blocked by network proxies. Use Market Data for REST fallback.
        </Alert>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy"
          >
            {INSTRUMENT_OPTIONS.map((inst) => (
              <option key={inst.symbol} value={inst.symbol}>
                {inst.name} ({inst.symbol})
              </option>
            ))}
          </select>
          <Button onClick={addSymbol}>
            <Plus size={16} className="mr-1.5" /> Add to Watchlist
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlistInstruments.map((inst) => {
            const tick = ticks[inst!.token];
            const hist = history[inst!.token] || [];
            const lastClose = tick?.close || tick?.ltp || 0;
            const ltp = tick?.ltp || lastClose;
            const change = tick?.change || 0;
            const changePct = tick?.changePercent || 0;
            const color = change >= 0 ? 'text-emerald-600' : 'text-rose-600';

            return (
              <Card key={inst!.symbol} className="relative">
                <button
                  onClick={() => removeSymbol(inst!.symbol)}
                  className="absolute top-3 right-3 text-stone-300 hover:text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
                <div className="text-xs text-stone-500">{inst!.name}</div>
                <div className="flex items-end gap-3 mt-1">
                  <div className="text-2xl font-serif font-bold text-navy">{formatCurrency(ltp)}</div>
                  <div className={`text-sm font-medium ${color}`}>
                    {change >= 0 ? '+' : ''}
                    {changePct.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-3">
                  <MiniSparkline data={hist.length > 1 ? hist : [ltp, ltp]} color={change >= 0 ? '#2E7D32' : '#C62828'} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-stone-500">
                  <div>
                    O <span className="text-navy font-medium">{formatCurrency(tick?.open || ltp)}</span>
                  </div>
                  <div>
                    H <span className="text-navy font-medium">{formatCurrency(tick?.high || ltp)}</span>
                  </div>
                  <div>
                    L <span className="text-navy font-medium">{formatCurrency(tick?.low || ltp)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
