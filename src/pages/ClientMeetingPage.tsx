import { ClientMeetingWorkflow } from '../components/analytics/ClientMeetingWorkflow';
import { SectionTitle } from '../components/ui/SectionTitle';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const ClientMeetingPage = () => {
  return (
    <div className="space-y-8">
      <SectionTitle
        title="Client Meeting Workflow"
        subtitle="Guided 4-meeting advisory onboarding and review framework. Keep agendas on track, record qualitative client notes, and monitor planning completion."
        badge="Adviser OS"
      />

      <ClientMeetingWorkflow />

      <WorkflowFooter
        prev={{ path: '/dossier', label: 'Client Dossier' }}
        next={{ path: '/decision-history', label: 'Decision History' }}
        flowHint="Conduct high-impact client meetings with structured deliverables for each stage."
      />
    </div>
  );
};
