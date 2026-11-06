import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, Download, LayoutGrid, List, RefreshCw, Search, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCalculator } from '../context/CalculatorContext';
import { ApiRequestError, createClient, exportClientBundle, listClients, listClientDrafts, type ClientSummary } from '../lib/api';
import { formatCurrencyCompact } from '../lib/formatters';

import { setActiveCRMClient } from '../lib/crm';

const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export function PractitionerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ready, user } = useAuth();
  const { updateClient } = useCalculator();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    setError(null);
    setAddOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadClients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [response, draftResponse] = await Promise.all([listClients(), listClientDrafts()]);
      const assigned = response.data.filter((client) => client.assignedPractitioners.some((advisor) => advisor.userId === user?.id));
      const drafts = draftResponse.data.filter((draft) => Boolean(draft.clientId)).map((draft): ClientSummary => ({ id: draft.clientId!, name: draft.name, status: 'Sample', householdId: draft.clientId!, assignedPractitioners: [], financialSummary: (draft.data.financialSummary as ClientSummary['financialSummary'] | undefined) ?? { netWorth: 0, investableAssets: 0, totalAssets: 0, totalLiabilities: 0, assetCount: 0 } }));
      const directory = [...new Map([...assigned, ...drafts].map((client) => [client.id, client])).values()];
      setClients(directory);
      setSelectedId((current) => current ?? directory[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not load the client database.');
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (ready) void loadClients(); }, [ready, loadClients]);

  const filtered = useMemo(() => clients.filter((client) => client.name.toLowerCase().includes(query.toLowerCase()) || client.assignedPractitioners.some((advisor) => advisor.fullName?.toLowerCase().includes(query.toLowerCase()))), [clients, query]);
  const attentionCount = useMemo(() => clients.filter((client) => client.status && !['Active', 'Sample'].includes(client.status)).length, [clients]);
  const selected = clients.find((client) => client.id === selectedId) ?? filtered[0] ?? null;

  const handleExport = async (client: ClientSummary) => {
    setExporting(client.id);
    try { await exportClientBundle(client.id, client.name); } catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : 'Export failed.'); } finally { setExporting(null); }
  };

  const handleAddClient = () => {
    setError(null);
    setAddOpen(true);
  };

  const selectClient = (client: ClientSummary) => {
    setSelectedId(client.id);
    setActiveCRMClient(client.id);
    if (!user) updateClient({ name: client.name });
  };

  const addSampleClient = () => { void loadClients(); };

  const submitNewClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newClient.firstName.trim() || !newClient.lastName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createClient({
        firstName: newClient.firstName.trim(),
        lastName: newClient.lastName.trim(),
        email: newClient.email.trim() || undefined,
        phone: newClient.phone.trim() || undefined,
      });
      await loadClients();
      setSelectedId(created.id);
      setNewClient({ firstName: '', lastName: '', email: '', phone: '' });
      setAddOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not create client.');
    } finally {
      setCreating(false);
    }
  };

  const openClientWorkspace = async (clientId: string) => {
    const client = clients.find((item) => item.id === clientId);
    if (client) await selectClient(client);
    else setActiveCRMClient(clientId);
  };

  if (!ready) return <div className="directory-loading">Restoring your practice desk…</div>;

  return (
    <div className="directory-page">
      <header className="directory-hero">
        <div>
          <div className="eyebrow">Households</div>
          <h1>Find the relationship that needs you.</h1>
          <p>{clients.length ? `${clients.length} household${clients.length === 1 ? '' : 's'} in the practice${attentionCount ? ` · ${attentionCount} needing attention` : ''}.` : 'Create a household, then add the facts that make a plan possible.'}</p>
        </div>
        <div className="directory-hero-actions"><button className="directory-icon-button" onClick={() => void loadClients()} aria-label="Refresh households"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button className="directory-new-button" onClick={handleAddClient} disabled={loading}><UserPlus size={16} /> Add household</button></div>
      </header>

      <section className="directory-toolbar"><div className="directory-toolbar-title"><h2>All households <span>{filtered.length}</span></h2></div><div className="directory-controls"><label className="directory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search households" aria-label="Search households" /></label><div className="directory-view-toggle"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button></div></div></section>

      {selected && (
        <aside className="client-selected-banner" aria-label={`Actions for ${selected.name}`}>
          <div className="client-selected-banner-left">
            <span className="client-avatar">{initials(selected.name)}</span>
            <div>
              <div className="client-selected-title-row">
                <h2>{selected.name}</h2>
                <span className="client-status"><i /> {selected.status || 'Active'}</span>
              </div>
              <p className="client-selected-advisor">{selected.assignedPractitioners[0]?.fullName ?? 'Lead Adviser'}</p>
            </div>
          </div>

          <div className="client-selected-banner-stats">
            <div>
              <span>Net worth</span>
              <strong>{formatCurrencyCompact(selected.financialSummary.netWorth)}</strong>
            </div>
            <div>
              <span>Investable assets</span>
              <strong>{formatCurrencyCompact(selected.financialSummary.investableAssets)}</strong>
            </div>
            <div>
              <span>Liabilities</span>
              <strong>{formatCurrencyCompact(selected.financialSummary.totalLiabilities)}</strong>
            </div>
          </div>

          <div className="client-selected-banner-actions">
            <Link to="/master-plan" onClick={() => openClientWorkspace(selected.id)} className="client-action-primary">
              Open plan <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      )}

      <div className="client-workspace-full">
        <section className="client-results" aria-label="Client list">
          {error && <div className="directory-error">{error}</div>}
          {loading && clients.length === 0 && <div className="directory-empty">Loading clients…</div>}
          {!loading && !error && filtered.length === 0 && <div className="directory-empty"><Users size={26} /><h3>{clients.length ? 'No clients match this search' : 'Start your client list'}</h3><p>{clients.length ? 'Clear the search or add another client.' : 'Add a real household, or explore the complete workflow with a fictional sample.'}</p>{!clients.length && <div className="directory-empty-actions"><button type="button" onClick={handleAddClient}>Add a client</button><button type="button" onClick={addSampleClient}>Explore a sample</button></div>}</div>}
          {view === 'grid' && filtered.length > 0 && <div className="client-grid">{filtered.map((client, index) => <ClientCard key={client.id} client={client} index={index} selected={selected?.id === client.id} onSelect={() => selectClient(client)} onExport={() => void handleExport(client)} exporting={exporting === client.id} />)}</div>}
          {view === 'list' && filtered.length > 0 && <div className="client-table"><div className="client-table-head"><span>Client</span><span>Portfolio</span><span>Coverage</span><span>Status</span><span /></div>{filtered.map((client, index) => <ClientRow key={client.id} client={client} index={index} selected={selected?.id === client.id} onSelect={() => selectClient(client)} />)}</div>}
        </section>
      </div>

      {addOpen && <div className="client-create-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setAddOpen(false); }}>
        <section className="client-create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-client-title">
          <header><div><h2 id="create-client-title">Add client</h2></div><button type="button" onClick={() => setAddOpen(false)} disabled={creating} aria-label="Close add client form"><X size={18} /></button></header>
          <p className="client-create-intro">Create the household record and its first master plan. Financial data can be added next inside the planning workspace.</p>
          <form onSubmit={submitNewClient}>
            <label><span>First name *</span><input autoFocus required value={newClient.firstName} onChange={(event) => setNewClient((value) => ({ ...value, firstName: event.target.value }))} placeholder="Aarav" /></label>
            <label><span>Last name *</span><input required value={newClient.lastName} onChange={(event) => setNewClient((value) => ({ ...value, lastName: event.target.value }))} placeholder="Mehta" /></label>
            <label><span>Email</span><input type="email" value={newClient.email} onChange={(event) => setNewClient((value) => ({ ...value, email: event.target.value }))} placeholder="aarav@example.com" /></label>
            <label><span>Phone</span><input type="tel" value={newClient.phone} onChange={(event) => setNewClient((value) => ({ ...value, phone: event.target.value }))} placeholder="+91 98765 43210" /></label>
            <div className="client-create-note"><UserPlus size={18} /><span>{user ? 'The signed-in adviser is assigned as primary. A versioned starter plan is created automatically.' : 'This client is saved in the local workspace. Add financial details in the planning workspace.'}</span></div>
            <div className="client-create-actions"><button type="button" onClick={() => setAddOpen(false)} disabled={creating}>Cancel</button><button type="submit" disabled={creating || !newClient.firstName.trim() || !newClient.lastName.trim()}>{creating ? 'Creating…' : 'Create client'} <ArrowUpRight size={15} /></button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

function ClientCard({ client, selected, onSelect, onExport, exporting }: { client: ClientSummary; index?: number; selected: boolean; onSelect: () => void; onExport: () => void; exporting: boolean }) {
  return <article className={`client-card ${selected ? 'selected' : ''}`} onClick={onSelect}><div className="client-card-top"><span className="client-avatar">{initials(client.name)}</span><span className="client-status"><i /> {client.status || 'Active'}</span></div><h3>{client.name}</h3><p className="client-card-email">{client.assignedPractitioners[0]?.fullName ?? 'Advisor relationship'}</p><div className="client-card-value"><span>Net worth</span><strong>{formatCurrencyCompact(client.financialSummary.netWorth)}</strong></div><div className="client-card-bottom"><span className="client-tag">{client.name.split(' ')[0]} plan</span><button onClick={(event) => { event.stopPropagation(); onExport(); }} disabled={exporting} aria-label={`Export ${client.name}`}><Download size={14} /></button><ChevronRight size={16} /></div></article>;
}

function ClientRow({ client, selected, onSelect }: { client: ClientSummary; index?: number; selected: boolean; onSelect: () => void }) {
  return <button className={`client-row ${selected ? 'selected' : ''}`} onClick={onSelect}><span className="client-row-name"><span className="client-avatar small">{initials(client.name)}</span><span><strong>{client.name}</strong><small>{client.assignedPractitioners[0]?.fullName ?? 'Assigned relationship'}</small></span></span><strong>{formatCurrencyCompact(client.financialSummary.netWorth)}</strong><span>{client.assignedPractitioners[0]?.assignmentRole ?? 'Primary'}</span><span className="client-status"><i /> {client.status || 'Active'}</span><ChevronRight size={16} /></button>;
}
