import { useState } from 'react';
import { ArrowRight, Save, Loader2 } from 'lucide-react';
import { FinancialMetric } from '../ui/FinancialMetric';
import { Button } from '../ui/Button';
import { guardNumber } from '../../lib/planState';
import { calculateRetirementCorpus } from '../../lib/calculators';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import type { MasterPlanInputs } from '../../types';
import type { WealthEngineResult } from '../../lib/wealthEngine';

interface MasterPlanSummaryProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
  totalLiabilities: number;
  netBalanceSheet: number;
  debtToAssetRatio: number;
  hasRiskAnswers?: boolean;
  onSavePlan: () => Promise<void>;
  onViewDetails?: () => void;
}

export const MasterPlanSummary = ({
  inputs,
  wealthResult,
  hasRiskAnswers,
  onSavePlan,
  onViewDetails,
}: MasterPlanSummaryProps) => {
  const [saving, setSaving] = useState(false);

  const configured = wealthResult.isConfigured;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSavePlan();
    } finally {
      setSaving(false);
    }
  };

  // Projected terminal wealth
  const projected = configured ? guardNumber(wealthResult.terminalValue) : null;

  // Required retirement corpus (math lives in src/lib/calculators)
  const requiredCorpus = configured
    ? calculateRetirementCorpus(
        inputs.currentAge,
        inputs.retirementAge,
        inputs.lifeExpectancy,
        inputs.swp.monthlyNeedToday,
        inputs.inflation,
        inputs.swp.postRetirementReturn,
      ).requiredCorpus
    : null;
  const required =
    configured && inputs.swp.monthlyNeedToday > 0 ? guardNumber(requiredCorpus) : null;

  // Goal funding ratio
  const funding =
    configured && inputs.goals.length > 0
      ? guardNumber(wealthResult.overallGoalSuccessRate * 100)
      : null;

  // Monte Carlo solvency probability — suppressed until the risk
  // questionnaire is answered (the score-50 fallback is internal only).
  const probability =
    configured && hasRiskAnswers ? guardNumber(wealthResult.monteCarlo.successRate * 100) : null;

  const metrics = [
    {
      label: 'Projected',
      value: projected === null ? null : formatCurrencyCompact(projected),
      hint: configured ? `Terminal wealth at age ${inputs.lifeExpectancy || '—'}` : undefined,
    },
    {
      label: 'Required',
      value: required === null ? null : formatCurrencyCompact(required),
      hint: required !== null ? 'Retirement corpus needed' : undefined,
    },
    {
      label: 'Funding',
      value: funding === null ? null : formatPercent(funding, 0),
      hint: funding !== null ? `${inputs.goals.length} goal${inputs.goals.length === 1 ? '' : 's'} funded` : undefined,
    },
    {
      label: 'Probability',
      value: probability === null ? null : formatPercent(probability, 0),
      hint: probability !== null ? 'Monte Carlo solvency' : undefined,
    },
  ];

  return (
    <div className="space-y-0 border-l border-border pl-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">Plan Outlook</span>
        <span className="font-mono text-[10px] text-faint tabular-nums">
          {new Date().getFullYear()}
        </span>
      </div>

      <div className="mt-4 divide-y divide-border border-t border-border">
        {metrics.map((m) => (
          <div key={m.label} className="py-3.5">
            <FinancialMetric label={m.label} value={m.value} size="sm" hint={m.hint} />
          </div>
        ))}
      </div>

      {!configured && (
        <p className="py-3 text-xs text-faint leading-relaxed border-t border-border">
          Complete the profile to see your outlook.
        </p>
      )}

      <div className="py-3 border-t border-border space-y-2">
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-strong transition-colors cursor-pointer"
          >
            View details
            <ArrowRight
              size={13}
              strokeWidth={1.8}
              aria-hidden="true"
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </button>
        )}

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={13} aria-hidden="true" />
            )}
            <span>{saving ? 'Saving…' : 'Save plan'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
