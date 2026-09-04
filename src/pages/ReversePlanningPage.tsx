import { ReversePlanning } from '../components/analytics/ReversePlanning';
import { SectionTitle } from '../components/ui/SectionTitle';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const ReversePlanningPage = () => {
  return (
    <div className="space-y-8">
      <SectionTitle
        title="Reverse Planning & Target Solver"
        subtitle="Instead of asking 'what happens with my current inputs?', solve for 'what exact actions are required to hit my target wealth milestone?'"
        badge="Decision Layer"
      />

      <ReversePlanning />

      <WorkflowFooter
        prev={{ path: '/retirement', label: 'Retirement & SWP' }}
        next={{ path: '/allocation', label: 'Asset Allocation' }}
        flowHint="Reverse planning solves exact required savings and timeline before locking down strategic asset allocation."
      />
    </div>
  );
};
