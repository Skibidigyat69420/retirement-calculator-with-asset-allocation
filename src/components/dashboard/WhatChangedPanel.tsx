import { ArrowRight, GitCommit, History, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { useCalculator } from '../../context/CalculatorContext';
import { getCategoryBreakdown } from '../../lib/calculations';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';

interface DriftMetricProps {
  label: string;
  value: string | null;
  sub?: string;
  badge?: { tone: BadgeTone; label: string };
}

const DriftMetric = ({ label, value, sub, badge }: DriftMetricProps) => (
  <div>
    <div className="eyebrow">{label}</div>
    <div className="mt-1.5 flex items-baseline gap-2 flex-wrap min-h-6">
      <span className="font-mono tabular-nums text-base font-medium text-ink">
        {value ?? '—'}
      </span>
      {sub && <span className="font-mono text-[11px] text-faint tabular-nums">{sub}</span>}
    </div>
    {badge && (
      <div className="mt-1.5">
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
    )}
  </div>
);

/**
 * RECENT ACTIVITY — parameter drift summary plus the immutable decision
 * audit trail. Hairline rows, tabular numbers, revert actions preserved.
 */
export const WhatChangedPanel = () => {
  const {
    inputs,
    wealthResult,
    decisionHistory,
    revertDecision,
    riskProfile,
    riskScore,
    manualTargets,
    showToast,
  } = useCalculator();

  const configured = wealthResult.isConfigured;

  // Parameter drift — strategic equity vs target
  const breakdown = getCategoryBreakdown(inputs.assets);
  const actualEquityPct = breakdown.percentages.equity || 0;
  const targetEquityPct =
    manualTargets?.equity ??
    (riskProfile?.targets?.equity ?? Math.round(Math.max(20, Math.min(85, 20 + riskScore * 0.65))));
  const equityDrift = actualEquityPct - targetEquityPct;
  const driftBadge =
    Math.abs(equityDrift) <= 5 ? 'positive' : Math.abs(equityDrift) <= 12 ? 'warning' : 'negative';
  const driftLabel =
    Math.abs(equityDrift) <= 2 ? 'Balanced' : `${equityDrift > 0 ? '+' : ''}${equityDrift.toFixed(1)} pts`;

  // Liquidity buffer in months of expenses
  const liquidAssets = inputs.assets
    .filter((a) => a.category === 'liquid')
    .reduce((s, a) => s + (a.value || 0), 0);
  const monthlyExpense =
    inputs.swp?.monthlyNeedToday || (inputs.annualIncome > 0 ? (inputs.annualIncome / 12) * 0.5 : 0);
  const emergencyMonths = monthlyExpense > 0 ? Math.round((liquidAssets / monthlyExpense) * 10) / 10 : null;
  const bufferBadge = emergencyMonths === null ? 'neutral' : emergencyMonths >= 6 ? 'positive' : emergencyMonths >= 3 ? 'warning' : 'negative';
  const bufferLabel = emergencyMonths === null ? '—' : emergencyMonths >= 6 ? 'Adequate' : 'Gap';

  const recentDecisions = decisionHistory.slice(0, 3);
  const latestTimestamp = decisionHistory.length > 0 ? decisionHistory[0].dateFormatted : null;

  const handleRevert = (id: string, title: string) => {
    revertDecision(id);
    showToast(`Reverted: "${title}" reversed to prior state.`, 'info');
  };

  return (
    <div>
      <SectionHeader
        title="Recent activity"
        description="Live parameter drift and the immutable decision audit trail."
        hairline
        action={
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-faint tabular-nums hidden sm:block">
              Last audit {latestTimestamp ?? '—'}
            </span>
            <Link
              to="/decision-history"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
            >
              <History size={13} strokeWidth={1.6} aria-hidden="true" />
              Audit log ({decisionHistory.length})
            </Link>
          </div>
        }
      />

      {/* Drift metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 py-5 border-b border-border-subtle">
        <DriftMetric
          label="Equity drift"
          value={configured ? `${actualEquityPct.toFixed(1)}%` : null}
          sub={`target ${targetEquityPct.toFixed(0)}%`}
          badge={{ tone: driftBadge, label: driftLabel }}
        />
        <DriftMetric
          label="Liquidity buffer"
          value={emergencyMonths === null ? null : `${emergencyMonths.toFixed(1)} mo`}
          badge={{ tone: bufferBadge, label: bufferLabel }}
        />
        <DriftMetric
          label="Longevity horizon"
          value={
            !configured
              ? null
              : wealthResult.sustainable
                ? 'Age 90+'
                : wealthResult.depletionAge
                  ? `Age ${wealthResult.depletionAge}`
                  : null
          }
          sub={configured ? `target age ${inputs.lifeExpectancy || '—'}` : undefined}
          badge={
            configured
              ? { tone: wealthResult.sustainable ? 'positive' : 'negative', label: wealthResult.sustainable ? 'Sustainable' : 'Shortfall' }
              : undefined
          }
        />
        <DriftMetric
          label="SIP commitment"
          value={`${formatCurrencyCompact(inputs.sip.amount)}/mo`}
          sub={`${formatPercent(wealthResult.savingsRate)} savings · ${inputs.sip.stepUp}% step-up`}
        />
      </div>

      {/* Decision audit diffs */}
      <div className="pt-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <GitCommit size={14} strokeWidth={1.6} className="text-muted" aria-hidden="true" />
            <span className="eyebrow">Decision diffs</span>
            <span className="font-mono text-[10px] text-faint tabular-nums">
              {decisionHistory.length} recorded
            </span>
          </div>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-4 py-3.5">
            <p className="text-xs text-muted">No decisions logged yet — decisions you log will appear here.</p>
            <Link
              to="/decision-history"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:underline underline-offset-2 shrink-0"
            >
              Log a decision <ArrowRight size={12} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {recentDecisions.map((dec) => (
              <li key={dec.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="neutral" dot={false}>{dec.category}</Badge>
                    <span className="text-xs font-medium text-ink">{dec.actionTitle}</span>
                    <span className="font-mono text-[10px] text-faint tabular-nums">
                      {dec.dateFormatted} · {dec.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="font-mono tabular-nums line-through text-negative bg-negative-soft border border-negative/20 rounded-sm px-1.5 py-0.5">
                      {dec.previousValue}
                    </span>
                    <ArrowRight size={11} strokeWidth={1.6} className="text-faint shrink-0" aria-hidden="true" />
                    <span className="font-mono tabular-nums text-positive bg-positive-soft border border-positive/20 rounded-sm px-1.5 py-0.5">
                      {dec.newValue}
                    </span>
                    <span className="text-muted hidden lg:inline truncate max-w-sm">({dec.rationale})</span>
                  </div>
                </div>
                {dec.revertPatch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevert(dec.id, dec.actionTitle)}
                    className="self-start md:self-center shrink-0"
                  >
                    <RotateCcw size={12} strokeWidth={1.6} aria-hidden="true" />
                    Revert
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {decisionHistory.length > 3 && (
          <div className="pt-3">
            <Link
              to="/decision-history"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
            >
              View all {decisionHistory.length} audit entries <ArrowRight size={12} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
