import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { computePlanHealthScore } from '../lib/planHealthScore';
import { generatePlanRecommendations } from '../lib/recommendationEngine';
import { isPlanEmpty, planStatus } from '../lib/planState';
import { PracticePulse } from '../components/dashboard/PracticePulse';
import { PriorityQueue } from '../components/dashboard/PriorityQueue';
import { PlanHealthScoreCard } from '../components/dashboard/PlanHealthScoreCard';
import { RecommendationsList } from '../components/dashboard/RecommendationsList';
import { WhatChangedPanel } from '../components/dashboard/WhatChangedPanel';
import { WorkflowSuite } from '../components/dashboard/WorkflowSuite';
import { TrajectoryCharts } from '../components/dashboard/TrajectoryCharts';
import { GoalsAndSimulation } from '../components/dashboard/GoalsAndSimulation';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PlanManager } from '../components/identity/PlanManager';

const greetingFor = (hour: number): string => {
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  return 'Good evening.';
};

const statusLine = (status: 'not-started' | 'in-progress' | 'ready-for-review'): string => {
  switch (status) {
    case 'ready-for-review':
      return 'The plan is ready for review — profile, cashflows, goals and allocations are mapped.';
    case 'in-progress':
      return 'The plan is taking shape. Work through the priority queue to prepare this mandate for review.';
    default:
      return 'Your workspace is ready. Start by adding your first client.';
  }
};

export const Dashboard = () => {
  const { inputs, wealthResult, riskScore } = useCalculator();
  const reducedMotion = useReducedMotion();

  const status = planStatus(inputs);
  const configured = wealthResult.isConfigured;

  const planHealth = useMemo(
    () => (configured ? computePlanHealthScore(inputs, wealthResult, riskScore) : null),
    [configured, inputs, wealthResult, riskScore],
  );

  const recommendations = useMemo(
    () => (planHealth ? generatePlanRecommendations(inputs, wealthResult, planHealth, riskScore) : []),
    [inputs, wealthResult, planHealth, riskScore],
  );

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const header = (
    <PageHeader
      variant="hero"
      eyebrow={`Dashboard · ${today}`}
      title={greetingFor(new Date().getHours())}
      description={statusLine(status)}
      actions={
        <>
          <StatusBadge status={status} />
          <Link to="/master-plan">
            <Button variant="secondary" size="sm">
              Open master plan
            </Button>
          </Link>
        </>
      }
    />
  );

  const fadeProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: 'easeOut' as const },
      };

  // ── Onboarding: a completely empty workspace is an invitation, not a report ──
  if (isPlanEmpty(inputs)) {
    return (
      <div className="space-y-10 pb-8">
        {header}
        <motion.section {...fadeProps}>
          <EmptyState
            display
            eyebrow="Workspace"
            icon={Compass}
            title="Your workspace is ready"
            description="Start by adding your first client. Once the profile, cashflows and goals are in place, this page becomes the practice pulse for the entire mandate."
            action={
              <Link to="/master-plan">
                <Button size="lg">Start with the master plan</Button>
              </Link>
            }
          />
        </motion.section>
        <WorkflowSuite />
        <WorkflowFooter
          next={{ path: '/risk', label: 'Risk Profile' }}
          flowHint="Assess behavioral risk tolerance to calibrate asset allocation targets and portfolio limits."
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8">
      {header}

      {!configured && (
        <Alert variant="info">
          The plan timeline is incomplete — set current age, retirement age and life expectancy to
          generate projections.{' '}
          <Link to="/master-plan" className="font-semibold underline underline-offset-2">
            Open Master Plan
          </Link>
        </Alert>
      )}

      <motion.section {...fadeProps} aria-label="Practice pulse">
        <PracticePulse />
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <motion.section {...fadeProps} className="lg:col-span-3" aria-label="Priority queue">
          <PriorityQueue />
        </motion.section>
        {planHealth && (
          <motion.section {...fadeProps} className="lg:col-span-2" aria-label="Planning health">
            <PlanHealthScoreCard health={planHealth} />
          </motion.section>
        )}
      </div>

      <motion.section {...fadeProps} aria-label="Recent activity">
        <WhatChangedPanel />
      </motion.section>

      {recommendations.length > 0 && (
        <motion.section {...fadeProps} aria-label="Recommendations">
          <RecommendationsList recommendations={recommendations} />
        </motion.section>
      )}

      {configured && (
        <motion.section {...fadeProps} aria-label="Wealth trajectory and allocation">
          <TrajectoryCharts />
        </motion.section>
      )}

      {configured && (
        <motion.section {...fadeProps} aria-label="Goals and simulation">
          <GoalsAndSimulation />
        </motion.section>
      )}

      <motion.section {...fadeProps} aria-label="Advisory suite">
        <WorkflowSuite />
      </motion.section>

      <motion.section {...fadeProps} aria-label="Saved plans">
        <div className="max-w-xl">
          <PlanManager />
        </div>
      </motion.section>

      <WorkflowFooter
        next={{ path: '/risk', label: 'Risk Profile' }}
        flowHint="Assess behavioral risk tolerance to calibrate asset allocation targets and portfolio limits."
      />
    </div>
  );
};
