import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Check, Plus, Users } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import {
  type CRMClient,
  getCRMClients,
  getActiveCRMClient,
  setActiveCRMClient,
} from '../../lib/crm';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';
import { PERSONAS } from '../../lib/personas';

export function ClientQuickSwitcher() {
  const navigate = useNavigate();
  const { inputs, updateClient, loadPersona, showToast } = useCalculator();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<CRMClient[]>(() => getCRMClients());
  const [activeClient, setActiveClient] = useState<CRMClient | null>(() => getActiveCRMClient());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync client list & active client whenever events fire
  useEffect(() => {
    const handleUpdate = () => {
      setClients(getCRMClients());
      setActiveClient(getActiveCRMClient());
    };
    window.addEventListener('stw:active-client-changed', handleUpdate);
    window.addEventListener('stw:clients-updated', handleUpdate);
    return () => {
      window.removeEventListener('stw:active-client-changed', handleUpdate);
      window.removeEventListener('stw:clients-updated', handleUpdate);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentDisplayName = inputs.client.name?.trim() || activeClient?.name || 'Sample Household';
  const currentEmail = inputs.client.email || activeClient?.email;
  const currentTier = activeClient?.tier || 'Affluent';

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tier && c.tier.toLowerCase().includes(search.toLowerCase())) ||
    (c.stage && c.stage.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectClient = (client: CRMClient) => {
    setActiveCRMClient(client.id);
    setActiveClient(client);

    // If client matches a persona, load their full scenario
    const matchingPersona = PERSONAS.find(
      (p) =>
        p.label.toLowerCase() === client.name.toLowerCase() ||
        client.name.toLowerCase().includes(p.label.toLowerCase()) ||
        p.label.toLowerCase().includes(client.name.toLowerCase())
    );

    if (matchingPersona) {
      loadPersona(matchingPersona.id);
    } else {
      updateClient({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
      });
    }

    showToast(`Active household set to ${client.name}`, 'info');
    setOpen(false);
  };

  const handleAddNew = () => {
    setOpen(false);
    navigate('/clients?add=1');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface/90 hover:bg-raised hover:border-border-strong text-ink transition-all shadow-xs cursor-pointer group"
        aria-label="Active client household switcher"
        aria-expanded={open}
      >
        <Avatar name={currentDisplayName} id={currentEmail} size="sm" />
        <div className="flex flex-col items-start text-left min-w-0 max-w-[120px] sm:max-w-[160px]">
          <span className="text-xs font-semibold text-ink leading-tight truncate w-full group-hover:text-accent-strong transition-colors">
            {currentDisplayName}
          </span>
          <span className="text-xs text-muted leading-tight font-medium truncate w-full">
            {currentTier} · {activeClient?.stage || 'Active'}
          </span>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={1.8}
          className="text-faint ml-0.5 shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select active household"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-border bg-raised shadow-popover p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1.5 mb-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Client households</span>
            <span className="text-xs text-muted">{clients.length} total</span>
          </div>

          {/* Quick search */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search households..."
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-sunken rounded-lg border border-border/60 focus:border-accent focus:bg-surface focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Client List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {filteredClients.map((client) => {
              const isSelected = activeClient?.id === client.id || inputs.client.name === client.name;
              const nw = client.financialSummary?.netWorth;

              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent-soft text-accent-strong font-medium'
                      : 'hover:bg-sunken text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <Avatar name={client.name} id={client.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="block font-semibold truncate leading-tight">
                        {client.name}
                      </span>
                      <span className="block text-[10px] text-muted truncate mt-0.5">
                        {client.tier || 'Client'} {client.stage ? `· ${client.stage}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {nw ? (
                      <span className="font-mono text-[11px] text-muted">
                        {formatCurrencyCompact(nw)}
                      </span>
                    ) : null}
                    {isSelected && <Check size={14} className="text-accent-strong shrink-0" />}
                  </div>
                </button>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="py-6 text-center text-xs text-muted">
                <Users size={18} className="mx-auto mb-1 text-faint" />
                No matching households found
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddNew}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-strong px-2 py-1 rounded hover:bg-accent-soft transition-colors cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>New Client</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/clients');
              }}
              className="text-[11px] text-muted hover:text-ink px-2 py-1 rounded transition-colors"
            >
              All Clients Directory →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
