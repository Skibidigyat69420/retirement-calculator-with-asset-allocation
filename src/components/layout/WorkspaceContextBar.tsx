import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpRight, ClipboardList } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { getActiveCRMClient } from '../../lib/crm';
import { planStatus } from '../../lib/planState';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

/**
 * Keeps client context visible without turning each workspace header into a
 * duplicate dashboard. The dossier has its own document-specific chrome.
 */
export const WorkspaceContextBar = () => {
  const location = useLocation();
  const { inputs, wealthResult } = useCalculator();
  const activeCRM = getActiveCRMClient();

  if (location.pathname === '/dossier') return null;

  const name = inputs.client.name?.trim() || activeCRM?.name || 'Active household';
  const email = inputs.client.email || activeCRM?.email;
  const configured = wealthResult.isConfigured;

  return (
    <div className="workspace-context">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={name} id={email} size="sm" />
        <div className="min-w-0">
          <Link to="/master-plan" className="workspace-context-name">
            {name}
          </Link>
          <div className="workspace-context-meta">
            <span>{configured ? 'Active plan' : 'Planning setup'}</span>
            <span aria-hidden="true">•</span>
            <StatusBadge status={planStatus(inputs)} />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Link to="/clients" className="workspace-context-action">
          <ArrowLeftRight size={13} strokeWidth={1.7} />
          <span className="hidden sm:inline">Switch household</span>
        </Link>
        <Link to="/master-plan" className="workspace-context-action">
          <ClipboardList size={13} strokeWidth={1.7} />
          <span className="hidden sm:inline">Open plan</span>
          <ArrowUpRight size={12} strokeWidth={1.7} className="hidden md:block" />
        </Link>
      </div>
    </div>
  );
};
