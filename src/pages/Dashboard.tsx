import { Link } from 'react-router-dom';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Layers3, Plus, Sparkles, Target, UserRound, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { getCRMClients, setActiveCRMClient } from '../lib/crm';
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
      return 'Your workspace is ready. Start by adding your first client or explore with a sample household.';
  }
};

export const Dashboard = () => {
  const { inputs, wealthResult, riskScore, loadPersona } = useCalculator();
  const reducedMotion = useReducedMotion();
  const crmClients = useMemo(() => getCRMClients(), []);
  const activeClientCount = useMemo(
    () => crmClients.filter((c) => c.status === 'Active' || c.stage === 'Active Mandate').length,
    [crmClients]
  );

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


  const header = (
    <PageHeader
      variant="hero"
      title={inputs.client.name ? `Welcome, ${inputs.client.name.split(' ')[0]}` : greetingFor(new Date().getHours())}
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

  const containerVariants: Variants = reducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: { staggerChildren: 0.05 },
        },
      };

  const itemVariants: Variants = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
      };

  // ── Onboarding: a completely empty workspace is an invitation, not a report ──
  if (isPlanEmpty(inputs)) {
    return (
      <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-8 pb-10 relative z-0">
        <motion.section variants={itemVariants} className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-3xl font-display text-4xl sm:text-5xl font-semibold tracking-tight text-ink">
              Build a clearer view of wealth.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              A calm, precise workspace for turning a client’s financial picture into the next right decision.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-raised px-3 py-1.5 text-xs font-medium text-muted shadow-card">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              Workspace ready
            </span>
            <Link to="/practitioner?add=1">
              <Button size="md"><Plus size={15} /> New client</Button>
            </Link>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="hero-orbit rounded-xl p-6 shadow-card sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <h2 className="hero-title max-w-xl font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                Start with the client, not the spreadsheet.
              </h2>
              <p className="hero-copy mt-3 max-w-lg text-sm leading-relaxed text-muted">
                Add a person, capture their position, or load a realistic sample household to test the advisory studio immediately.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/practitioner?add=1" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-on-inkfill shadow-xs hover:bg-accent-strong transition-colors">
                  Create your first client <ArrowUpRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCRMClient('sample-client-sharma');
                    loadPersona('sharma-family');
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-sunken hover:border-border-strong transition-colors cursor-pointer"
                >
                  <Sparkles size={15} className="text-accent" /> Explore with Sharma Family (HNI)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {onboardingSteps.map(({ step, label, Icon }) => (
                <div key={step} className="rounded-lg border border-border bg-surface p-4 shadow-xs">
                  <div className="flex items-center justify-between text-accent">
                    <span className="font-mono text-xs font-semibold">{step}</span>
                    <Icon size={16} strokeWidth={1.8} />
                  </div>
                  <div className="mt-4 text-sm font-medium text-ink">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-border bg-raised p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">Set up the practice desk</h2>
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
            <h3 className="text-sm font-semibold text-ink">At a glance</h3>
            <p className="mt-1 text-sm text-muted">Active practice directory overview and portfolio status.</p>
            <div className="mt-8 divide-y divide-border-subtle">
              {[
                ['Clients in CRM', String(crmClients.length)],
                ['Active mandates', String(activeClientCount)],
                ['Reviews due', String(crmClients.filter((c) => Boolean(c.reviewDate)).length)],
                ['Current workspace', isPlanEmpty(inputs) ? 'Unassigned' : inputs.client.name || 'Active'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between py-4 first:pt-0 last:pb-0">
                  <span className="text-sm text-ink-soft">{label}</span>
                  <span className="font-mono text-xl tracking-tight text-ink">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.div variants={itemVariants}>
          <WorkflowFooter next={{ path: '/master-plan', label: 'Create client' }} flowHint="Start with a profile. Every financial result stays unavailable until the workspace has enough real information to support it." />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-8 pb-8 relative z-0">
      <motion.div variants={itemVariants}>{header}</motion.div>

      {!configured && (
        <motion.div variants={itemVariants}>
          <Alert variant="info">
            The plan timeline is incomplete — set current age, retirement age and life expectancy to
            generate projections.{' '}
            <Link to="/master-plan" className="font-semibold underline underline-offset-2">
              Open Master Plan
            </Link>
          </Alert>
        </motion.div>
      )}

      <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Practice pulse">
        <PracticePulse />
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <motion.section variants={itemVariants} className="lg:col-span-3 glass-bento rounded-xl p-6 lg:p-8" aria-label="Priority queue">
          <PriorityQueue />
        </motion.section>
        {planHealth && (
          <motion.section variants={itemVariants} className="lg:col-span-2 glass-bento rounded-xl p-6 lg:p-8" aria-label="Planning health">
            <PlanHealthScoreCard health={planHealth} />
          </motion.section>
        )}
      </div>

      <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Recent activity">
        <WhatChangedPanel />
      </motion.section>

      {recommendations.length > 0 && (
        <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Recommendations">
          <RecommendationsList recommendations={recommendations} />
        </motion.section>
      )}

      {configured && (
        <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Wealth trajectory and allocation">
          <TrajectoryCharts />
        </motion.section>
      )}

      {configured && (
        <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Goals and simulation">
          <GoalsAndSimulation />
        </motion.section>
      )}

      <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Advisory suite">
        <WorkflowSuite />
      </motion.section>

      <motion.section variants={itemVariants} className="glass-bento rounded-xl p-6 lg:p-8" aria-label="Saved plans">
        <div className="max-w-xl">
          <PlanManager />
        </div>
      </motion.section>

      <motion.div variants={itemVariants}>
        <WorkflowFooter
          next={{ path: '/risk', label: 'Risk Profile' }}
          flowHint="Assess behavioral risk tolerance to calibrate asset allocation targets and portfolio limits."
        />
      </motion.div>
    </motion.div>
  );
};
