import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  FileText,
  ArrowRight,
  Save,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
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

export const ClientMeetingWorkflow = () => {
  const {
    meetingState,
    updateMeetingStage,
    toggleMeetingChecklist,
    saveMeetingNotes,
    showToast,
  } = useCalculator();

  const [activeStageId, setActiveStageId] = useState<ClientMeetingStageId>(meetingState.currentStage || 1);
  const [currentNote, setCurrentNote] = useState<string>(meetingState.notes[activeStageId] || '');

  const activeStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  const totalChecklistItems = STAGES.reduce((sum, s) => sum + s.checklist.length, 0);
  const completedChecklistCount = Object.values(meetingState.stageChecklists).filter(Boolean).length;
  const progressPercent = Math.round((completedChecklistCount / totalChecklistItems) * 100);

  const handleStageSelect = (stageId: ClientMeetingStageId) => {
    setActiveStageId(stageId);
    setCurrentNote(meetingState.notes[stageId] || '');
  };

  const handleSaveNotes = () => {
    saveMeetingNotes(activeStageId, currentNote);
    showToast('Meeting notes saved.', 'success');
  };

  const handleAdvanceStage = () => {
    if (activeStageId < 4) {
      const nextStage = (activeStageId + 1) as ClientMeetingStageId;
      updateMeetingStage(nextStage);
      setActiveStageId(nextStage);
      setCurrentNote(meetingState.notes[nextStage] || '');
      showToast(`Advanced to ${STAGES[nextStage - 1].name}: ${STAGES[nextStage - 1].title}`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-900 text-white rounded-lg">
                <Users size={18} />
              </span>
              <h3 className="text-xl font-sans font-bold text-zinc-900 tracking-tight">
                Guided Client Meeting Workflow
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                Adviser Operating System
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Structured 4-meeting advisory framework guiding the client journey from discovery to diagnostic modeling, recommendation, and institutional delivery.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Overall Progress</span>
              <span className="text-sm font-bold font-mono text-zinc-900">{progressPercent}% Completed</span>
            </div>
            <div className="w-20 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div className="h-full bg-zinc-900 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* 4-Stage Step Tracker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map((s) => {
            const isCurrent = s.id === meetingState.currentStage;
            const isSelected = s.id === activeStageId;
            const stageDone = s.checklist.every((item) => meetingState.stageChecklists[item.id]);

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleStageSelect(s.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : isCurrent
                    ? 'bg-zinc-50/50 border-zinc-300 text-zinc-900'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {s.name}
                  </span>
                  {stageDone ? (
                    <CheckCircle2 size={15} className={isSelected ? 'text-emerald-400' : 'text-emerald-600'} />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  ) : null}
                </div>
                <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                  {s.title}
                </h4>
                <p className={`text-[11px] mt-1 line-clamp-2 leading-snug ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {s.description}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Stage Detailed Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Checklist & Milestones */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                {activeStage.name} Execution Agenda
              </span>
              <h3 className="text-base font-sans font-bold text-zinc-900 mt-0.5">
                {activeStage.title}
              </h3>
            </div>

            {activeStageId < 4 && (
              <Button size="sm" onClick={handleAdvanceStage} className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs">
                Advance Stage <ChevronRight size={13} className="ml-1" />
              </Button>
            )}
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            {activeStage.description}
          </p>

          <div className="space-y-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">
              Meeting Milestones &amp; Actions:
            </span>
            {activeStage.checklist.map((item) => {
              const isChecked = Boolean(meetingState.stageChecklists[item.id]);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    isChecked
                      ? 'bg-zinc-50/60 border-zinc-200 text-zinc-900'
                      : 'bg-white border-zinc-200/90 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMeetingChecklist(item.id)}
                      className="w-4 h-4 accent-slate-900 rounded"
                    />
                    <span className={`text-xs font-semibold truncate ${isChecked ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                      {item.label}
                    </span>
                  </label>

                  <Link
                    to={item.route}
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-zinc-100"
                  >
                    Open <ArrowRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-zinc-100">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-2">
              Deliverables Produced in this Stage:
            </span>
            <div className="flex flex-wrap gap-2">
              {activeStage.keyOutputs.map((out) => (
                <span key={out} className="px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" />
                  {out}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Adviser Notes & Briefing */}
        <Card className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h4 className="font-sans font-bold text-zinc-900 text-sm flex items-center gap-2">
                <FileText size={16} className="text-zinc-500" />
                Adviser Meeting Notes
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {activeStage.name}
              </Badge>
            </div>

            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              rows={8}
              placeholder="Record client questions, qualitative constraints, behavioral observations, or specific adjustments discussed..."
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-zinc-900 resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button size="sm" onClick={handleSaveNotes} className="w-full bg-zinc-900 text-white hover:bg-zinc-800 text-xs">
              <Save size={13} className="mr-1.5" /> Save Meeting Notes
            </Button>

            <div className="p-3 bg-zinc-50/70 border border-zinc-200/80 rounded-xl text-[11px] text-zinc-900 space-y-1">
              <span className="font-bold block">Advisory Briefing Hint:</span>
              <p className="leading-snug text-zinc-900/90">
                Notes saved here are automatically embedded in the final Executive Dossier and Investment Policy Statement audit trail.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
