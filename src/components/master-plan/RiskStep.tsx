import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { DonutChart } from '../charts/DonutChart';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import type { MasterPlanInputs, RiskProfile, AssetCategory } from '../../types';

interface RiskStepProps {
  inputs: MasterPlanInputs;
  riskProfile: RiskProfile;
  riskScore: number;
  hasRiskAnswers?: boolean;
  manualTargets: Record<AssetCategory, number> | null;
  setManualTargets?: (targets: Record<AssetCategory, number> | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export const RiskStep = ({
  inputs,
  riskProfile,
  riskScore,
  hasRiskAnswers,
  manualTargets,
  onNext,
  onBack,
}: RiskStepProps) => {
  // Current actual asset weights
  const totalAssets = inputs.assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  const actualWeights: Record<AssetCategory, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    realestate: 0,
    liquid: 0,
    other: 0,
  };

  if (totalAssets > 0) {
    inputs.assets.forEach((a) => {
      actualWeights[a.category] = (actualWeights[a.category] || 0) + (a.value / totalAssets) * 100;
    });
  }

  const effectiveTargets = manualTargets || riskProfile.targets;

  const targetChartData = (['equity', 'debt', 'gold', 'realestate', 'liquid'] as AssetCategory[])
    .map((cat) => ({
      name: ASSET_LABELS[cat],
      value: Math.round(effectiveTargets[cat] || 0),
      color: ASSET_COLORS[cat],
    }))
    .filter((d) => d.value > 0);

  const actualChartData = (['equity', 'debt', 'gold', 'realestate', 'liquid'] as AssetCategory[])
    .map((cat) => ({
      name: ASSET_LABELS[cat],
      value: Math.round(actualWeights[cat] || 0),
      color: ASSET_COLORS[cat],
    }))
    .filter((d) => d.value > 0);

  const answered = hasRiskAnswers !== false;

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 05 · Risk</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Risk & allocation</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Risk tolerance, policy asset-allocation targets, tolerable drawdown, and the equity glidepath into retirement.
        </p>
      </header>

      {/* Risk profile — or questionnaire guidance when unanswered */}
      <section className="border-t border-border pt-6">
        {answered ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-display text-2xl text-ink capitalize">
                    {riskProfile.label} profile
                  </h3>
                  <span className="font-mono text-[11px] text-faint tabular-nums">
                    Score {riskScore}/100
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-xl">
                  {riskProfile.description}
                </p>
              </div>
              <Link
                to="/risk"
                className="inline-flex items-center gap-1.5 px-3 min-h-8 py-1.5 text-xs font-medium rounded-md border border-border text-ink-soft hover:border-border-strong hover:bg-surface transition-colors shrink-0"
              >
                <span>Retake questionnaire</span>
                <ExternalLink size={13} aria-hidden="true" />
              </Link>
            </div>

            {/* Quant risk parameters — hairline rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mt-6 border-t border-b border-border divide-x divide-border max-sm:divide-x-0">
              {[
                { label: 'Equity ceiling', value: `${riskProfile.maxEquity}%` },
                { label: 'Equity floor', value: `${riskProfile.minEquity}%` },
                { label: 'Max drawdown', value: `-${riskProfile.maxDrawdown}%` },
                { label: 'Equity at retirement', value: `${riskProfile.equityAtRetirement}%` },
              ].map((p) => (
                <div key={p.label} className="py-4 px-4 first:pl-0">
                  <span className="eyebrow block">{p.label}</span>
                  <span className="block mt-1.5 font-mono text-lg tabular-nums text-ink">
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} strokeWidth={1.7} className="text-muted shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-[15px] font-semibold text-ink tracking-tight">
                  Risk questionnaire not completed
                </h3>
                <p className="mt-1 text-sm text-muted leading-relaxed max-w-xl">
                  The allocation targets below show the moderate baseline. Complete the 15-question
                  assessment to personalize policy weights, drawdown tolerance, and the retirement glidepath.
                </p>
              </div>
            </div>
            <Link
              to="/risk"
              className="inline-flex items-center gap-1.5 px-3 min-h-8 py-1.5 text-xs font-medium rounded-md border border-border-strong text-ink hover:border-ink hover:bg-surface transition-colors shrink-0"
            >
              <span>Take the assessment</span>
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      {/* Target vs actual allocation */}
      <section className="border-t border-border pt-6">
        <h3 className="text-[15px] font-semibold text-ink tracking-tight">
          Policy target vs. current portfolio
        </h3>
        {!answered && (
          <p className="mt-1 text-xs text-faint">
            Targets reflect the default moderate baseline until the questionnaire is completed.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 mt-6">
          <div>
            <span className="eyebrow">Policy targets</span>
            <div className="h-44 mt-3">
              <DonutChart data={targetChartData} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] text-muted">
              {targetChartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                  {d.name} <span className="font-mono tabular-nums text-ink">{d.value}%</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="eyebrow">Current portfolio</span>
            {actualChartData.length > 0 ? (
              <>
                <div className="h-44 mt-3">
                  <DonutChart data={actualChartData} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[11px] text-muted">
                  {actualChartData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                      {d.name} <span className="font-mono tabular-nums text-ink">{d.value}%</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-faint leading-relaxed">
                No assets recorded yet — add holdings in Step 02 to compare actual weights against policy.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Step navigation */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back · Goals</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Assumptions</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
