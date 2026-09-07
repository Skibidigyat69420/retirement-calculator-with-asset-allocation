import type { PlanHealthResult } from '../../lib/planHealthScore';
import { cn } from '../../lib/utils';

interface PlanHealthRadialProps {
  health: PlanHealthResult;
  /** Accessible name for the visual (announced by screen readers). */
  ariaLabel: string;
  className?: string;
}

const R = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

const scoreColor = (score: number) =>
  score >= 80 ? 'var(--color-positive)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-negative)';

const barTone = (score: number) =>
  score >= 80 ? 'bg-positive' : score >= 60 ? 'bg-warning' : 'bg-negative';

/**
 * Composite plan-health score as a radial gauge plus per-component bars,
 * rendered with inline SVG + pure divs (fully print-safe on A4). Exact
 * scores are printed in text next to every bar; the detailed component
 * table (drivers / advice) remains alongside in the dossier.
 */
export const PlanHealthRadial = ({ health, ariaLabel, className }: PlanHealthRadialProps) => {
  const arc = (health.overallScore / 100) * CIRCUMFERENCE;
  const color = scoreColor(health.overallScore);

  return (
    <div
      className={cn('flex flex-col sm:flex-row print:flex-row items-center gap-6 p-5 rounded-xl border border-border bg-surface avoid-break', className)}
      aria-label={ariaLabel}
    >
      {/* Radial gauge */}
      <div className="relative shrink-0 w-32 h-32" role="img" aria-label={`Composite plan health score ${health.overallScore} out of 100, status ${health.status}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-sunken)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRCUMFERENCE}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-sans font-bold text-ink leading-none">{health.overallScore}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted mt-1">/ 100</span>
        </div>
      </div>

      {/* Component bars */}
      <div className="flex-1 w-full space-y-2">
        {health.components.map((c) => (
          <div key={c.id} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 font-medium text-ink truncate">{c.name}</span>
            <div className="flex-1 h-2 rounded-full bg-sunken overflow-hidden">
              <div className={cn('h-full rounded-full', barTone(c.score))} style={{ width: `${c.score}%` }} />
            </div>
            <span className="w-8 text-right font-mono font-semibold text-ink">{c.score}</span>
            <span className="w-14 text-right text-[10px] uppercase tracking-wide text-muted shrink-0">{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
