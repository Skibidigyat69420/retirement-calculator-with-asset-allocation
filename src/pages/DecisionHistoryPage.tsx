import { DecisionHistoryPanel } from '../components/analytics/DecisionHistoryPanel';
import { SectionTitle } from '../components/ui/SectionTitle';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const DecisionHistoryPage = () => {
  return (
    <div className="space-y-8">
      <SectionTitle
        title="Plan Decision History & Audit Trail"
        subtitle="Complete chronological audit trail of all strategic planning calibrations, advisory rationale, portfolio rebalancing events, and client approvals."
        badge="Governance"
      />

      <DecisionHistoryPanel />

      <WorkflowFooter
        prev={{ path: '/meeting-workflow', label: 'Client Meeting' }}
        next={{ path: '/reports', label: 'Reports' }}
        flowHint="Audit trail provides compliance transparency, accountability, and the ability to revert decisions."
      />
    </div>
  );
};
