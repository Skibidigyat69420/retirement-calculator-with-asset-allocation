import { Link, useLocation } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { getActiveCRMClient } from '../../lib/crm';
import { planStatus } from '../../lib/planState';

/** The client thread stays visible without becoming another dashboard. */
export const WorkspaceContextBar = () => {
  const location = useLocation();
  const { inputs, wealthResult } = useCalculator();
  const activeCRM = getActiveCRMClient();

  if (['/dossier', '/clients', '/practitioner', '/overview'].includes(location.pathname)) return null;

  const name = inputs.client.name?.trim() || activeCRM?.name || 'Active household';
  const reviewDate = activeCRM?.reviewDate || inputs.client.reviewDate;
  const status = planStatus(inputs);
  const statusLabel: Record<typeof status, string> = {
    'not-started': 'Not started',
    'in-progress': 'Draft plan',
    'ready-for-review': 'Ready for review',
  };
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="workspace-context" aria-label="Active household context">
      <div className="workspace-context-thread">
        <span className="workspace-context-monogram" aria-hidden="true">{initials}</span>
        <Link to="/master-plan" className="workspace-context-name">{name}</Link>
        <span aria-hidden="true">•</span>
        <span>{reviewDate ? `Review ${reviewDate}` : wealthResult.isConfigured ? 'Current planning review' : 'Planning setup'}</span>
        <span aria-hidden="true">•</span>
        <span>{statusLabel[status]}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link to="/clients" className="workspace-context-action">
          <ArrowLeftRight size={13} strokeWidth={1.7} />
          <span className="hidden sm:inline">Switch household</span>
        </Link>
        <span className="workspace-context-saved">Saved locally</span>
      </div>
    </div>
  );
};
