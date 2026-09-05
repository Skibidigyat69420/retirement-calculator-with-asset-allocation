import { useState } from 'react';
import {
  Activity,
  History,
  ArrowRight,
  RotateCcw,
  Clock,
  CheckCircle2,
  ChevronRight,
  GitCommit,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { getCategoryBreakdown } from '../../lib/calculations';

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

  const [expanded, setExpanded] = useState<boolean>(false);

  // Success and status metrics
  const successProb = Math.round(
    (wealthResult.monteCarlo?.successRate ?? (wealthResult.sustainable ? 0.88 : 0.45)) * 100,
  );
  const isHealthy = wealthResult.sustainable && successProb >= 75;

  // Parameter Drift 1: Strategic Equity Drift
  const breakdown = getCategoryBreakdown(inputs.assets);
  const actualEquityPct = breakdown.percentages.equity || 0;
  const targetEquityPct =
    manualTargets?.equity ??
    (riskProfile?.targets?.equity ?? Math.round(Math.max(20, Math.min(85, 20 + riskScore * 0.65))));
  const equityDrift = actualEquityPct - targetEquityPct;

  // Parameter Drift 2: Liquidity Buffer
  const liquidAssets = inputs.assets
    .filter((a) => a.category === 'liquid')
    .reduce((s, a) => s + (a.value || 0), 0);
  const monthlyExpense =
    inputs.swp?.monthlyNeedToday ||
    (inputs.annualIncome > 0 ? (inputs.annualIncome / 12) * 0.5 : 100000);
  const emergencyMonths =
    monthlyExpense > 0 ? Math.round((liquidAssets / monthlyExpense) * 10) / 10 : 6;

  // Recent decisions
  const recentDecisions = decisionHistory.slice(0, 3);
  const latestTimestamp =
    decisionHistory.length > 0 && decisionHistory[0].dateFormatted
      ? decisionHistory[0].dateFormatted
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleRevert = (id: string, title: string) => {
    revertDecision(id);
    showToast(`Reverted: "${title}" reversed to prior state.`, 'info');
  };

  return (
    <Card className="p-5 sm:p-6 border border-zinc-200/90 bg-white shadow-2xs hover:shadow-card transition-all space-y-5">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isHealthy ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <Activity size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-950 font-sans">
                Live Audit & Parameter Drift Monitor
              </span>
              <Badge variant={isHealthy ? 'success' : 'danger'} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                {wealthResult.sustainable ? 'Mandate on Track' : 'Shortfall Drift Detected'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Continuous parameter tracking, strategic asset drift, and immutable audit trail
            </p>
          </div>
        </div>

        {/* Timestamp Details & Quick Audit Link */}
        <div className="flex items-center gap-3 text-xs self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-200">
            <Clock size={12} className="text-zinc-400" />
            <span>Last Audit: <strong className="text-zinc-800 font-semibold">{latestTimestamp}</strong></span>
          </div>

          <Link
            to="/decision-history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950 underline underline-offset-2"
          >
            <History size={13} />
            <span>Audit Log ({decisionHistory.length})</span>
          </Link>
        </div>
      </div>

      {/* Parameter Drift Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Strategic Equity Drift */}
        <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Strategic Equity Drift</span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                Math.abs(equityDrift) <= 5
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : Math.abs(equityDrift) <= 12
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {Math.abs(equityDrift) <= 2
                ? 'Balanced'
                : `${equityDrift > 0 ? '+' : ''}${equityDrift.toFixed(1)}% Drift`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-sans font-bold text-zinc-950">
              {actualEquityPct.toFixed(1)}% <span className="text-xs text-zinc-400 font-normal">actual</span>
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Target: {targetEquityPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Metric 2: Liquidity Buffer Drift */}
        <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Liquid Buffer Drift</span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                emergencyMonths >= 6
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : emergencyMonths >= 3
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {emergencyMonths >= 6 ? 'Adequate' : 'Buffer Gap'}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-sans font-bold text-zinc-950">
              {emergencyMonths} mo <span className="text-xs text-zinc-400 font-normal">runway</span>
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Target: 6.0 mo
            </span>
          </div>
        </div>

        {/* Metric 3: Longevity Runway */}
        <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Longevity Horizon</span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                wealthResult.sustainable
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {wealthResult.sustainable ? 'Sustainable' : `Depletes ${wealthResult.depletionAge}`}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-sans font-bold text-zinc-950">
              {wealthResult.sustainable ? 'Age 90+' : `Age ${wealthResult.depletionAge}`}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Target: Age {inputs.lifeExpectancy}
            </span>
          </div>
        </div>

        {/* Metric 4: Monthly Commitment */}
        <div className="p-3 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">SIP Commitment</span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
              {formatPercent(wealthResult.savingsRate)} Savings
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-sans font-bold text-zinc-950">
              {formatCurrencyCompact(inputs.sip.amount)}/mo
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {inputs.sip.stepUp}% Step-up
            </span>
          </div>
        </div>
      </div>

      {/* Key Plan Adjustments / Audit Diff Card */}
      <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit size={15} className="text-zinc-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Key Plan Adjustments & Audit Diffs
            </h4>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({decisionHistory.length} recorded change{decisionHistory.length === 1 ? '' : 's'})
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-zinc-600 hover:text-zinc-950 font-semibold flex items-center gap-1"
          >
            <span>{expanded ? 'Show Less' : 'View Audit Diffs'}</span>
            <ChevronRight size={13} className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {recentDecisions.length === 0 ? (
          <div className="p-3 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Baseline Plan Calibrated — No manual parameter overrides active.</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">Initial Plan State</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentDecisions.map((dec) => (
              <div
                key={dec.id}
                className="p-3 rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {dec.category}
                    </span>
                    <span className="text-xs font-bold text-zinc-950">{dec.actionTitle}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      · {dec.dateFormatted} by {dec.author}
                    </span>
                  </div>

                  {/* Diff visualization */}
                  <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                    <span className="text-zinc-400 text-[11px]">Adjustment:</span>
                    <span className="line-through text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[11px] font-mono border border-rose-200/60">
                      {dec.previousValue}
                    </span>
                    <ArrowRight size={12} className="text-zinc-400 shrink-0" />
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border border-emerald-200/60">
                      {dec.newValue}
                    </span>
                    <span className="text-zinc-500 text-[11px] hidden lg:inline truncate max-w-sm">
                      ({dec.rationale})
                    </span>
                  </div>
                </div>

                {/* Revert Action */}
                {dec.revertPatch && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevert(dec.id, dec.actionTitle)}
                    className="text-[11px] h-7 px-2.5 text-zinc-700 border-zinc-200 hover:bg-zinc-100 gap-1 rounded-lg shrink-0 self-start md:self-center"
                    title="Revert this specific adjustment"
                  >
                    <RotateCcw size={11} />
                    Revert Diff
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detailed Expanded History Link */}
        {expanded && decisionHistory.length > 3 && (
          <div className="pt-2 text-center">
            <Link
              to="/decision-history"
              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-950 hover:underline"
            >
              <span>View all {decisionHistory.length} audit entries in Decision History</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
};
