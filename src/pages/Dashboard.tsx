import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Layers3, Plus, Target, UserRound, type LucideIcon } from 'lucide-react';
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

  const onboardingSteps: { step: string; label: string; Icon: LucideIcon }[] = [
    { step: '01', label: 'Client profile', Icon: UserRound },
    { step: '02', label: 'Financial position', Icon: Layers3 },
    { step: '03', label: 'Planning focus', Icon: Target },
    { step: '04', label: 'Next conversation', Icon: CalendarDays },
  ];

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
      <div className="space-y-8 pb-10">
        <motion.section {...fadeProps} className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-3">Sound Thesis / Practice desk</div>
            <h1 className="max-w-3xl font-display text-5xl leading-[.98] tracking-tight text-ink sm:text-6xl">
              Build a clearer view of wealth.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              A calm, precise workspace for turning a client’s financial picture into the next right decision.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-raised px-3 py-2 text-[11px] font-medium text-muted shadow-card">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Workspace ready
            </span>
            <Link to="/master-plan">
              <Button size="md"><Plus size={15} /> New client</Button>
            </Link>
          </div>
        </motion.section>

        <motion.section {...fadeProps} className="hero-orbit relative overflow-hidden rounded-[24px] p-6 shadow-elevated sm:p-10">
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <div className="hero-kicker eyebrow">The practice begins here</div>
              <h2 className="hero-title mt-4 max-w-xl font-display text-4xl leading-[1.02] sm:text-5xl">
                Start with the client, not the spreadsheet.
              </h2>
              <p className="hero-copy mt-5 max-w-lg text-sm leading-relaxed">
                Add a person, capture the starting position, and let the planning studio reveal what matters next. No demo numbers. No invented health score.
              </p>
              <Link to="/master-plan" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">
                Create your first client <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10">
              {onboardingSteps.map(({ step, label, Icon }) => (
                <div key={step} className="border-b border-r border-white/10 bg-white/[.045] p-4 last:border-0 sm:p-5">
                  <div className="flex items-center justify-between text-[#A9B9D5]"><span className="font-mono text-[10px]">{step}</span><Icon size={16} strokeWidth={1.5} /></div>
                  <div className="mt-8 text-sm font-medium text-white">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-border bg-raised p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <div className="eyebrow">First movement</div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Set up the practice desk</h2>
              </div>
              <span className="font-mono text-xs text-faint">0 / 3</span>
            </div>
            <div className="mt-2 divide-y divide-border-subtle">
              {[
                ['01', 'Create a client profile', 'A name and a planning context is enough to begin.', '/master-plan'],
                ['02', 'Record the starting position', 'Income, expenses and holdings stay blank until you enter them.', '/master-plan?step=financials'],
                ['03', 'Choose a planning focus', 'Map a retirement, goal or allocation question.', '/goal'],
              ].map(([number, title, detail, to]) => (
                <Link key={number} to={to} className="onboarding-step group flex gap-4 border-b border-border-subtle px-2 py-5 last:border-0">
                  <span className="font-mono text-xs text-accent">{number}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{title}</span><span className="mt-1 block max-w-md text-xs leading-relaxed text-muted">{detail}</span></span>
                  <ArrowUpRight size={16} className="mt-0.5 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
          <div className="metric-strip rounded-2xl p-6 sm:p-8">
            <div className="eyebrow">At a glance</div>
            <p className="mt-2 text-sm text-muted">Your practice is intentionally quiet until real information is added.</p>
            <div className="mt-8 divide-y divide-border-subtle">
              {[['Clients', '0'], ['Active plans', '0'], ['Reviews due', '0'], ['At-risk plans', '—']].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between py-4 first:pt-0 last:pb-0"><span className="text-sm text-ink-soft">{label}</span><span className="font-mono text-2xl tracking-tight text-ink">{value}</span></div>
              ))}
            </div>
          </div>
        </section>

        <WorkflowFooter next={{ path: '/master-plan', label: 'Create client' }} flowHint="Start with a profile. Every financial result stays unavailable until the workspace has enough real information to support it." />
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
