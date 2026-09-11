import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, ChevronRight, CircleHelp, Download, Filter, LayoutGrid, List, LogOut, RefreshCw, Search, ShieldCheck, Sparkles, Users, WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiRequestError, exportClientBundle, listClients, type ClientSummary } from '../lib/api';
import { formatCurrencyCompact } from '../lib/formatters';

const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const palette = ['violet', 'blue', 'amber', 'rose', 'teal', 'indigo'];

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return <div className="directory-metric"><div className="directory-metric-icon"><Icon size={17} /></div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></div>;
}

export function PractitionerPage() {
  const { ready, user, organizationName, logout } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await listClients();
      const assigned = response.data.filter((client) => client.assignedPractitioners.some((advisor) => advisor.userId === user?.id));
      setClients(assigned);
      if (!selectedId && assigned[0]) setSelectedId(assigned[0].id);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not load the client database.');
    } finally { setLoading(false); }
  }, [selectedId, user?.id]);

  useEffect(() => { if (ready && user) void loadClients(); }, [ready, user, loadClients]);

  const filtered = useMemo(() => clients.filter((client) => client.name.toLowerCase().includes(query.toLowerCase()) || client.assignedPractitioners.some((advisor) => advisor.fullName?.toLowerCase().includes(query.toLowerCase()))), [clients, query]);
  const selected = clients.find((client) => client.id === selectedId) ?? filtered[0] ?? null;
  const totalNetWorth = clients.reduce((sum, client) => sum + (client.financialSummary.netWorth || 0), 0);
  const totalInvestable = clients.reduce((sum, client) => sum + (client.financialSummary.investableAssets || 0), 0);

  const handleExport = async (client: ClientSummary) => {
    setExporting(client.id);
    try { await exportClientBundle(client.id, client.name); } catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : 'Export failed.'); } finally { setExporting(null); }
  };

  const openClientWorkspace = (clientId: string) => {
    localStorage.setItem('stw.activeClientId', clientId);
    window.dispatchEvent(new Event('stw:active-client-changed'));
  };

  if (!ready) return <div className="directory-loading">Restoring your practice desk…</div>;
  if (!user) return <div className="directory-loading">Please sign in to access the advisor database.</div>;

  return (
    <div className="directory-page">
      <header className="directory-hero">
        <div><div className="directory-kicker"><span className="live-dot" /> {organizationName ?? 'Sound Thesis Wealth'} <span className="slash">/</span> Advisor desk</div><h1>Your client book,<br /><em>in focus.</em></h1><p>A private, living view of the people and decisions entrusted to you.</p></div>
        <div className="directory-hero-actions"><button className="directory-icon-button" onClick={() => void loadClients()} aria-label="Refresh clients"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button className="directory-new-button"><Sparkles size={16} /> Add client <ArrowUpRight size={15} /></button></div>
      </header>

      <section className="directory-metrics"><Metric label="Assigned clients" value={String(clients.length).padStart(2, '0')} detail="Your active book" icon={Users} /><Metric label="Net worth covered" value={formatCurrencyCompact(totalNetWorth)} detail="Across assigned clients" icon={WalletCards} /><Metric label="Investable assets" value={formatCurrencyCompact(totalInvestable)} detail="Ready for planning" icon={BriefcaseBusiness} /><Metric label="Reviews this month" value="04" detail="Two due this week" icon={CircleHelp} /></section>

      <section className="directory-toolbar"><div className="directory-toolbar-title"><span className="eyebrow">Client database</span><h2>People you advise <span>{filtered.length}</span></h2></div><div className="directory-controls"><label className="directory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients" aria-label="Search clients" /></label><button className="directory-filter"><Filter size={15} /> <span>Filter</span></button><div className="directory-view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button></div></div></section>

      {error && <div className="directory-error">{error}</div>}
      {loading && clients.length === 0 && <div className="directory-empty">Loading your assigned clients…</div>}
      {!loading && !error && filtered.length === 0 && <div className="directory-empty"><Users size={26} /><h3>No clients found</h3><p>Try a different search or add your first client.</p></div>}
      {view === 'grid' && filtered.length > 0 && <div className="client-grid">{filtered.map((client, index) => <ClientCard key={client.id} client={client} index={index} selected={selected?.id === client.id} onSelect={() => setSelectedId(client.id)} onExport={() => void handleExport(client)} exporting={exporting === client.id} />)}</div>}
      {view === 'list' && filtered.length > 0 && <div className="client-table"><div className="client-table-head"><span>Client</span><span>Portfolio</span><span>Coverage</span><span>Status</span><span /></div>{filtered.map((client, index) => <ClientRow key={client.id} client={client} index={index} selected={selected?.id === client.id} onSelect={() => setSelectedId(client.id)} />)}</div>}
      {selected && <aside className="client-insight"><div><span className="eyebrow">Selected client</span><h2>{selected.name}</h2><p>Primary relationship · Active engagement</p></div><div className="client-insight-actions"><button onClick={() => void handleExport(selected)} disabled={exporting === selected.id}><Download size={15} /> {exporting === selected.id ? 'Preparing…' : 'Export file'}</button><Link to="/master-plan" onClick={() => openClientWorkspace(selected.id)}><span>Open planning workspace</span><ArrowUpRight size={15} /></Link></div><div className="client-insight-stats"><div><span>Net worth</span><strong>{formatCurrencyCompact(selected.financialSummary.netWorth)}</strong></div><div><span>Investable</span><strong>{formatCurrencyCompact(selected.financialSummary.investableAssets)}</strong></div><div><span>Profile</span><strong><ShieldCheck size={15} /> Active</strong></div></div><div className="client-insight-footer"><span><span className="live-dot" /> Access scoped to your assignment</span><button onClick={logout}><LogOut size={14} /> Sign out</button></div></aside>}
    </div>
  );
}

function ClientCard({ client, index, selected, onSelect, onExport, exporting }: { client: ClientSummary; index: number; selected: boolean; onSelect: () => void; onExport: () => void; exporting: boolean }) {
  const color = palette[index % palette.length];
  return <article className={`client-card ${selected ? 'selected' : ''}`} onClick={onSelect}><div className="client-card-top"><span className={`client-avatar ${color}`}>{initials(client.name)}</span><span className="client-status"><i /> Active</span></div><h3>{client.name}</h3><p className="client-card-email">{client.assignedPractitioners[0]?.fullName ?? 'Advisor relationship'}</p><div className="client-card-value"><span>Net worth</span><strong>{formatCurrencyCompact(client.financialSummary.netWorth)}</strong></div><div className="client-card-bottom"><span className="client-tag">{client.name.split(' ')[0]} plan</span><button onClick={(event) => { event.stopPropagation(); onExport(); }} disabled={exporting} aria-label={`Export ${client.name}`}><Download size={14} /></button><ChevronRight size={16} /></div></article>;
}

function ClientRow({ client, index, selected, onSelect }: { client: ClientSummary; index: number; selected: boolean; onSelect: () => void }) {
  return <button className={`client-row ${selected ? 'selected' : ''}`} onClick={onSelect}><span className="client-row-name"><span className={`client-avatar small ${palette[index % palette.length]}`}>{initials(client.name)}</span><span><strong>{client.name}</strong><small>{client.assignedPractitioners[0]?.fullName ?? 'Assigned relationship'}</small></span></span><strong>{formatCurrencyCompact(client.financialSummary.netWorth)}</strong><span>{client.assignedPractitioners[0]?.assignmentRole ?? 'Primary'}</span><span className="client-status"><i /> Active</span><ChevronRight size={16} /></button>;
}
