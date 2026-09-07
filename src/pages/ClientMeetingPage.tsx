import { useMemo } from 'react';
import { CheckCircle2, Circle, FileText, Users } from 'lucide-react';
import { ClientMeetingWorkflow } from '../components/analytics/ClientMeetingWorkflow';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useCalculator } from '../context/CalculatorContext';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { ClientMeetingStageId } from '../types';

// Mirrors the stage definitions in ClientMeetingWorkflow so this page can
// render an at-a-glance progress overview without owning the workflow itself.
const STAGE_META: { id: ClientMeetingStageId; name: string; title: string; checklistIds: string[] }[] = [
  {
    id: 1,
    name: 'Meeting 01',
    title: 'Client Discovery & Inventory',
    checklistIds: ['m1-profile', 'm1-assets', 'm1-cashflow', 'm1-goals', 'm1-risk'],
  },
  {
    id: 2,
    name: 'Meeting 02',
    title: 'Diagnostic & Scenario Lab',
    checklistIds: ['m2-networth', 'm2-readiness', 'm2-conflicts', 'm2-scenarios'],
  },
  {
    id: 3,
    name: 'Meeting 03',
    title: 'Recommendation & Strategy Architecture',
    checklistIds: ['m3-allocation', 'm3-waterfall', 'm3-rebalance', 'm3-transition'],
  },
  {
    id: 4,
    name: 'Meeting 04',
    title: 'Plan Delivery & Governance Onboarding',
    checklistIds: ['m4-dossier', 'm4-ips', 'm4-actions'],
  },
];

export const ClientMeetingPage = () => {
  const { meetingState } = useCalculator();

  const stageStats = useMemo(
    () =>
      STAGE_META.map((stage) => {
        const done = stage.checklistIds.filter((id) => meetingState.stageChecklists[id]).length;
        const noteWords = (meetingState.notes[stage.id] || '').trim().split(/\s+/).filter(Boolean).length;
        return {
          ...stage,
          done,
          total: stage.checklistIds.length,
          pct: Math.round((done / stage.checklistIds.length) * 100),
          noteWords,
          isComplete: meetingState.completedStages.includes(stage.id),
          isCurrent: meetingState.currentStage === stage.id,
        };
      }),
    [meetingState],
  );

  const totalItems = stageStats.reduce((s, x) => s + x.total, 0);
  const totalDone = stageStats.reduce((s, x) => s + x.done, 0);
  const overallPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
  const totalNoteWords = stageStats.reduce((s, x) => s + x.noteWords, 0);
  const notesRichStage = stageStats.reduce((a, b) => (b.noteWords > a.noteWords ? b : a), stageStats[0]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Client Meeting Workflow"
        subtitle="Guided 4-meeting advisory onboarding and review framework. Keep agendas on track, record qualitative client notes, and monitor planning completion."
        badge="Advisor OS"
      />

      <Card className="border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-900 text-white rounded-lg">
                <Users size={18} />
              </span>
              <h3 className="text-xl font-sans font-bold text-zinc-900 tracking-tight">
                Engagement Progress Overview
              </h3>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Onboarding completion across all four meetings: {totalDone} of {totalItems} checklist items done ({overallPct}%), {meetingState.completedStages.length} of 4 meetings completed{totalNoteWords > 0 ? `, ${totalNoteWords} words of meeting notes captured` : ''}.
            </p>
          </div>
          <Badge variant={overallPct === 100 ? 'success' : 'navy'} className="text-[10px] uppercase font-mono shrink-0">
            {overallPct}% Complete
          </Badge>
        </div>

        {/* Stage progress stepper */}
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Meeting stage progress">
          {stageStats.map((stage) => (
            <li
              key={stage.id}
              className={`p-4 rounded-xl border transition-colors ${
                stage.isComplete
                  ? 'bg-positive-soft border-positive/40'
                  : stage.isCurrent
                    ? 'bg-accent-soft border-accent/50'
                    : 'bg-zinc-50 border-zinc-200'
              }`}
              aria-current={stage.isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{stage.name}</span>
                {stage.isComplete ? (
                  <CheckCircle2 size={16} className="text-positive shrink-0" aria-label="Completed" />
                ) : (
                  <Circle size={16} className="text-zinc-300 shrink-0" aria-label={stage.isCurrent ? 'In progress' : 'Not started'} />
                )}
              </div>
              <div className="text-sm font-bold text-zinc-900 mt-1 leading-snug">{stage.title}</div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1">
                  <span>Checklist</span>
                  <span className="font-mono font-semibold">{stage.done}/{stage.total}</span>
                </div>
                <div className="h-2 bg-zinc-200/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stage.isComplete ? 'bg-positive' : 'bg-accent'}`}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Notes density indicator */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={15} className="text-zinc-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">Meeting Notes Density</h4>
          </div>
          <p className="text-xs text-zinc-600 mb-3">
            {totalNoteWords === 0
              ? 'No qualitative notes recorded yet — capture client reactions and commitments in each meeting to enrich the audit trail.'
              : `${notesRichStage.name} carries the richest record at ${notesRichStage.noteWords} words; notes feed the dossier and decision history.`}
          </p>
          <div role="img" aria-label={`Bar chart of meeting note word counts per stage: ${stageStats.map((s) => `${s.name} ${s.noteWords} words`).join(', ')}.`}>
            <div className="space-y-2">
              {stageStats.map((stage) => (
                <div key={stage.id} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 font-semibold text-zinc-700">{stage.name}</span>
                  <div className="flex-1 h-4 bg-zinc-100 rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md bg-info"
                      style={{ width: `${totalNoteWords > 0 ? Math.max(2, (stage.noteWords / Math.max(...stageStats.map((s) => s.noteWords), 1)) * 100) : 0}%`, opacity: stage.noteWords > 0 ? 0.85 : 0 }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-zinc-600">{stage.noteWords} words</span>
                </div>
              ))}
            </div>
          </div>
          <table className="sr-only">
            <caption>Meeting note word counts and checklist completion per stage</caption>
            <thead>
              <tr><th>Stage</th><th>Checklist items done</th><th>Note words</th></tr>
            </thead>
            <tbody>
              {stageStats.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}: {s.title}</td>
                  <td>{s.done} of {s.total}</td>
                  <td>{s.noteWords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ClientMeetingWorkflow />

      <WorkflowFooter
        prev={{ path: '/dossier', label: 'Client Dossier' }}
        next={{ path: '/decision-history', label: 'Decision History' }}
        flowHint="Conduct high-impact client meetings with structured deliverables for each stage."
      />
    </div>
  );
};
