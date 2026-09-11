import { useReducer, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  User,
  Wallet,
  Briefcase,
  ListOrdered,
  Receipt,
  TrendingUp,
  AlertCircle,
  Database,
  Globe,
  PieChart as PieChartIcon,
  Scale,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { DonutChart } from '../components/charts/DonutChart';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS } from '../lib/constants';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  loadSession,
  buildDefaultCredentials,
  fetchUserProfile,
  fetchRMSFunds,
  fetchAllHoldings,
  fetchPositions,
  fetchOrderBook,
  fetchTradeBook,
} from '../lib/smartapi';

interface SnapshotFile {
  profile?: string;
  rms?: string;
  holdings?: string;
  positions?: string;
  order_book?: string;
  trade_book?: string;
  historical?: string;
  quotes?: string;
}

interface Snapshot {
  timestamp: string;
  client_code: string;
  files: SnapshotFile;
}

interface DataState {
  snapshot: Snapshot | null;
  loading: boolean;
  error: string | null;
  snapshotMissing: boolean;
}

type DataAction =
  | { type: 'load' }
  | { type: 'success'; payload: Snapshot }
  | { type: 'missing' }
  | { type: 'error'; payload: string };

const initialDataState: DataState = { snapshot: null, loading: false, error: null, snapshotMissing: false };

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'load':
      return { ...state, loading: true, error: null, snapshotMissing: false };
    case 'success':
      return { snapshot: action.payload, loading: false, error: null, snapshotMissing: false };
    case 'missing':
      return { snapshot: null, loading: false, error: null, snapshotMissing: true };
    case 'error':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

export const AngelData = () => {
  const [state, dispatch] = useReducer(dataReducer, initialDataState);
  const { snapshot, loading, error, snapshotMissing } = state;

  const loadSnapshot = useCallback(async () => {
    dispatch({ type: 'load' });
    try {
      const response = await fetch('/api/angel-one-snapshot');
      if (!response.ok) {
        if (response.status === 404) {
          dispatch({ type: 'missing' });
          return;
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Snapshot request failed: ${response.status}`);
      }
      const data: Snapshot = await response.json();
      dispatch({ type: 'success', payload: data });
    } catch (err: any) {
      dispatch({ type: 'error', payload: err?.message || 'Failed to load Angel One snapshot' });
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleLiveRefresh = async () => {
    const session = loadSession();
    if (!session) {
      dispatch({ type: 'error', payload: 'Please connect to Angel One SmartAPI first via the Angel Connect page.' });
      return;
    }
    const creds = buildDefaultCredentials();
    dispatch({ type: 'load' });
    try {
      const [profile, rms, holdings, positions, orderBook, tradeBook] = await Promise.all([
        fetchUserProfile(creds, session.jwtToken),
        fetchRMSFunds(creds, session.jwtToken),
        fetchAllHoldings(creds, session.jwtToken),
        fetchPositions(creds, session.jwtToken),
        fetchOrderBook(creds, session.jwtToken),
        fetchTradeBook(creds, session.jwtToken),
      ]);
      dispatch({
        type: 'success',
        payload: {
          timestamp: new Date().toISOString(),
          client_code: creds.clientCode,
          files: {
            profile: JSON.stringify(profile),
            rms: JSON.stringify(rms),
            holdings: JSON.stringify(holdings),
            positions: JSON.stringify(positions),
            order_book: JSON.stringify(orderBook),
            trade_book: JSON.stringify(tradeBook),
          },
        },
      });
    } catch (err: any) {
      dispatch({ type: 'error', payload: err?.message || 'Live refresh failed' });
    }
  };

  const parseFile = (value?: string) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const profile = parseFile(snapshot?.files.profile);
  const rms = parseFile(snapshot?.files.rms);
  const holdings = parseFile(snapshot?.files.holdings);
  const positions = parseFile(snapshot?.files.positions);
  const orderBook = parseFile(snapshot?.files.order_book);
  const tradeBook = parseFile(snapshot?.files.trade_book);

  const holdingList = holdings?.data?.holdings || holdings?.data || [];
  const positionList = positions?.data?.net || positions?.data?.positions || positions?.data || [];
  const orderList = orderBook?.data || [];
  const tradeList = tradeBook?.data || [];

  // Normalised holding rows for the allocation donut and P&L visualisations.
  // Memoized on the raw holdings JSON so it re-evaluates only when the snapshot changes.
  const holdingRows = useMemo(() => {
    const parsed = parseFile(snapshot?.files.holdings);
    const list = (parsed?.data?.holdings || parsed?.data || []) as any[];
    return list
      .map((h) => ({
        symbol: h.tradingsymbol || 'Unknown',
        value: Number(h.totalHoldingValue) || Number(h.quantity) * Number(h.ltp) || 0,
        pnl: Number(h.pnl) || 0,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [snapshot?.files.holdings]);

  const holdingsTotal = useMemo(() => holdingRows.reduce((s, r) => s + r.value, 0), [holdingRows]);
  const holdingsPnlTotal = useMemo(() => holdingRows.reduce((s, r) => s + r.pnl, 0), [holdingRows]);

  // Slice colours reuse the sanctioned asset-category palette (labels in the
  // legend and adjacent table carry the encoding, so colour is never alone).
  const HOLDING_PALETTE = useMemo(() => Array.from(new Set(Object.values(ASSET_COLORS))), []);

  const holdingsDonutData = useMemo(() => {
    const top = holdingRows.slice(0, 6).map((r, i) => ({
      name: r.symbol,
      value: r.value,
      color: HOLDING_PALETTE[i % HOLDING_PALETTE.length],
    }));
    const rest = holdingRows.slice(6);
    if (rest.length > 0) {
      top.push({
        name: `Others (${rest.length})`,
        value: rest.reduce((s, r) => s + r.value, 0),
        color: HOLDING_PALETTE[5 % HOLDING_PALETTE.length],
      });
    }
    return top;
  }, [holdingRows, HOLDING_PALETTE]);

  const pnlBarData = useMemo(() => {
    const top = [...holdingRows].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 8);
    return top.map((r) => ({ symbol: r.symbol, pnl: r.pnl }));
  }, [holdingRows]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Angel One Data Dump"
        subtitle="A SELECT * view of your Angel One account: profile, funds, holdings, positions, orders, and trades. Load the latest local snapshot or refresh live."
        badge="Live Broker Data"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={loadSnapshot} disabled={loading} className="flex items-center gap-2">
          <Database size={16} /> Load Latest Snapshot
        </Button>
        <Button onClick={handleLiveRefresh} disabled={loading} variant="outline" className="flex items-center gap-2">
          <Globe size={16} /> Refresh Live
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <RefreshCw size={16} className="animate-spin" /> Loading Angel One data...
        </div>
      )}

      {error && (
        <Alert variant="warning" icon={AlertCircle}>
          {error}
        </Alert>
      )}

      {snapshotMissing && !loading && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sunken rounded-lg shrink-0">
              <Database size={18} className="text-muted" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">No Angel One snapshot available on this deployment</h3>
              <p className="text-sm text-ink-soft mt-1">
                Snapshots are captured by the local data pipeline and are not published with the app.
                Use <span className="font-medium">Refresh Live</span> to pull profile, funds, holdings, positions,
                orders, and trades directly from Angel One SmartAPI after connecting on the Angel Connect page.
              </p>
            </div>
          </div>
        </Card>
      )}

      {snapshot && (
        <div className="text-xs text-ink-soft">
          Snapshot: {new Date(snapshot.timestamp).toLocaleString()} · Client: {snapshot.client_code}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-warning" />
            <h3 className="text-lg font-serif text-deep">Profile</h3>
          </div>
          {profile?.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Name</span><span className="font-medium">{profile.data.name}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Client Code</span><span className="font-medium">{profile.data.clientcode}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Email</span><span className="font-medium">{profile.data.email}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Exchanges</span><span className="font-medium">{profile.data.exchanges?.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Products</span><span className="font-medium">{profile.data.products?.join(', ')}</span></div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No profile data available.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-warning" />
            <h3 className="text-lg font-serif text-deep">RMS / Funds</h3>
          </div>
          {rms?.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-soft">Net</span><span className="font-medium">{formatCurrency(rms.data.net)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Available Cash</span><span className="font-medium">{formatCurrency(rms.data.availablecash)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Available Margin</span><span className="font-medium">{formatCurrency(rms.data.availablemargin)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Collateral</span><span className="font-medium">{formatCurrency(rms.data.collateral)}</span></div>
              <div className="flex justify-between"><span className="text-ink-soft">Utilised Debits</span><span className="font-medium">{formatCurrency(rms.data.utiliseddebits)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No RMS data available.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={18} className="text-warning" />
          <h3 className="text-lg font-serif text-deep">Holdings</h3>
          <Badge variant="outline">{holdingList.length}</Badge>
        </div>
        {holdingList.length > 0 ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Avg Price</th>
                  <th className="py-2 pr-4 text-right">LTP</th>
                  <th className="py-2 pr-4 text-right">Value</th>
                  <th className="py-2 pr-4 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdingList.map((h: any, idx: number) => (
                  <tr key={idx} className="border-b border-border-subtle">
                    <td className="py-2 pr-4 font-medium">{h.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right">{h.quantity}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.averageprice)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.ltp)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.totalHoldingValue || h.quantity * h.ltp)}</td>
                    <td className={`py-2 pr-4 text-right ${(h.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(h.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No holdings found.</p>
        )}
      </Card>

      {holdingRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <PieChartIcon size={18} className="text-warning" />
              <h3 className="text-lg font-serif text-deep">Holdings Allocation</h3>
            </div>
            <p className="text-xs text-ink-soft mb-2">
              {holdingRows[0]?.symbol} is the largest position at{' '}
              <span className="font-mono font-bold text-deep">{formatPercent((holdingRows[0].value / Math.max(1, holdingsTotal)) * 100)}</span> of the{' '}
              {formatCurrencyCompact(holdingsTotal)} equity book{holdingRows.length > 6 ? `; the remaining ${holdingRows.length - 6} holdings are grouped as "Others".` : '.'}
            </p>
            <div
              role="img"
              aria-label={`Donut chart of holdings allocation by symbol. Largest holding: ${holdingRows[0]?.symbol} at ${formatPercent((holdingRows[0]?.value ?? 0) / Math.max(1, holdingsTotal) * 100)} of total value.`}
            >
              <DonutChart data={holdingsDonutData} />
            </div>
            <table className="sr-only">
              <caption>Holdings allocation by symbol</caption>
              <thead>
                <tr><th>Symbol</th><th>Value</th></tr>
              </thead>
              <tbody>
                {holdingRows.map((r) => (
                  <tr key={r.symbol}>
                    <td>{r.symbol}</td>
                    <td>{formatCurrency(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Scale size={18} className="text-warning" />
              <h3 className="text-lg font-serif text-deep">P&L per Holding</h3>
            </div>
            <p className="text-xs text-ink-soft mb-2">
              Unrealised P&L across the book nets to{' '}
              <span className={`font-mono font-bold ${holdingsPnlTotal >= 0 ? 'text-positive' : 'text-negative'}`}>
                {holdingsPnlTotal >= 0 ? '+' : ''}{formatCurrency(holdingsPnlTotal)}
              </span>
              {pnlBarData[0] ? `; ${pnlBarData[0].symbol} contributes the largest absolute move at ${formatCurrency(Math.abs(pnlBarData[0].pnl))}.` : '.'}
            </p>
            <div
              className="h-72 w-full"
              role="img"
              aria-label={`Horizontal bar chart of unrealised profit and loss per holding. Net book P&L is ${formatCurrency(holdingsPnlTotal)}.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlBarData} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    width={90}
                    tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Unrealised P&L']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      padding: '10px 14px',
                    }}
                  />
                  <ReferenceLine x={0} stroke="var(--color-border-strong)" />
                  <Bar dataKey="pnl" name="Unrealised P&L" radius={[4, 4, 4, 4]} minPointSize={2}>
                    {pnlBarData.map((d) => (
                      <Cell key={d.symbol} style={{ fill: d.pnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-positive" /> Gain</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-negative" /> Loss</span>
            </div>
            <table className="sr-only">
              <caption>Unrealised profit and loss per holding</caption>
              <thead>
                <tr><th>Symbol</th><th>Unrealised P&L</th></tr>
              </thead>
              <tbody>
                {pnlBarData.map((r) => (
                  <tr key={r.symbol}>
                    <td>{r.symbol}</td>
                    <td>{formatCurrency(r.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-warning" />
          <h3 className="text-lg font-serif text-deep">Positions</h3>
          <Badge variant="outline">{positionList.length}</Badge>
        </div>
        {positionList.length > 0 ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Exchange</th>
                  <th className="py-2 pr-4 text-right">Buy Qty</th>
                  <th className="py-2 pr-4 text-right">Sell Qty</th>
                  <th className="py-2 pr-4 text-right">Net Qty</th>
                  <th className="py-2 pr-4 text-right">LTP</th>
                  <th className="py-2 pr-4 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positionList.map((p: any, idx: number) => (
                  <tr key={idx} className="border-b border-border-subtle">
                    <td className="py-2 pr-4 font-medium">{p.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right">{p.exchange}</td>
                    <td className="py-2 pr-4 text-right">{p.buyqty}</td>
                    <td className="py-2 pr-4 text-right">{p.sellqty}</td>
                    <td className="py-2 pr-4 text-right">{p.netqty}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(p.ltp)}</td>
                    <td className={`py-2 pr-4 text-right ${(p.pnl || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(p.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No positions found.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered size={18} className="text-warning" />
          <h3 className="text-lg font-serif text-deep">Order Book</h3>
          <Badge variant="outline">{orderList.length}</Badge>
        </div>
        {orderList.length > 0 ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Order ID</th>
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Side</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Price</th>
                  <th className="py-2 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((o: any, idx: number) => (
                  <tr key={idx} className="border-b border-border-subtle">
                    <td className="py-2 pr-4">{o.orderid}</td>
                    <td className="py-2 pr-4 font-medium">{o.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right uppercase">{o.transactiontype}</td>
                    <td className="py-2 pr-4 text-right">{o.quantity}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(o.price)}</td>
                    <td className="py-2 pr-4 text-right"><Badge variant="outline">{o.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No orders found.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-warning" />
          <h3 className="text-lg font-serif text-deep">Trade Book</h3>
          <Badge variant="outline">{tradeList.length}</Badge>
        </div>
        {tradeList.length > 0 ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-ink-soft">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Side</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {tradeList.map((t: any, idx: number) => (
                  <tr key={idx} className="border-b border-border-subtle">
                    <td className="py-2 pr-4">{t.filltime || t.tradetime}</td>
                    <td className="py-2 pr-4 font-medium">{t.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right uppercase">{t.transactiontype}</td>
                    <td className="py-2 pr-4 text-right">{t.fillqty || t.quantity}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(t.fillprice || t.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No trades found.</p>
        )}
      </Card>

      <WorkflowFooter
        prev={{ path: '/angel-connect', label: 'Angel Connect' }}
        next={{ path: '/', label: 'Dashboard' }}
        flowHint="Live JSON snapshot logs and market telemetry verifying raw API payloads from Angel One SmartAPI."
      />
    </div>
  );
};
