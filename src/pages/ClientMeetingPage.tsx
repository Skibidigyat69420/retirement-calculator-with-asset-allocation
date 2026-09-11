import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { isProfileConfigured } from '../lib/planState';
import { PageHeader } from '../components/ui/PageHeader';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { ClientMeetingWorkflow } from '../components/analytics/ClientMeetingWorkflow';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { ClientMeetingStageId } from '../types';

// Mirrors the stage definitions in ClientMeetingWorkflow so this page can
// render an at-a-glance progress overview without owning the workflow itself.
const STAGE_META: { id: ClientMeetingStageId; name: string; checklistIds: string[] }[] = [
  { id: 1, name: 'Meeting 01', checklistIds: ['m1-profile', 'm1-assets', 'm1-cashflow', 'm1-goals', 'm1-risk'] },
  { id: 2, name: 'Meeting 02', checklistIds: ['m2-networth', 'm2-readiness', 'm2-conflicts', 'm2-scenarios'] },
  { id: 3, name: 'Meeting 03', checklistIds: ['m3-allocation', 'm3-waterfall', 'm3-rebalance', 'm3-transition'] },
  { id: 4, name: 'Meeting 04', checklistIds: ['m4-dossier', 'm4-ips', 'm4-actions'] },
];

export const ClientMeetingPage = () => {
  const { meetingState, inputs } = useCalculator();
  const configured = isProfileConfigured(inputs);

  const stats = useMemo(() => {
    const perStage = STAGE_META.map((stage) => ({
      ...stage,
      done: stage.checklistIds.filter((id) => meetingState.stageChecklists[id]).length,
      total: stage.checklistIds.length,
      noteWords: (meetingState.notes[stage.id] || '').trim().split(/\s+/).filter(Boolean).length,
    }));
    const totalItems = perStage.reduce((s, x) => s + x.total, 0);
    const totalDone = perStage.reduce((s, x) => s + x.done, 0);
    return {
      perStage,
      totalItems,
      totalDone,
      overallPct: totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0,
      meetingsComplete: meetingState.completedStages.length,
      noteWords: perStage.reduce((s, x) => s + x.noteWords, 0),
    };
  }, [meetingState]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Advisor OS · Engagement"
        title="Client Meeting Workflow"
        description="A focused command center for the four-meeting engagement — stage agendas, live checklists, qualitative notes, and the next actions that keep the plan moving."
      />

      {configured && (
        <div className="rounded-lg border border-border bg-raised shadow-card px-5 md:px-6 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
            <FinancialMetric
              label="Checklist progress"
              value={`${stats.overallPct}%`}
              hint={`${stats.totalDone} of ${stats.totalItems} agenda items`}
              size="md"
            />
            <FinancialMetric
              label="Meetings complete"
              value={`${stats.meetingsComplete} / 4`}
              hint="Stages fully cleared"
              size="md"
            />
            <FinancialMetric
              label="Notes captured"
              value={`${stats.noteWords}`}
              hint="Words across all meetings"
              size="md"
            />
            <FinancialMetric
              label="Current stage"
              value={`0${stats.perStage.find((s) => s.id === meetingState.currentStage)?.id ?? '—'}`}
              hint={stats.perStage.find((s) => s.id === meetingState.currentStage)?.name ?? '—'}
              size="md"
            />
          </div>
        </div>
      )}

      <ClientMeetingWorkflow />

      <div className="pb-4">
        <WorkflowFooter
          prev={{ path: '/dossier', label: 'Client Dossier' }}
          next={{ path: '/decision-history', label: 'Decision History' }}
          flowHint="Conduct high-impact client meetings with structured deliverables for each stage."
        />
      </div>
    </div>
  );
};
