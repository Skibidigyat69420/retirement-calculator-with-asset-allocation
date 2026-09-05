import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  RefreshCw,
  TrendingUp,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  PieChart,
  ArrowDownToLine,
  Sliders,
  Terminal,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  type SmartApiCredentials,
  type SmartApiSession,
  type SmartApiHolding,
  type SmartApiFunds,
  loginSmartApi,
  fetchRMSFunds,
  fetchAllHoldings,
  saveCredentials,
  loadSession,
  clearSession,
  generateTOTP,
  buildDefaultCredentials,
  fetchCandleData,
} from '../lib/smartapi';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { useCalculator } from '../context/CalculatorContext';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const AngelConnect = () => {
  const { addAsset, showToast } = useCalculator();

  const [creds, setCreds] = useState<SmartApiCredentials>(() => buildDefaultCredentials());

  const [session, setSession] = useState<SmartApiSession | null>(() => loadSession());
  const [funds, setFunds] = useState<SmartApiFunds | null>(null);
  const [holdings, setHoldings] = useState<SmartApiHolding[]>([]);
  const [activeTotp, setActiveTotp] = useState<string>('');
  const [totpCountdown, setTotpCountdown] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAdvancedNetwork, setShowAdvancedNetwork] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'guide' | 'holdings' | 'scripts'>('connect');
  const [historicalTest, setHistoricalTest] = useState<{ loading: boolean; count: number; message: string | null }>({
    loading: false,
    count: 0,
    message: null,
  });

  // TOTP live generation loop
  useEffect(() => {
    const updateTOTP = () => {
      if (creds.totpSecret) {
        const code = generateTOTP(creds.totpSecret);
        setActiveTotp(code);
      } else {
        setActiveTotp('');
      }
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTotpCountdown(remaining);
    };

    updateTOTP();
    const interval = setInterval(updateTOTP, 1000);
    return () => clearInterval(interval);
  }, [creds.totpSecret]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!creds.apiKey || !creds.clientCode || !creds.pin) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter API Key, Client Code, and PIN / Password.',
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // Save to local storage for convenience
    saveCredentials(creds);

    const res = await loginSmartApi(creds);
    setLoading(false);

    if (res.success && res.session) {
      setSession(res.session);
      setStatusMessage({ type: 'success', text: res.message });
      showToast('Successfully authenticated with Angel One SmartAPI!', 'success');

      // Automatically fetch funds and holdings
      loadPortfolioData(res.session, creds);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
      showToast(res.message || 'SmartAPI authentication failed.', 'error');
    }
  };

  const loadPortfolioData = async (activeSession: SmartApiSession, activeCreds: SmartApiCredentials) => {
    setLoading(true);
    const [fundsRes, holdingsRes] = await Promise.all([
      fetchRMSFunds(activeCreds, activeSession.jwtToken),
      fetchAllHoldings(activeCreds, activeSession.jwtToken),
    ]);

    if (fundsRes.success && fundsRes.data) {
      setFunds(fundsRes.data);
    }
    if (holdingsRes.success && holdingsRes.data) {
      setHoldings(holdingsRes.data);
    }
    setLoading(false);
  };

  const handleDisconnect = () => {
    clearSession();
    setSession(null);
    setFunds(null);
    setHoldings([]);
    setStatusMessage({ type: 'info', text: 'Disconnected from Angel One SmartAPI session.' });
    showToast('Disconnected from Angel One SmartAPI session.', 'info');
  };

  const handleTestHistoricalData = async () => {
    if (!session) {
      setStatusMessage({ type: 'error', text: 'Connect to SmartAPI first.' });
      return;
    }
    setHistoricalTest({ loading: true, count: 0, message: null });
    const to = new Date();
    const from = new Date();
    from.setMonth(to.getMonth() - 3);
    const res = await fetchCandleData(creds, session.jwtToken, {
      exchange: 'NSE',
      symboltoken: '99926000',
      interval: 'ONE_DAY',
      fromdate: `${from.toISOString().split('T')[0]} 09:15`,
      todate: `${to.toISOString().split('T')[0]} 09:15`,
    });
    setHistoricalTest({ loading: false, count: res.data?.length || 0, message: res.message || null });
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.success
        ? `Historical data test passed: fetched ${res.data?.length || 0} daily candles for NIFTY 50.`
        : `Historical data test failed: ${res.message}`,
    });
  };

  const handleSyncToPlan = () => {
    if (holdings.length === 0) return;
    
    // Group holdings by category. Default to 'equity' for unknown stocks.
    const grouped = holdings.reduce((acc, h) => {
      // The symbol in holdings is usually the tradingsymbol (e.g. RELIANCE-EQ)
      // We do a best-effort match, or default to equity.
      let category = 'equity';
      if (h.tradingsymbol.includes('GOLD') || h.tradingsymbol.includes('SGB') || h.tradingsymbol.includes('SILVER') || h.tradingsymbol.includes('COMMODITY')) category = 'gold';
      else if (h.tradingsymbol.includes('LIQUID')) category = 'liquid';
      else if (h.tradingsymbol.includes('GSEC') || h.tradingsymbol.includes('SDL')) category = 'debt';
      
      acc[category] = (acc[category] || 0) + h.totalHoldingValue;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(grouped).forEach(([cat, val]) => {
      if (val > 0) {
        const displayName = cat === 'gold' ? 'Commodities' : cat.charAt(0).toUpperCase() + cat.slice(1);
        addAsset({
          name: `Angel One ${displayName} Portfolio`,
          value: val,
          returnRate: cat === 'equity' ? 12 : cat === 'gold' ? 8 : 6,
          category: cat as any,
        });
      }
    });

    const totalVal = holdings.reduce((acc, h) => acc + h.totalHoldingValue, 0);
    setStatusMessage({
      type: 'success',
      text: `Imported ₹${totalVal.toLocaleString('en-IN')} portfolio value across ${Object.keys(grouped).length} categories!`,
    });
    showToast(`Imported ₹${totalVal.toLocaleString('en-IN')} portfolio value into Master Plan!`, 'success');
  };

  const totalHoldingsValue = holdings.reduce((acc, h) => acc + h.totalHoldingValue, 0);
  const totalPnL = holdings.reduce((acc, h) => acc + h.pnl, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle
          title="Angel One SmartAPI Integration"
          subtitle="Configure live broker API authentication, network endpoints, and automated TOTP generation."
          badge="Live Market Data & Portfolio"
        />

        <div className="flex items-center gap-2">
          {session ? (
            <Badge variant="success" className="px-3 py-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> SmartAPI Connected ({session.userProfile?.clientcode || creds.clientCode})
            </Badge>
          ) : (
            <Badge variant="outline" className="px-3 py-1.5 flex items-center gap-1.5">
              <Wifi size={14} /> Standby / Ready to Connect
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('connect')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'connect' ? 'text-navy border-b-2 border-amber-500' : 'text-zinc-600 hover:text-navy'
          }`}
        >
          API Authentication & Credentials
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'guide' ? 'text-navy border-b-2 border-amber-500' : 'text-zinc-600 hover:text-navy'
          }`}
        >
          Setup Guide & Portal Form
        </button>
        <button
          onClick={() => setActiveTab('holdings')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'holdings' ? 'text-navy border-b-2 border-amber-500' : 'text-zinc-600 hover:text-navy'
          }`}
        >
          Live Portfolio & Holdings ({holdings.length})
        </button>
        <button
          onClick={() => setActiveTab('scripts')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'scripts' ? 'text-navy border-b-2 border-amber-500' : 'text-zinc-600 hover:text-navy'
          }`}
        >
          Standalone Scripts & CLI
        </button>
      </div>

      {/* TAB 1: CONNECT */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <Card className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif text-navy">SmartAPI Connection Parameters</h3>
                <p className="text-xs text-zinc-700">
                  Enter your credentials from the Angel One SmartAPI Developer Portal.
                </p>
              </div>
              <a
                href="https://smartapi.angelone.in/docs/Introduction#"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-navy flex items-center gap-1 hover:text-zinc-950 underline"
              >
                SmartAPI Docs <ExternalLink size={12} />
              </a>
            </div>

            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-sm flex items-start gap-2.5 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-zinc-50 text-slate-800 border border-zinc-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{statusMessage.text}</div>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                    API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7Xxxxxxx"
                    value={creds.apiKey}
                    onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                    aria-label="API Key"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:border-navy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                    Angel One Client Code (User ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. S123456"
                    value={creds.clientCode}
                    onChange={(e) => setCreds({ ...creds, clientCode: e.target.value.toUpperCase() })}
                    aria-label="Angel One Client Code"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:border-navy"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
                    MPIN / Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="4-digit MPIN or Password"
                    value={creds.pin}
                    onChange={(e) => setCreds({ ...creds, pin: e.target.value })}
                    aria-label="MPIN or Password"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
                      TOTP Secret Key (QR Token)
                    </label>
                    <a
                      href="https://smartapi.angelone.in/enable-totp"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-navy hover:text-zinc-950 underline flex items-center gap-1"
                    >
                      Get Secret <ExternalLink size={10} />
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="Base32 Secret e.g. JBSWY3DPEHPK3PXP"
                    value={creds.totpSecret || ''}
                    onChange={(e) => setCreds({ ...creds, totpSecret: e.target.value })}
                    aria-label="TOTP Secret Key"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              {/* TOTP Live Preview */}
              {creds.totpSecret && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy font-bold">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-zinc-600">Live Generated TOTP</div>
                      <div className="text-base font-mono font-bold text-navy tracking-widest">
                        {activeTotp || '------'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-700">{totpCountdown}s refresh</div>
                    <div className="w-20 bg-zinc-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-1000"
                        style={{ width: `${(totpCountdown / 30) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Network Collapsible */}
              <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-cream/40">
                <button
                  type="button"
                  onClick={() => setShowAdvancedNetwork(!showAdvancedNetwork)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-navy uppercase tracking-wider"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} className="text-zinc-500" /> System Network Headers (Auto-Detected)
                  </span>
                  <span className="text-zinc-600 text-[11px]">
                    {showAdvancedNetwork ? 'Hide ▲' : 'Show Details ▼'}
                  </span>
                </button>

                {showAdvancedNetwork && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div>
                      <label className="block text-zinc-700 mb-1">Public IP (ClientPublicIP)</label>
                      <input
                        type="text"
                        value={creds.publicIp}
                        onChange={(e) => setCreds({ ...creds, publicIp: e.target.value })}
                        aria-label="Public IP"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 mb-1">Local IP (ClientLocalIP)</label>
                      <input
                        type="text"
                        value={creds.localIp}
                        onChange={(e) => setCreds({ ...creds, localIp: e.target.value })}
                        aria-label="Local IP"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 mb-1">MAC Address (MACAddress)</label>
                      <input
                        type="text"
                        value={creds.macAddress}
                        onChange={(e) => setCreds({ ...creds, macAddress: e.target.value })}
                        aria-label="MAC Address"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading} className="flex-1 py-3">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" /> Authenticating...
                    </span>
                  ) : session ? (
                    'Re-Authenticate & Refresh Session'
                  ) : (
                    'Connect to SmartAPI'
                  )}
                </Button>

                {session && (
                  <Button type="button" variant="outline" onClick={handleDisconnect} className="py-3 text-rose-600">
                    Disconnect
                  </Button>
                )}
              </div>

              {session && (
                <div className="pt-4 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestHistoricalData}
                    disabled={historicalTest.loading}
                    className="w-full text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={14} className={historicalTest.loading ? 'animate-spin' : ''} />
                    {historicalTest.loading ? 'Testing NIFTY 50 daily candles...' : 'Test Historical Data (NIFTY 50)'}
                  </Button>
                  {historicalTest.count > 0 && (
                    <p className="text-xs text-emerald-700 mt-2 text-center">
                      Fetched {historicalTest.count} daily candles successfully.
                    </p>
                  )}
                </div>
              )}
            </form>
          </Card>

          {/* Right Col: Active Profile & Info Card */}
          <div className="space-y-6">
            <Card className="bg-navy text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <ShieldCheck size={120} />
              </div>
              <h3 className="text-lg font-serif text-white mb-2">Network & Identity</h3>
              <p className="text-xs text-zinc-200 mb-4">
                Angel One SmartAPI matches these headers with your registered developer app.
              </p>

              <div className="space-y-3 text-xs font-mono">
                <div className="bg-white/10 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-white block text-[10px]">PUBLIC IP</span>
                    <span className="text-white font-semibold">{creds.publicIp}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(creds.publicIp, 'pubIp')}
                    className="text-zinc-200 hover:text-zinc-950 p-1 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900/50"
                    title="Copy Public IP"
                    aria-label="Copy Public IP"
                    type="button"
                  >
                    {copiedKey === 'pubIp' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="bg-white/10 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-white block text-[10px]">LOCAL IP</span>
                    <span className="text-white font-semibold">{creds.localIp}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(creds.localIp, 'locIp')}
                    className="text-zinc-200 hover:text-zinc-950 p-1 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900/50"
                    title="Copy Local IP"
                    aria-label="Copy Local IP"
                    type="button"
                  >
                    {copiedKey === 'locIp' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="bg-white/10 p-2.5 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-white block text-[10px]">MAC ADDRESS</span>
                    <span className="text-white font-semibold">{creds.macAddress}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(creds.macAddress, 'mac')}
                    className="text-zinc-200 hover:text-zinc-950 p-1 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900/50"
                    title="Copy MAC"
                    aria-label="Copy MAC"
                    type="button"
                  >
                    {copiedKey === 'mac' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Profile Overview if connected */}
            {session && (
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200/20 flex items-center justify-center text-navy font-bold">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-navy">
                      {session.userProfile?.name || session.userProfile?.clientcode || creds.clientCode}
                    </div>
                    <div className="text-xs text-zinc-700">Angel One Account Active</div>
                  </div>
                </div>

                {funds && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2.5 bg-zinc-50 rounded-lg">
                      <span className="text-zinc-600 block text-[10px]">AVAILABLE CASH</span>
                      <span className="font-semibold text-navy">{formatCurrency(funds.availablecash)}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-50 rounded-lg">
                      <span className="text-zinc-600 block text-[10px]">TOTAL MARGIN</span>
                      <span className="font-semibold text-navy">{formatCurrency(funds.availablemargin)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => loadPortfolioData(session, creds)}
                    disabled={loading}
                    className="w-full text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Portfolio & Margins
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STEP-BY-STEP GUIDE */}
      {activeTab === 'guide' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="space-y-5">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <Key size={20} className="text-zinc-500" /> Step 1: Create App on Angel One Portal
            </h3>

            <div className="space-y-3 text-xs text-zinc-600">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="font-semibold text-navy text-sm mb-1">1. Visit the Developer Portal</div>
                <p>
                  Go to{' '}
                  <a
                    href="https://smartapi.angelone.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 font-semibold hover:underline"
                  >
                    smartapi.angelone.in
                  </a>{' '}
                  and log in with your Angel One credentials.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="font-semibold text-navy text-sm mb-1">2. Click "Create App"</div>
                <p className="mb-2">Fill in the creation form with these recommended parameters:</p>
                <ul className="space-y-1.5 font-mono">
                  <li className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                    <span>App Name:</span>
                    <span className="text-navy font-semibold">SoundThesisWealth</span>
                  </li>
                  <li className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                    <span>API Type:</span>
                    <span className="text-navy font-semibold">Trading API</span>
                  </li>
                  <li className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                    <span>Redirect URL:</span>
                    <span className="text-navy font-semibold">http://localhost:5173/</span>
                  </li>
                  <li className="flex justify-between items-center bg-white p-2 rounded border border-zinc-200">
                    <span>Public IP (if asked):</span>
                    <span className="text-navy font-semibold">{creds.publicIp}</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="font-semibold text-navy text-sm mb-1">3. Copy your API Key</div>
                <p>After creating the app, copy the generated API Key and paste it in the Connection tab.</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <h3 className="text-lg font-serif text-navy flex items-center gap-2">
              <ShieldCheck size={20} className="text-zinc-500" /> Step 2: Enable Automated TOTP
            </h3>

            <div className="space-y-3 text-xs text-zinc-600">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="font-semibold text-navy text-sm mb-1">1. Open Enable TOTP Page</div>
                <p>
                  Visit{' '}
                  <a
                    href="https://smartapi.angelone.in/enable-totp"
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-900 font-semibold hover:underline"
                  >
                    smartapi.angelone.in/enable-totp
                  </a>{' '}
                  and enter your Client Code + PIN.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="font-semibold text-navy text-sm mb-1">2. Copy the QR / Base32 Secret</div>
                <p>
                  You will see a QR code with a text code underneath (e.g.{' '}
                  <code className="bg-zinc-200 px-1 py-0.5 rounded">JBSWY3DPEHPK3PXP...</code>). Copy this Secret string!
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <div className="font-semibold text-emerald-950 text-sm mb-1">3. Automated 30s Live OTP</div>
                <p>
                  Paste the secret into the TOTP Secret input field. This app will now continuously generate authentic
                  time-synced 6-digit TOTP codes without requiring manual SMS or authenticator apps!
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: HOLDINGS & PORTFOLIO */}
      {activeTab === 'holdings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white">
              <div className="text-xs text-zinc-700 font-medium">Total Live Portfolio Value</div>
              <div className="text-2xl font-serif font-bold text-navy mt-1">{formatCurrency(totalHoldingsValue)}</div>
              <div className="text-xs text-zinc-600 mt-1">{holdings.length} Positions</div>
            </Card>

            <Card className="bg-white">
              <div className="text-xs text-zinc-700 font-medium">Total Unrealized P&L</div>
              <div className={`text-2xl font-serif font-bold mt-1 ${totalPnL >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(totalPnL)}
              </div>
              <div className="text-xs text-zinc-600 mt-1">
                {totalHoldingsValue > 0 ? formatPercent((totalPnL / totalHoldingsValue) * 100) : '0%'}
              </div>
            </Card>

            <Card className="bg-emerald-50/10 border-emerald-200/30 flex flex-col justify-between">
              <div>
                <div className="text-xs text-navy font-semibold">Sync with Wealth Planner</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  Directly populate your retirement asset allocation with your live broker portfolio.
                </div>
              </div>
              <Button
                onClick={handleSyncToPlan}
                disabled={holdings.length === 0}
                className="mt-3 text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <ArrowDownToLine size={14} /> Import to Asset Allocation
              </Button>
            </Card>
          </div>

          <Card className="overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-serif text-navy">Live Angel One Demat Holdings</h3>
              {session && (
                <Button
                  variant="outline"
                  onClick={() => loadPortfolioData(session, creds)}
                  disabled={loading}
                  className="text-xs py-1.5"
                >
                  <RefreshCw size={12} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Quotes
                </Button>
              )}
            </div>

            {holdings.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <PieChart size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No live holdings loaded yet.</p>
                <p className="text-xs mt-1">Connect your Angel One API credentials to stream your portfolio.</p>
              </div>
            ) : (
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-600 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Stock / Symbol</th>
                    <th className="pb-3 font-semibold text-right">Quantity</th>
                    <th className="pb-3 font-semibold text-right">Avg Price</th>
                    <th className="pb-3 font-semibold text-right">Live LTP</th>
                    <th className="pb-3 font-semibold text-right">Current Value</th>
                    <th className="pb-3 font-semibold text-right">P&L (Return)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holdings.map((h, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 font-semibold text-navy flex items-center gap-2">
                        <TrendingUp size={14} className="text-zinc-500" />
                        <div>
                          <div>{h.tradingsymbol}</div>
                          <span className="text-[10px] text-zinc-600 font-normal">{h.exchange}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono">{h.quantity}</td>
                      <td className="py-3 text-right font-mono">{formatCurrency(h.averageprice)}</td>
                      <td className="py-3 text-right font-mono font-semibold text-navy">{formatCurrency(h.ltp)}</td>
                      <td className="py-3 text-right font-mono font-semibold">{formatCurrency(h.totalHoldingValue)}</td>
                      <td className={`py-3 text-right font-mono font-semibold ${h.pnl >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatCurrency(h.pnl)} ({formatPercent(h.totalPnlPercentage)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: STANDALONE SCRIPTS & CLI */}
      {activeTab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif text-navy flex items-center gap-2">
                <Terminal size={18} className="text-zinc-500" /> Node.js Standalone Script
              </h3>
              <Badge variant="outline">scripts/test-smartapi.js</Badge>
            </div>
            <p className="text-xs text-zinc-700">
              Run this script directly in your terminal to test authentication and stream market quotes without the browser:
            </p>
            <div className="bg-slate-900 text-zinc-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <code>
                # Run with pre-configured settings
                <br />
                node scripts/test-smartapi.js
                <br />
                <br />
                # Or pass credentials inline
                <br />
                ANGEL_API_KEY="{creds.apiKey || 'YOUR_KEY'}" \<br />
                ANGEL_CLIENT_CODE="{creds.clientCode || 'YOUR_CLIENT_CODE'}" \<br />
                ANGEL_PIN="1234" \<br />
                ANGEL_TOTP_SECRET="{creds.totpSecret || 'YOUR_SECRET'}" \<br />
                node scripts/test-smartapi.js
              </code>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif text-navy flex items-center gap-2">
                <Terminal size={18} className="text-zinc-500" /> Python Connector Script
              </h3>
              <Badge variant="outline">smartapi_connector.py</Badge>
            </div>
            <p className="text-xs text-zinc-700">
              Use the Python client for algorithmic trading or automated data pipelines:
            </p>
            <div className="bg-slate-900 text-zinc-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <code>
                # Python execution
                <br />
                python3 smartapi_connector.py
                <br />
                <br />
                # Environment file configuration
                <br />
                cp .env.example .env
              </code>
            </div>
          </Card>
        </div>
      )}

      <WorkflowFooter
        prev={{ path: '/calculators', label: 'Calculators' }}
        next={{ path: '/angel-data', label: 'Angel Data' }}
        flowHint="Connect your Angel One SmartAPI account to sync live equity, debt, and gold holdings directly into your wealth plan."
      />
    </div>
  );
};
