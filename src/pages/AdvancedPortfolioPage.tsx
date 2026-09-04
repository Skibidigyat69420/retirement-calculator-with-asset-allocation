import { AdvancedPortfolioLab } from '../components/analytics/AdvancedPortfolioLab';
import { SectionTitle } from '../components/ui/SectionTitle';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const AdvancedPortfolioPage = () => {
  return (
    <div className="space-y-8">
      <SectionTitle
        title="Advanced Portfolio Engineering Lab"
        subtitle="Institutional multi-model asset allocation engine combining Strategic Policy (Black-Litterman, MVO, Risk Parity) with Tactical Overlays."
        badge="Institutional Suite"
      />

      <AdvancedPortfolioLab />

      <WorkflowFooter
        prev={{ path: '/allocation', label: 'Allocation' }}
        next={{ path: '/mvo', label: 'MVO Optimizer' }}
        flowHint="Advanced portfolio engineering bridges long-term strategic benchmarks with tactical market views."
      />
    </div>
  );
};
