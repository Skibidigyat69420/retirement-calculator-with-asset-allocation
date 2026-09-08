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
  score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-warning-soft0' : 'bg-rose-500';

export const PlanHealthPanel = ({ health, recommendations, detailed = false, className }: PlanHealthPanelProps) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl border border-border bg-sunken/50 avoid-break">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-4xl font-sans font-bold text-ink">{health.overallScore}</span>
          <span className="text-sm text-muted">/ 100</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(health.status)}>{health.status}</Badge>
            <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">Composite Plan Health</span>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">{health.headline}</p>
        </div>
      </div>

      {/* Component breakdown */}
      {detailed ? (
        <div className="overflow-x-auto avoid-break">
          <table className="w-full text-xs text-left border border-border rounded-lg overflow-hidden">
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
            <tbody className="divide-y divide-border">
              {health.components.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-medium text-ink">
                    {c.name}
                    <p className="text-[10px] text-muted font-normal mt-0.5 leading-snug">{c.reason}</p>
                  </td>
                  <td className="p-3 text-center text-muted font-mono">{c.weight}%</td>
                  <td className="p-3 text-center font-mono font-bold text-ink">{c.score}</td>
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
              <div className="flex-1 h-2 rounded-full bg-sunken overflow-hidden">
                <div className={cn('h-full rounded-full', scoreBarTone(c.score))} style={{ width: `${c.score}%` }} />
              </div>
              <span className="w-8 text-right font-mono font-semibold text-ink">{c.score}</span>
              <span className="w-24 text-right text-[10px] uppercase tracking-wide text-muted shrink-0">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Priority recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-3 avoid-break">
          <h3 className="text-sm font-semibold text-ink">Priority Recommendations</h3>
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="p-4 rounded-xl border border-border bg-surface space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sunken text-ink">P{rec.priority}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sunken text-ink-soft">{rec.category}</span>
                <span className="text-xs font-semibold text-ink">{rec.title}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{rec.impact}</p>
              <p className="text-[11px] text-muted">
                Confidence: <span className="font-mono font-semibold text-ink-soft">{rec.confidence}%</span>
              </p>
              {detailed && rec.supportingCalculations.length > 0 && (
                <p className="text-[11px] text-muted leading-snug border-t border-border pt-1.5">
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
