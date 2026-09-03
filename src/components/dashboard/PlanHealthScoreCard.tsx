import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
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

  // Score color scheme
  let scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let badgeVariant: 'success' | 'warning' | 'danger' = 'success';
  if (health.overallScore < 70) {
    scoreColor = 'text-rose-700 bg-rose-50 border-rose-200';
    badgeVariant = 'danger';
  } else if (health.overallScore < 85) {
    scoreColor = 'text-amber-700 bg-amber-50 border-amber-200';
    badgeVariant = 'warning';
  }

  return (
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-4">
          {/* Circular Score Badge */}
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 ${scoreColor}`}
          >
            <span className="text-2xl font-black font-mono leading-none">{health.overallScore}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">/ 100</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Financial Plan Health Score
              </h3>
              <Badge variant={badgeVariant} className="text-[10px] tracking-wider uppercase font-semibold">
                {health.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{health.headline}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs h-8 px-3 gap-1.5 self-start sm:self-center shrink-0"
        >
          {expanded ? 'Hide Breakdown' : 'View 7 Area Breakdown'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Key Attention Items Alert */}
      {health.keyAttentionItems.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-950 uppercase tracking-wider text-[11px]">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            {health.keyAttentionItems.length} Key Item{health.keyAttentionItems.length > 1 ? 's' : ''} Requiring Strategic Review:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1 font-medium">
            {health.keyAttentionItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick 7-Area Mini Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
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
            <div
              key={comp.id}
              onClick={() => {
                setSelectedComp(comp);
                setExpanded(true);
              }}
              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 cursor-pointer transition-all space-y-1.5"
            >
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                <span className="truncate">{comp.name.split(' ')[0]}</span>
                <span className={`font-mono font-bold ${textColor}`}>{comp.score}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barBg}`} style={{ width: `${comp.score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Comprehensive Breakdown Table */}
      {expanded && (
        <div className="border-t border-slate-100 pt-4 space-y-3 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Info size={13} className="text-indigo-600" />
            Transparent Methodology & Area Health Drivers
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-2 w-36">Planning Area</th>
                  <th className="pb-2 w-20 text-right">Score</th>
                  <th className="pb-2 w-28">Status</th>
                  <th className="pb-2">Quantitative Rationale</th>
                  <th className="pb-2 w-64">Improvement Advice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedComp?.id === comp.id ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold text-slate-900">{comp.name}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 pr-3">
                        {comp.score}/100
                      </td>
                      <td className="py-2.5">{badge}</td>
                      <td className="py-2.5 pr-3 text-slate-600 leading-relaxed">{comp.reason}</td>
                      <td className="py-2.5 text-slate-700 font-medium leading-relaxed">
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
