import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus, Users } from 'lucide-react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from '@ui-sdk/react/combobox';
import { Button } from '@ui-sdk/react/button';
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
  const [clients, setClients] = useState<CRMClient[]>(() => getCRMClients());
  const [activeClient, setActiveClient] = useState<CRMClient | null>(() => getActiveCRMClient());

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

  const currentDisplayName = inputs.client.name?.trim() || activeClient?.name || 'Sample Household';
  const currentEmail = inputs.client.email || activeClient?.email;
  const currentTier = activeClient?.tier || 'Affluent';
  const selectedId = activeClient?.id ?? null;
  const clientName = useMemo(
    () => (id: string) => clients.find((client) => client.id === id)?.name ?? currentDisplayName,
    [clients, currentDisplayName],
  );

  const handleSelectClient = (clientId: string | null) => {
    if (!clientId) return;
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    setActiveCRMClient(client.id);
    setActiveClient(client);

    const matchingPersona = PERSONAS.find(
      (persona) =>
        persona.label.toLowerCase() === client.name.toLowerCase() ||
        client.name.toLowerCase().includes(persona.label.toLowerCase()) ||
        persona.label.toLowerCase().includes(client.name.toLowerCase()),
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
  };

  return (
    <Combobox
      value={selectedId}
      onValueChange={handleSelectClient}
      itemToLabel={clientName}
      autoHighlight="always"
    >
      <div className="household-switcher">
        <ComboboxLabel className="sr-only">Active household</ComboboxLabel>
        <div className="household-switcher-field">
          <Avatar name={currentDisplayName} id={currentEmail} size="sm" />
          <div className="min-w-0 flex-1">
            <ComboboxInput
              className="household-switcher-input"
              placeholder="Find a household"
              aria-label="Active household"
            />
            <span className="household-switcher-meta">
              {activeClient?.swpMonthlyNeed
                ? `SWP ${formatCurrencyCompact(activeClient.swpMonthlyNeed)}/mo`
                : `${currentTier} · ${activeClient?.stage || 'Active'}`}
            </span>
          </div>
          <ComboboxTrigger className="household-switcher-trigger" aria-label="Show households">
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </ComboboxTrigger>
        </div>
      </div>

      <ComboboxContent className="household-switcher-popover">
        <div className="household-switcher-popover-header">
          <div>
            <span>Client households</span>
            <small>Switch context without leaving your work.</small>
          </div>
          <span className="household-switcher-count">{clients.length}</span>
        </div>
        <ComboboxEmpty className="household-switcher-empty">
          <Users size={18} aria-hidden="true" />
          No households match that search.
        </ComboboxEmpty>
        <ComboboxList className="household-switcher-list">
          {clients.map((client) => {
            const netWorth = client.financialSummary?.netWorth;
            return (
              <ComboboxItem
                key={client.id}
                value={client.id}
                label={client.name}
                keywords={[client.tier || '', client.stage || '', ...(client.tags || [])]}
                className="household-switcher-item"
              >
                <Avatar name={client.name} id={client.email} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="household-switcher-item-name">{client.name}</span>
                  <span className="household-switcher-item-meta">
                    {client.tier || 'Client'}{client.stage ? ` · ${client.stage}` : ''}
                  </span>
                </span>
                <span className="household-switcher-item-value">
                  {netWorth ? formatCurrencyCompact(netWorth) : 'New'}
                </span>
                <ComboboxItemIndicator className="household-switcher-indicator">
                  <Check size={14} strokeWidth={2.2} aria-hidden="true" />
                </ComboboxItemIndicator>
              </ComboboxItem>
            );
          })}
        </ComboboxList>
        <div className="household-switcher-footer">
          <Button type="button" onClick={() => navigate('/clients?add=1')}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" /> Add household
          </Button>
          <Button type="button" onClick={() => navigate('/clients')}>Open directory</Button>
        </div>
      </ComboboxContent>
    </Combobox>
  );
}
