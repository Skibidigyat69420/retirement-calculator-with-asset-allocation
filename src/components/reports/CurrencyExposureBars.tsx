import type { CurrencyExposure } from '../../lib/wealthEngine';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';

interface CurrencyExposureBarsProps {
  exposure: CurrencyExposure[];
  /** Accessible name for the visual (announced by screen readers). */
  ariaLabel: string;
  className?: string;
}

const CURRENCY_COLORS: Record<string, string> = {
  INR: 'var(--color-positive)',
  USD: 'var(--color-info)',
};

const fallbackColor = (index: number) => ['var(--color-warning)', 'var(--color-negative)', 'var(--color-accent)', 'var(--color-muted)'][index % 4];

/**
 * Currency exposure of investable assets as labelled percentage bars,
 * rendered with pure divs for reliable A4 print. Exact values appear in
 * text on every row; the currency detail table remains alongside.
 */
export const CurrencyExposureBars = ({ exposure, ariaLabel, className }: CurrencyExposureBarsProps) => {
  if (!exposure.length) return null;

  const maxPct = Math.max(1, ...exposure.map((c) => c.percentage));

  return (
    <div className={cn('space-y-2.5', className)} aria-label={ariaLabel}>
      {exposure.map((c, i) => {
        const width = Math.max(1.5, (c.percentage / maxPct) * 100);
        const color = CURRENCY_COLORS[c.currency] ?? fallbackColor(i);
        return (
          <div key={c.currency} className="flex items-center gap-3 text-xs">
            <span className="w-12 shrink-0 font-mono font-bold text-ink">{c.currency}</span>
            <div className="flex-1 h-4 rounded bg-sunken overflow-hidden" role="img" aria-label={`${c.currency}: ${formatPercent(c.percentage)} of investable assets (${formatCurrency(c.amount)})`}>
              <div className="h-full rounded" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-muted">{formatCurrency(c.amount)}</span>
            <span className="w-14 shrink-0 text-right font-mono font-semibold text-ink">{formatPercent(c.percentage)}</span>
          </div>
        );
      })}
    </div>
  );
};
