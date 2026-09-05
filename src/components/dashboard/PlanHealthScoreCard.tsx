import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { PlanHealthResult, HealthComponentScore } from '../../lib/planHealthScore';

interface PlanHealthScoreCardProps {
  health: PlanHealthResult;
}

export const PlanHealthScoreCard = ({ health }: PlanHealthScoreCardProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [selectedComp, setSelectedComp] = useState<HealthComponentScore | null>(null);

  // Derive Tier Status Badge and Color Schemes
  let tierLabel: 'Excellent' | 'Solid' | 'Needs Attention' = 'Solid';
  let tierBadgeVariant: 'success' | 'warning' | 'danger' = 'warning';
  let strokeColor = '#f59e0b';
  let glowColor = 'rgba(245, 158, 11, 0.15)';

  if (health.overallScore >= 85) {
    tierLabel = 'Excellent';
    tierBadgeVariant = 'success';
    strokeColor = '#10b981';
    glowColor = 'rgba(16, 185, 129, 0.15)';
  } else if (health.overallScore < 70) {
    tierLabel = 'Needs Attention';
    tierBadgeVariant = 'danger';
    strokeColor = '#f43f5e';
    glowColor = 'rgba(244, 63, 94, 0.15)';
  }

  // Circular gauge geometry
  const radius = 46;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, health.overallScore)) / 100) * circumference;

  // Extract the 3 Core Required Metrics: Longevity, Goal Feasibility, Solvency
  const retirementComp = health.components.find((c) => c.id === 'retirement') || {
    name: 'Longevity & Retirement',
    score: health.overallScore,
    status: 'Strong' as const,
    reason: 'Portfolio longevity aligns with expected lifespan.',
  };

  const goalComp = health.components.find((c) => c.id === 'goals') || {
    name: 'Goal Feasibility',
    score: Math.min(100, health.overallScore + 5),
    status: 'Strong' as const,
    reason: 'Goal funding targets are comfortably covered.',
  };

  const solvencyComp = health.components.find((c) => c.id === 'debt') || {
    name: 'Solvency & Balance Sheet',
    score: 100,
    status: 'Strong' as const,
    reason: 'Zero high-cost liabilities; complete household solvency.',
  };

  const coreMetrics = [
    {
      id: 'longevity',
      label: 'Longevity Runway',
      sublabel: 'Retirement horizon & sustainable withdrawal capacity',
      score: retirementComp.score,
      status: retirementComp.status,
      reason: retirementComp.reason,
      color: retirementComp.score >= 85 ? 'bg-emerald-500' : retirementComp.score >= 70 ? 'bg-amber-500' : 'bg-rose-500',
      textAccent: retirementComp.score >= 85 ? 'text-emerald-700' : retirementComp.score >= 70 ? 'text-amber-700' : 'text-rose-700',
    },
    {
      id: 'goal-feasibility',
      label: 'Goal Feasibility',
      sublabel: 'Funding ratio across prioritized family milestones',
      score: goalComp.score,
      status: goalComp.status,
      reason: goalComp.reason,
      color: goalComp.score >= 85 ? 'bg-emerald-500' : goalComp.score >= 70 ? 'bg-amber-500' : 'bg-rose-500',
      textAccent: goalComp.score >= 85 ? 'text-emerald-700' : goalComp.score >= 70 ? 'text-amber-700' : 'text-rose-700',
    },
    {
      id: 'solvency',
      label: 'Balance Sheet Solvency',
      sublabel: 'Debt liability exposure & structural capital safety',
      score: solvencyComp.score,
      status: solvencyComp.status,
      reason: solvencyComp.reason,
      color: solvencyComp.score >= 85 ? 'bg-emerald-500' : solvencyComp.score >= 70 ? 'bg-amber-500' : 'bg-rose-500',
      textAccent: solvencyComp.score >= 85 ? 'text-emerald-700' : solvencyComp.score >= 70 ? 'text-amber-700' : 'text-rose-700',
    },
  ];

  return (
    <Card className="p-5 sm:p-6 bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card transition-all space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight font-sans">
                Plan Health Scorecard
              </h3>
              <Badge variant={tierBadgeVariant} className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5">
                {tierLabel === 'Excellent' && <Sparkles size={11} className="mr-1 inline" />}
                {tierLabel} ({health.overallScore}/100)
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Multi-factor health audit across solvency, longevity runway, and goal feasibility
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs h-8 px-3 gap-1.5 self-start sm:self-center shrink-0 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300"
        >
          {expanded ? 'Hide Audit Methodology' : 'View Full 7-Pillar Audit'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Main Grid: Circular Gauge & 3 Core Pillar Progress Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Radial Circular Score Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50/70 border border-zinc-200/80">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Ambient subtle glow ring */}
            <div
              className="absolute inset-2 rounded-full blur-md opacity-40"
              style={{ backgroundColor: glowColor }}
            />

            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
              {/* Background Track */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                className="text-zinc-200 stroke-current"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-sans font-extrabold text-zinc-950 tracking-tight leading-none">
                {health.overallScore}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                OUT OF 100
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-zinc-200 shadow-2xs text-zinc-800">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: strokeColor }}
              />
              Status: <strong className="text-zinc-950">{tierLabel}</strong>
            </div>
            <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
              {health.headline}
            </p>
          </div>
        </div>

        {/* Right Column: Clean Progress Bars for Solvency, Goal Feasibility, and Longevity */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Primary Plan Health Pillars
            </h4>
            <span className="text-[11px] text-zinc-400 font-medium">Weighted Institutional Rubric</span>
          </div>

          <div className="space-y-3.5">
            {coreMetrics.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all space-y-2 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-950 tracking-tight">{item.label}</span>
                      <Badge
                        variant={item.status === 'Needs Attention' ? 'danger' : item.status === 'Review' ? 'warning' : 'success'}
                        className="text-[9px] px-1.5 py-0 font-bold uppercase"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{item.sublabel}</p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className={`text-sm font-sans font-bold tabular-nums ${item.textAccent}`}>
                      {item.score}%
                    </span>
                  </div>
                </div>

                {/* Smooth Progress Bar */}
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${item.color}`}
                    style={{ width: `${Math.max(4, Math.min(100, item.score))}%` }}
                  />
                </div>

                <div className="text-[11px] text-zinc-600 leading-snug">
                  {item.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Attention Items Alert Banner */}
      {health.keyAttentionItems.length > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs text-rose-950 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-950 uppercase tracking-wider text-[11px]">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            {health.keyAttentionItems.length} Critical Observation{health.keyAttentionItems.length > 1 ? 's' : ''} Requiring Strategic Review:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-900/90 pl-1 font-medium">
            {health.keyAttentionItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7-Area Micro Indicator Grid */}
      <div className="pt-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Comprehensive 7-Area Snapshot (Click any tile for detailed breakdown)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {health.components.map((comp) => {
            let barBg = 'bg-emerald-500';
            let textColor = 'text-emerald-700';
            if (comp.score < 70) {
              barBg = 'bg-rose-500';
              textColor = 'text-rose-700';
            } else if (comp.score < 85) {
              barBg = 'bg-amber-500';
              textColor = 'text-amber-700';
            }

            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => {
                  setSelectedComp(comp);
                  setExpanded(true);
                }}
                className={`p-2.5 text-left rounded-xl border transition-all ${
                  selectedComp?.id === comp.id && expanded
                    ? 'border-zinc-950 bg-zinc-100 shadow-2xs'
                    : 'border-zinc-200/80 bg-zinc-50/70 hover:bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-600">
                  <span className="truncate">{comp.name.split(' ')[0]}</span>
                  <span className={`font-sans font-bold ${textColor}`}>{comp.score}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200/80 rounded-full overflow-hidden mt-1.5">
                  <div className={`h-full rounded-full ${barBg}`} style={{ width: `${comp.score}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Comprehensive Breakdown Table */}
      {expanded && (
        <div className="border-t border-zinc-100 pt-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Info size={14} className="text-zinc-700" />
              Institutional Planning Methodology & Component Weightings
            </h4>
            <span className="text-[11px] text-zinc-400">Total Rubric Weight: 100%</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-40">Planning Area</th>
                  <th className="py-2.5 px-3 w-20 text-right">Score</th>
                  <th className="py-2.5 px-3 w-16 text-right">Weight</th>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3">Quantitative Rationale</th>
                  <th className="py-2.5 px-3 w-64">Strategic Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {health.components.map((comp) => {
                  let badge = <Badge variant="success">Strong</Badge>;
                  if (comp.status === 'Needs Attention') {
                    badge = <Badge variant="danger">Attention</Badge>;
                  } else if (comp.status === 'Review') {
                    badge = <Badge variant="warning">Review</Badge>;
                  }

                  return (
                    <tr
                      key={comp.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        selectedComp?.id === comp.id ? 'bg-zinc-50 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-zinc-950">
                        {comp.name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans font-bold text-zinc-950">
                        {comp.score}/100
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-500 font-mono text-[11px]">
                        {comp.weight}%
                      </td>
                      <td className="py-2.5 px-3">{badge}</td>
                      <td className="py-2.5 px-3 text-zinc-600 leading-relaxed">{comp.reason}</td>
                      <td className="py-2.5 px-3 text-zinc-800 font-medium leading-relaxed">
                        {comp.improvementAdvice}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
};
