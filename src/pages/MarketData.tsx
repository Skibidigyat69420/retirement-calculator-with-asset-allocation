import { useState, useMemo } from 'react';
import { Database, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useMarketData } from '../hooks/useMarketData';
import { INSTRUMENTS } from '../lib/instruments';
import { getDefaultDateRange } from '../lib/marketData';
import { loadSession, buildDefaultCredentials } from '../lib/smartapi';
import { formatPercent } from '../lib/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const MarketData = () => {
  const { data, loading, progress, error, fetchData } = useMarketData();
  const defaultRange = useMemo(() => getDefaultDateRange(2), []);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['NIFTY50', 'GOLDBEES']);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.prices[0]?.dates.map((date, idx) => {
      const point: Record<string, number | string> = { date };
      data.prices.forEach((series) => {
        const base = series.closes[0] || 1;
        point[series.symbol] = (series.closes[idx] / base) * 100;
      });
      return point;
    });
  }, [data]);

  const handleFetch = async () => {
    const session = loadSession();
    if (!session) {
      alert('Please connect to Angel One SmartAPI first via the Angel Connect page.');
      return;
    }
    const creds = buildDefaultCredentials();
    await fetchData(selectedSymbols, from, to, creds, session);
  };

  const downloadCSV = () => {
    if (!data) return;
    const headers = ['date', ...data.symbols].join(',');
    const rows = data.prices[0].dates.map((date, idx) =>
      [date, ...data.prices.map((s) => s.closes[idx])].join(','),
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-data-${data.dateRange.from}-to-${data.dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Market Data Explorer"
        subtitle="Inspect and download live Angel One daily price history for selected instruments."
        badge="Quant Lab"
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.filter((i) => i.benchmark).map((inst) => (
            <button
              key={inst.symbol}
              onClick={() =>
                setSelectedSymbols((prev) =>
                  prev.includes(inst.symbol) ? prev.filter((s) => s !== inst.symbol) : [...prev, inst.symbol],
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedSymbols.includes(inst.symbol)
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-navy'
              }`}
            >
              {inst.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-navy"
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-xl text-sm flex items-start gap-2.5 bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleFetch} disabled={loading || selectedSymbols.length === 0}>
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Fetching {progress.currentSymbol}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Database size={16} /> Load Data
              </span>
            )}
          </Button>
          {data && (
            <Button variant="outline" onClick={downloadCSV}>
              <Download size={16} className="mr-1.5" /> CSV
            </Button>
          )}
        </div>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.stats.map((s) => (
              <Card key={s.symbol}>
                <div className="text-xs text-stone-500">{s.symbol}</div>
                <div className="text-lg font-serif font-bold text-navy">{formatPercent(s.annualizedReturn * 100)}</div>
                <div className="text-xs text-stone-400">Vol: {formatPercent(s.annualizedVolatility * 100)}</div>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-6">Normalized Price History</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${v.toFixed(0)}`}
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {data.symbols.map((symbol, idx) => (
                    <Line
                      key={symbol}
                      type="monotone"
                      dataKey={symbol}
                      stroke={['#1A233A', '#B68B40', '#2E7D32', '#8D6E63', '#D4AF37'][idx % 5]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
