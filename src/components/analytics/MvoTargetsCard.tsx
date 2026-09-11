import { Zap, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';
import type { AssetCategory } from '../../types';
import type { Portfolio } from '../../lib/mvo';

interface MvoTargetsCardProps {
  maxSharpe: Record<AssetCategory, number>;
  minVariance: Record<AssetCategory, number>;
  maxSharpePortfolio: Portfolio;
  minVariancePortfolio: Portfolio;
  appliedMvo: string | null;
  onApply: (portfolio: Portfolio, label: string) => void;
}

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

/** Markowitz efficient-target cards — apply an optimized mix as the policy target. */
export const MvoTargetsCard = ({
  maxSharpe,
  minVariance,
  maxSharpePortfolio,
  minVariancePortfolio,
  appliedMvo,
  onApply,
}: MvoTargetsCardProps) => {
  const items = [
    { label: 'Max Sharpe (Tangency)', targets: maxSharpe, portfolio: maxSharpePortfolio },
    { label: 'Minimum Variance', targets: minVariance, portfolio: minVariancePortfolio },
  ];

  return (
    <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Markowitz efficient targets">
      <SectionHeader
        title="Markowitz Efficient Targets"
        description="Optimal portfolios from the parametric mean-variance frontier on full empirical history, respecting the risk-profile equity cap."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink inline-flex items-center gap-2">
                <Zap size={15} strokeWidth={1.6} className="text-muted" aria-hidden="true" />
                {item.label}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted border border-border rounded-sm px-1.5 py-0.5 bg-raised">
                Sharpe {item.portfolio.sharpe.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {CATEGORIES.filter((c) => item.targets[c] > 0.5).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 text-ink-soft">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                  <span className="truncate">{ASSET_LABELS[cat]}</span>
                  <span className="ml-auto font-mono tabular-nums">{formatPercent(item.targets[cat], 0)}</span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant={appliedMvo === item.label ? 'secondary' : 'primary'}
              onClick={() => onApply(item.portfolio, item.label)}
              className="w-full gap-1.5"
            >
              {appliedMvo === item.label ? (
                <>
                  <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" /> Applied to target mix
                </>
              ) : (
                'Apply to target mix'
              )}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};
