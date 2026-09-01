import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { formatCurrency } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
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

export const AngelData = () => {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/angel-one-snapshot');
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Snapshot request failed: ${response.status}`);
      }
      const data: Snapshot = await response.json();
      setSnapshot(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Angel One snapshot');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const handleLiveRefresh = async () => {
    const session = loadSession();
    if (!session) {
      alert('Please connect to Angel One SmartAPI first via the Angel Connect page.');
      return;
    }
    const creds = buildDefaultCredentials();
    setLoading(true);
    setError(null);
    try {
      const [profile, rms, holdings, positions, orderBook, tradeBook] = await Promise.all([
        fetchUserProfile(creds, session.jwtToken),
        fetchRMSFunds(creds, session.jwtToken),
        fetchAllHoldings(creds, session.jwtToken),
        fetchPositions(creds, session.jwtToken),
        fetchOrderBook(creds, session.jwtToken),
        fetchTradeBook(creds, session.jwtToken),
      ]);
      setSnapshot({
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
      });
    } catch (err: any) {
      setError(err?.message || 'Live refresh failed');
    } finally {
      setLoading(false);
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
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <RefreshCw size={16} className="animate-spin" /> Loading Angel One data...
        </div>
      )}

      {error && (
        <Alert variant="warning" icon={AlertCircle}>
          {error}
        </Alert>
      )}

      {snapshot && (
        <div className="text-xs text-stone-500">
          Snapshot: {new Date(snapshot.timestamp).toLocaleString()} · Client: {snapshot.client_code}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Profile</h3>
          </div>
          {profile?.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Name</span><span className="font-medium">{profile.data.name}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Client Code</span><span className="font-medium">{profile.data.clientcode}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Email</span><span className="font-medium">{profile.data.email}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Exchanges</span><span className="font-medium">{profile.data.exchanges?.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Products</span><span className="font-medium">{profile.data.products?.join(', ')}</span></div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">No profile data available.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">RMS / Funds</h3>
          </div>
          {rms?.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Net</span><span className="font-medium">{formatCurrency(rms.data.net)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Available Cash</span><span className="font-medium">{formatCurrency(rms.data.availablecash)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Available Margin</span><span className="font-medium">{formatCurrency(rms.data.availablemargin)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Collateral</span><span className="font-medium">{formatCurrency(rms.data.collateral)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Utilised Debits</span><span className="font-medium">{formatCurrency(rms.data.utiliseddebits)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-stone-500">No RMS data available.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase size={18} className="text-gold" />
          <h3 className="text-lg font-serif text-navy">Holdings</h3>
          <Badge variant="outline">{holdingList.length}</Badge>
        </div>
        {holdingList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
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
                  <tr key={idx} className="border-b border-stone-100">
                    <td className="py-2 pr-4 font-medium">{h.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right">{h.quantity}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.averageprice)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.ltp)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(h.totalHoldingValue || h.quantity * h.ltp)}</td>
                    <td className={`py-2 pr-4 text-right ${(h.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(h.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No holdings found.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-gold" />
          <h3 className="text-lg font-serif text-navy">Positions</h3>
          <Badge variant="outline">{positionList.length}</Badge>
        </div>
        {positionList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
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
                  <tr key={idx} className="border-b border-stone-100">
                    <td className="py-2 pr-4 font-medium">{p.tradingsymbol}</td>
                    <td className="py-2 pr-4 text-right">{p.exchange}</td>
                    <td className="py-2 pr-4 text-right">{p.buyqty}</td>
                    <td className="py-2 pr-4 text-right">{p.sellqty}</td>
                    <td className="py-2 pr-4 text-right">{p.netqty}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(p.ltp)}</td>
                    <td className={`py-2 pr-4 text-right ${(p.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(p.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-500">No positions found.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered size={18} className="text-gold" />
          <h3 className="text-lg font-serif text-navy">Order Book</h3>
          <Badge variant="outline">{orderList.length}</Badge>
        </div>
        {orderList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Side</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Price</th>
                  <th className="py-2 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((o: any, idx: number) => (
                  <tr key={idx} className="border-b border-stone-100">
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
          <p className="text-sm text-stone-500">No orders found.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Receipt size={18} className="text-gold" />
          <h3 className="text-lg font-serif text-navy">Trade Book</h3>
          <Badge variant="outline">{tradeList.length}</Badge>
        </div>
        {tradeList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Symbol</th>
                  <th className="py-2 pr-4 text-right">Side</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {tradeList.map((t: any, idx: number) => (
                  <tr key={idx} className="border-b border-stone-100">
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
          <p className="text-sm text-stone-500">No trades found.</p>
        )}
      </Card>

      <WorkflowFooter
        prev={{ path: '/connect', label: 'Angel One Connect' }}
        next={{ path: '/', label: 'Dashboard' }}
        flowHint="Live JSON snapshot logs and market telemetry verifying raw API payloads from Angel One SmartAPI."
      />
    </div>
  );
};
