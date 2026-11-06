import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { isPlanEmpty } from '../lib/planState';
import { PriorityQueue } from '../components/dashboard/PriorityQueue';
import { PlanHealthScoreCard } from '../components/dashboard/PlanHealthScoreCard';
import { RecommendationsList } from '../components/dashboard/RecommendationsList';
import { WhatChangedPanel } from '../components/dashboard/WhatChangedPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

/** Review is an operating queue, not an executive dashboard. */
export const Dashboard = () => {
  const { inputs, wealthResult, riskScore } = useCalculator();
  const configured = wealthResult.isConfigured;
  const empty = isPlanEmpty(inputs);
  const planHealth = useMemo(
    () => (configured ? computePlanHealthScore(inputs, wealthResult, riskScore) : null),
    [configured, inputs, wealthResult, riskScore],
  );
  const recommendations = useMemo(
    () => (planHealth ? generatePlanRecommendations(inputs, wealthResult, planHealth, riskScore) : []),
    [inputs, wealthResult, planHealth, riskScore],
  );

  if (empty) {
    return (
      <div className="space-y-8 pb-8">
        <PageHeader
          eyebrow="Review"
          title="There is no household to review yet."
          description="Create the relationship first. Planning, policy and the client dossier remain tied to that household."
          actions={<Link to="/clients?add=1"><Button><Plus size={14} /> Add household</Button></Link>}
        />
        <EmptyState
          icon={ClipboardList}
          title="Start with a household"
          description="Create the relationship, then add the facts that make a plan possible."
          action={<Link to="/clients?add=1"><Button>Add household</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        eyebrow="Review"
        title="Today’s meaningful follow-up."
        description="Attention is ranked by client consequence, then by the next review or decision that needs to be recorded."
        actions={<Link to="/clients"><Button variant="secondary">Open households <ArrowRight size={14} /></Button></Link>}
      />

      <section className="grid gap-6 xl:grid-cols-12" aria-label="Review due">
        <div className="xl:col-span-7 border-t border-border-strong pt-1"><PriorityQueue /></div>
        <div className="xl:col-span-5 border-l-0 xl:border-l xl:border-border xl:pl-6">
          {planHealth ? <PlanHealthScoreCard health={planHealth} /> : <p className="py-6 text-sm text-muted">Complete the core plan inputs to calculate the current plan position.</p>}
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="border-t border-border-strong pt-1" aria-label="Plan attention">
          <RecommendationsList recommendations={recommendations.slice(0, 5)} />
        </section>
      )}

      <section className="border-t border-border-strong pt-1" aria-label="Recent decisions">
        <WhatChangedPanel />
      </section>

      <WorkflowFooter
        prev={{ path: '/dossier', label: 'Client Dossier' }}
        next={{ path: '/clients', label: 'Households Directory' }}
        stepIndicator="Chapter 05 / 05 — Review"
      />
    </div>
  );
};
