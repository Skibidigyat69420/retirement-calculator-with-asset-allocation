import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  FileText,
  MessageSquareText,
  UserRound,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SaveIndicator } from '../ui/SaveIndicator';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { useCalculator } from '../../context/CalculatorContext';
import { isProfileConfigured, planStatus } from '../../lib/planState';
import { cn } from '../../lib/utils';
import type { ClientMeetingStageId, ClientMeetingStageInfo } from '../../types';

const STAGES: ClientMeetingStageInfo[] = [
  {
    id: 1,
    name: 'Meeting 01',
    title: 'Client Discovery & Inventory',
    description: 'Capture personal profiles, assets, cashflow realities, goal milestones, and behavioral risk tolerance.',
    checklist: [
      { id: 'm1-profile', label: 'Client Personal Profile & Time Horizon', completed: false, route: '/master-plan' },
      { id: 'm1-assets', label: 'Household Assets & Liabilities Inventory', completed: false, route: '/master-plan' },
      { id: 'm1-cashflow', label: 'Cashflows, Savings Rate & SIP Capacity', completed: false, route: '/master-plan' },
      { id: 'm1-goals', label: 'Financial Goals & Prioritization Milestones', completed: false, route: '/goal' },
      { id: 'm1-risk', label: 'Comprehensive Risk Questionnaire & Scoring', completed: false, route: '/risk' },
    ],
    keyOutputs: ['Client Financial Snapshot', 'Behavioral Risk Score', 'Baseline Cashflow Model'],
  },
  {
    id: 2,
    name: 'Meeting 02',
    title: 'Diagnostic & Scenario Lab',
    description: 'Evaluate current plan longevity, simultaneous goal affordability, shortfall risks, and what-if stress tests.',
    checklist: [
      { id: 'm2-networth', label: 'Net Worth & Investable Assets Audit', completed: false, route: '/master-plan' },
      { id: 'm2-readiness', label: 'Retirement Readiness & Longevity Depletion Age', completed: false, route: '/retirement' },
      { id: 'm2-conflicts', label: 'Goal Conflict Matrix & Affordability Check', completed: false, route: '/goal' },
      { id: 'm2-scenarios', label: 'Run Scenario Laboratory (Market Crash, Early Ret.)', completed: false, route: '/retirement' },
    ],
    keyOutputs: ['Diagnostic Health Score', 'Top 3 Attention Items', 'Scenario Sensitivity Matrix'],
  },
  {
    id: 3,
    name: 'Meeting 03',
    title: 'Recommendation & Strategy Architecture',
    description: 'Formulate strategic policy allocation, cash surplus waterfall, portfolio optimization lab, and transition plan.',
    checklist: [
      { id: 'm3-allocation', label: 'Strategic Asset Allocation Targets (SAA)', completed: false, route: '/allocation' },
      { id: 'm3-waterfall', label: 'Household Cash Surplus Funding Waterfall', completed: false, route: '/goal' },
      { id: 'm3-rebalance', label: 'Portfolio Engineering Lab (Risk Parity & Black-Litterman)', completed: false, route: '/advanced-portfolio' },
      { id: 'm3-transition', label: 'Portfolio Transition & Tax Drag Calculation', completed: false, route: '/allocation' },
    ],
    keyOutputs: ['Target Policy Allocation', 'Funding Waterfall Plan', 'Trade Execution Ticket Sheet'],
  },
  {
    id: 4,
    name: 'Meeting 04',
    title: 'Plan Delivery & Governance Onboarding',
    description: 'Formal delivery of the full executive dossier, Investment Policy Statement (IPS), and execution roadmap.',
    checklist: [
      { id: 'm4-dossier', label: 'Executive Portfolio Dossier Generation', completed: false, route: '/dossier' },
      { id: 'm4-ips', label: 'Institutional Investment Policy Statement (IPS)', completed: false, route: '/ips' },
      { id: 'm4-actions', label: 'Action Checklist & Rebalancing Governance Cadence', completed: false, route: '/decision-history' },
    ],
    keyOutputs: ['Signed IPS Document', 'Full Client PDF Dossier', 'Decision Audit Log'],
  },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const statusForPlan = (status: ReturnType<typeof planStatus>) =>
  status === 'ready-for-review' ? 'ready-for-review' : status === 'in-progress' ? 'in-progress' : 'not-started';

export const ClientMeetingWorkflow = () => {
  const {
    inputs,
    meetingState,
    updateMeetingStage,
    toggleMeetingChecklist,
    saveMeetingNotes,
    showToast,
  } = useCalculator();

  const [activeStageId, setActiveStageId] = useState<ClientMeetingStageId>(meetingState.currentStage || 1);
  const [currentNote, setCurrentNote] = useState<string>(meetingState.notes[activeStageId] || '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const configured = isProfileConfigured(inputs);
  const clientName = inputs.client.name.trim();

  const activeStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  const stageStats = useMemo(
    () =>
      STAGES.map((stage) => {
        const done = stage.checklist.filter((item) => meetingState.stageChecklists[item.id]).length;
        return { stage, done, total: stage.checklist.length };
      }),
    [meetingState.stageChecklists],
  );

  const totalItems = stageStats.reduce((s, x) => s + x.total, 0);
  const totalDone = stageStats.reduce((s, x) => s + x.done, 0);
  const progressPercent = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const activeNoteWords = (meetingState.notes[activeStageId] || '').trim().split(/\s+/).filter(Boolean).length;
  const pendingInActive = activeStage.checklist.filter((item) => !meetingState.stageChecklists[item.id]);

  const nextActions = useMemo(() => {
    const actions: { label: string; route: string; stageName: string }[] = [];
    for (const { stage, done, total } of stageStats) {
      if (done === total) continue;
      const nextItem = stage.checklist.find((item) => !meetingState.stageChecklists[item.id]);
      if (nextItem) actions.push({ label: nextItem.label, route: nextItem.route, stageName: stage.name });
      if (actions.length >= 3) break;
    }
    return actions;
  }, [stageStats, meetingState.stageChecklists]);

  const handleStageSelect = (stageId: ClientMeetingStageId) => {
    setActiveStageId(stageId);
    setCurrentNote(meetingState.notes[stageId] || '');
    setSaveStatus('idle');
  };

  const handleAdvanceStage = () => {
    if (activeStageId < 4) {
      const nextStage = (activeStageId + 1) as ClientMeetingStageId;
      updateMeetingStage(nextStage);
      setActiveStageId(nextStage);
      setCurrentNote(meetingState.notes[nextStage] || '');
      setSaveStatus('idle');
      showToast(`Advanced to ${STAGES[nextStage - 1].name}: ${STAGES[nextStage - 1].title}`, 'success');
    }
  };

  const handleSaveNotes = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    // saveMeetingNotes commits synchronously to state; the short delay keeps
    // the indicator honest about the write without blocking the editor.
    saveTimerRef.current = setTimeout(() => {
      saveMeetingNotes(activeStageId, currentNote);
      setSaveStatus('saved');
      showToast('Meeting notes saved.', 'success');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2400);
    }, 350);
  };

  if (!configured) {
    return (
      <EmptyState
        eyebrow="Meeting Workflow"
        title="Set up the client profile first"
        description="The meeting workspace opens once a client is configured. Add the client's name, age, and horizon on the Master Plan page, then return here to run the four-meeting engagement."
        icon={UserRound}
        action={
          <Link to="/master-plan">
            <Button size="sm">
              Set up client profile <ArrowUpRight size={14} strokeWidth={1.6} />
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Client command header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="shrink-0 p-2 rounded-md border border-border bg-raised text-muted">
            <UserRound size={18} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="eyebrow">In session</div>
            <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
              <h2 className="text-base font-semibold tracking-tight text-ink truncate">
                {clientName || <span className="text-faint font-normal">No client selected</span>}
              </h2>
              <StatusBadge status={statusForPlan(planStatus(inputs))} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="eyebrow block">Engagement progress</span>
            <span className="font-mono text-sm tabular-nums text-ink">{progressPercent}%</span>
          </div>
          <div className="w-24 h-1 rounded-full bg-sunken overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist completion across all meetings">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Stage rail */}
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Meeting stages">
        {STAGES.map((stage) => {
          const stat = stageStats.find((s) => s.stage.id === stage.id)!;
          const isCurrent = stage.id === meetingState.currentStage;
          const isSelected = stage.id === activeStageId;
          const complete = stat.done === stat.total;

          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => handleStageSelect(stage.id)}
                aria-current={isSelected ? 'step' : undefined}
                className={cn(
                  'w-full h-full p-4 rounded-md border text-left transition-colors duration-150 cursor-pointer',
                  isSelected
                    ? 'bg-raised border-border-strong shadow-card'
                    : 'bg-surface border-border hover:border-border-strong',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('font-mono text-[10px] uppercase tracking-[0.12em]', isSelected ? 'text-accent' : 'text-faint')}>
                    {stage.name}
                  </span>
                  {complete ? (
                    <span className="inline-flex items-center gap-1 text-positive">
                      <Check size={13} strokeWidth={1.8} aria-hidden="true" />
                      <span className="sr-only">Completed</span>
                    </span>
                  ) : isCurrent ? (
                    <Circle size={11} strokeWidth={1.8} className="text-brass fill-brass/40" aria-label="In progress" />
                  ) : (
                    <Circle size={11} strokeWidth={1.8} className="text-faint" aria-label="Not started" />
                  )}
                </div>
                <h3 className={cn('mt-1.5 text-sm font-semibold tracking-tight leading-snug', isSelected ? 'text-ink' : 'text-ink-soft')}>
                  {stage.title}
                </h3>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted">Checklist</span>
                  <span className="font-mono tabular-nums text-ink-soft">
                    {stat.done}/{stat.total}
                  </span>
                </div>
                <div className="mt-1 h-0.5 rounded-full bg-sunken overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-[width] duration-200', complete ? 'bg-positive' : 'bg-accent')}
                    style={{ width: `${stat.total > 0 ? (stat.done / stat.total) * 100 : 0}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Stage agenda */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-raised shadow-card">
          <div className="flex items-start justify-between gap-3 px-5 md:px-6 pt-5 pb-4 border-b border-border">
            <div className="min-w-0">
              <div className="eyebrow">{activeStage.name} agenda</div>
              <h3 className="mt-1 text-base font-semibold tracking-tight text-ink">{activeStage.title}</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed max-w-prose">{activeStage.description}</p>
            </div>
            {activeStageId < 4 && (
              <Button variant="outline" size="sm" onClick={handleAdvanceStage} className="shrink-0">
                Advance stage <ChevronRight size={13} strokeWidth={1.6} />
              </Button>
            )}
          </div>

          <ul className="divide-y divide-border-subtle">
            {activeStage.checklist.map((item) => {
              const isChecked = Boolean(meetingState.stageChecklists[item.id]);
              return (
                <li key={item.id} className="flex items-center gap-3 px-5 md:px-6 py-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isChecked}
                    onClick={() => toggleMeetingChecklist(item.id)}
                    className={cn(
                      'shrink-0 w-[18px] h-[18px] rounded-[5px] border inline-flex items-center justify-center transition-colors duration-150 cursor-pointer',
                      isChecked
                        ? 'bg-accent-soft border-accent/50 text-accent'
                        : 'bg-raised border-border-strong text-transparent hover:border-accent',
                    )}
                  >
                    <Check size={12} strokeWidth={2} aria-hidden="true" />
                    <span className="sr-only">{isChecked ? 'Mark incomplete' : 'Mark complete'}: {item.label}</span>
                  </button>
                  <span className={cn('flex-1 min-w-0 text-sm leading-snug transition-colors', isChecked ? 'line-through text-faint' : 'text-ink')}>
                    {item.label}
                  </span>
                  <Link
                    to={item.route}
                    className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink transition-colors"
                  >
                    Open <ArrowRight size={11} strokeWidth={1.6} />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="px-5 md:px-6 py-4 border-t border-border">
            <div className="eyebrow mb-2.5">Deliverables produced</div>
            <div className="flex flex-wrap gap-2">
              {activeStage.keyOutputs.map((out) => (
                <span key={out} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-sunken border border-border text-xs font-medium text-ink-soft">
                  <Check size={12} strokeWidth={1.8} className="text-accent" aria-hidden="true" />
                  {out}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Context + notes column */}
        <div className="space-y-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeStageId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex items-center gap-2">
                <MessageSquareText size={15} strokeWidth={1.6} className="text-muted" aria-hidden="true" />
                <h4 className="text-[13px] font-semibold tracking-tight text-ink">Conversation context</h4>
              </div>
              <dl className="mt-3 space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Items remaining</dt>
                  <dd className="font-mono tabular-nums text-ink">{pendingInActive.length}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Notes recorded</dt>
                  <dd className="font-mono tabular-nums text-ink">{activeNoteWords} words</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Meeting status</dt>
                  <dd className="text-ink-soft">
                    {meetingState.completedStages.includes(activeStageId) ? 'Completed' : activeStageId === meetingState.currentStage ? 'Current focus' : 'Upcoming'}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 pt-3 border-t border-border-subtle text-[11px] leading-relaxed text-faint">
                Notes saved here are embedded in the Executive Dossier and the IPS audit trail.
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Per-stage notes */}
          <div className="rounded-lg border border-border bg-raised shadow-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink">
                <FileText size={15} strokeWidth={1.6} className="text-muted" aria-hidden="true" />
                Meeting notes
              </h4>
              <span className="eyebrow">{activeStage.name}</span>
            </div>
            <textarea
              value={currentNote}
              onChange={(e) => {
                setCurrentNote(e.target.value);
                if (saveStatus === 'saved') setSaveStatus('idle');
              }}
              rows={7}
              placeholder="Record client questions, qualitative constraints, behavioral observations, or commitments made…"
              className="mt-3 w-full p-3 bg-surface border border-border rounded-md text-sm text-ink placeholder:text-faint resize-none leading-relaxed focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
            />
            {!meetingState.notes[activeStageId]?.trim() && (
              <p className="mt-2 text-[11px] text-faint">No notes recorded for this stage yet.</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <SaveIndicator status={saveStatus} />
              <Button size="sm" variant="secondary" onClick={handleSaveNotes} disabled={saveStatus === 'saving'}>
                Save notes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Next actions */}
      <div className="rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-[13px] font-semibold tracking-tight text-ink">Next actions</h4>
          <span className="font-mono text-[11px] tabular-nums text-faint">
            {totalDone} of {totalItems} complete
          </span>
        </div>
        {nextActions.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            All agenda items across the four meetings are complete — the engagement is ready for delivery.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle">
            {nextActions.map((action) => (
              <li key={`${action.stageName}-${action.label}`}>
                <Link
                  to={action.route}
                  className="group flex items-center gap-3 py-2.5 text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  <span className="eyebrow shrink-0 w-20">{action.stageName}</span>
                  <span className="flex-1 min-w-0 truncate">{action.label}</span>
                  <ArrowUpRight size={13} strokeWidth={1.6} className="shrink-0 text-faint group-hover:text-ink transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
