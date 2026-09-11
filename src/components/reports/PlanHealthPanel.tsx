import type { PlanHealthResult } from '../../lib/planHealthScore';
import type { PlanRecommendation } from '../../lib/recommendationEngine';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface PlanHealthPanelProps {
  health: PlanHealthResult;
  recommendations?: PlanRecommendation[];
  /** Dossier mode renders full driver/improvement tables; compact mode renders a screen card. */
  detailed?: boolean;
  className?: string;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' =>
  status === 'Strong' || status === 'ON TRACK' ? 'success' : status === 'Review' || status === 'REVIEW NEEDED' ? 'warning' : 'danger';

const scoreBarTone = (score: number) =>
  score >= 80 ? 'bg-positive' : score >= 60 ? 'bg-warning' : 'bg-negative';

export const PlanHealthPanel = ({ health, recommendations, detailed = false, className }: PlanHealthPanelProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-md border border-border bg-sunken/60 avoid-break">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="num-hero text-5xl text-ink">{health.overallScore}</span>
          <span className="text-sm text-faint font-mono">/ 100</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(health.status)}>{health.status}</Badge>
            <span className="eyebrow">Composite Plan Health</span>
          </div>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">{health.headline}</p>
        </div>
      </div>

      {/* Component breakdown */}
      {detailed ? (
        <div className="overflow-x-auto avoid-break">
          <table className="w-full text-xs text-left border border-border rounded-md overflow-hidden">
            <thead className="bg-sunken text-muted font-semibold border-b border-border uppercase tracking-wider">
              <tr>
                <th className="p-3">Component</th>
                <th className="p-3 text-center">Weight</th>
                <th className="p-3 text-center">Score</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Key Drivers</th>
                <th className="p-3">Improvement Advice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {health.components.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-medium text-ink">
                    {c.name}
                    <p className="text-[10px] text-faint font-normal mt-0.5 leading-snug">{c.reason}</p>
                  </td>
                  <td className="p-3 text-center text-muted font-mono">{c.weight}%</td>
                  <td className="p-3 text-center font-mono font-semibold text-ink">{c.score}</td>
                  <td className="p-3 text-center">
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="p-3 text-muted leading-snug">
                    <ul className="space-y-0.5">
                      {c.drivers.map((d, i) => (
                        <li key={i}>• {d}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-3 text-muted leading-snug">{c.improvementAdvice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2 avoid-break">
          {health.components.map((c) => (
            <div key={c.id} className="flex items-center gap-3 text-xs">
              <span className="w-40 shrink-0 font-medium text-ink-soft truncate">{c.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-border-subtle overflow-hidden">
                <div className={cn('h-full rounded-full', scoreBarTone(c.score))} style={{ width: `${c.score}%` }} />
              </div>
              <span className="w-8 text-right font-mono tabular-nums font-semibold text-ink">{c.score}</span>
              <span className="w-24 text-right text-[10px] uppercase tracking-wide text-faint shrink-0">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Priority recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3 avoid-break">
          <h3 className="text-sm font-semibold text-ink">Priority Recommendations</h3>
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="p-4 rounded-md border border-border bg-raised space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium bg-deep text-canvas">P{rec.priority}</span>
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-sunken text-ink-soft border border-border-subtle">{rec.category}</span>
                <span className="text-xs font-semibold text-ink">{rec.title}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{rec.impact}</p>
              <p className="text-[11px] text-faint">
                Confidence: <span className="font-mono text-ink-soft">{rec.confidence}%</span>
              </p>
              {detailed && rec.supportingCalculations.length > 0 && (
                <p className="text-[11px] text-faint leading-snug border-t border-border-subtle pt-1.5">
                  {rec.supportingCalculations.join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
