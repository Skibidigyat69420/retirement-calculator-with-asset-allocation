import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { SectionHeader } from '../ui/SectionHeader';
import { Alert } from '../ui/Alert';
import { cn } from '../../lib/utils';
import type { PlanHealthResult, HealthComponentScore } from '../../lib/planHealthScore';

interface PlanHealthScoreCardProps {
  health: PlanHealthResult;
}

const scoreBar = (score: number): string =>
  score >= 85 ? 'bg-positive' : score >= 70 ? 'bg-warning' : 'bg-negative';

const compStatus = (status: HealthComponentScore['status']): 'on-track' | 'needs-review' | 'at-risk' =>
  status === 'Strong' ? 'on-track' : status === 'Review' ? 'needs-review' : 'at-risk';

/**
 * PLANNING HEALTH — tabular score with the dimensional breakdown beneath.
 * No radial gauge: the number is set in tabular mono, each weighted dimension
 * is a hairline row with a quiet progress mark.
 */
export const PlanHealthScoreCard = ({ health }: PlanHealthScoreCardProps) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [selectedComp, setSelectedComp] = useState<HealthComponentScore | null>(null);

  const tier =
    health.overallScore >= 85
      ? { label: 'Excellent', tone: 'positive' as const }
      : health.overallScore >= 70
        ? { label: 'Solid', tone: 'warning' as const }
        : { label: 'Needs attention', tone: 'negative' as const };

  const headlineBadge =
    health.status === 'ON TRACK' ? 'on-track' : health.status === 'REVIEW NEEDED' ? 'needs-review' : 'at-risk';

  return (
    <div>
      <SectionHeader
        title="Planning health"
        description="Weighted audit across solvency, longevity and goal feasibility."
        hairline
      />

      {/* Score — tabular, editorial, no gauge */}
      <div className="flex items-end justify-between gap-4 py-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular-nums text-6xl leading-none text-ink tracking-tight">
            {health.overallScore}
          </span>
          <span className="font-mono text-sm text-faint tabular-nums">/ 100</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={headlineBadge} />
          <Badge tone={tier.tone}>{tier.label}</Badge>
        </div>
      </div>

      <p className="text-sm text-muted leading-relaxed text-pretty pb-5 border-b border-border-subtle">
        {health.headline}
      </p>

      {/* Dimensional breakdown */}
      <div>
        {health.components.map((comp) => (
          <button
            key={comp.id}
            type="button"
            onClick={() => {
              setSelectedComp(comp);
              setExpanded(true);
            }}
            className={cn(
              'w-full text-left py-3.5 border-b border-border-subtle last:border-0 group',
              'hover:bg-surface -mx-1 px-1 rounded-sm transition-colors',
              selectedComp?.id === comp.id && expanded && 'bg-surface',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink tracking-tight truncate">{comp.name}</div>
                <div className="font-mono text-[10px] text-faint tabular-nums mt-0.5">
                  Weight {comp.weight}%
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={compStatus(comp.status)} />
                <span className="font-mono text-sm tabular-nums text-ink w-12 text-right">
                  {comp.score}
                </span>
              </div>
            </div>
            <div className="mt-2 h-1 bg-sunken rounded-full overflow-hidden" aria-hidden="true">
              <div
                className={cn('h-full rounded-full', scoreBar(comp.score))}
                style={{ width: `${Math.max(2, Math.min(100, comp.score))}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {health.keyAttentionItems.length > 0 && (
        <Alert variant="warning" className="mt-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle size={13} strokeWidth={1.8} aria-hidden="true" />
              {health.keyAttentionItems.length} observation
              {health.keyAttentionItems.length > 1 ? 's' : ''} requiring review
            </div>
            <ul className="list-disc list-inside space-y-0.5 normal-case font-normal tracking-normal text-xs">
              {health.keyAttentionItems.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      <div className="mt-5">
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide methodology' : 'View methodology'}
          {expanded ? <ChevronUp size={14} strokeWidth={1.6} /> : <ChevronDown size={14} strokeWidth={1.6} />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-raised">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-faint uppercase tracking-wider text-[10px] font-mono">
                <th className="py-2.5 px-3">Planning area</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3 text-right">Weight</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Rationale</th>
                <th className="py-2.5 px-3">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {health.components.map((comp) => (
                <tr
                  key={comp.id}
                  className={cn(
                    'hover:bg-surface transition-colors',
                    selectedComp?.id === comp.id && 'bg-surface',
                  )}
                >
                  <td className="py-2.5 px-3 font-medium text-ink">{comp.name}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-ink font-semibold">
                    {comp.score}/100
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-muted">
                    {comp.weight}%
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={compStatus(comp.status)} />
                  </td>
                  <td className="py-2.5 px-3 text-muted leading-relaxed">{comp.reason}</td>
                  <td className="py-2.5 px-3 text-ink-soft leading-relaxed">{comp.improvementAdvice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
