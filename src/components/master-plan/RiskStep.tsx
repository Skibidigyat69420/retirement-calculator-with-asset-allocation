import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  PieChart,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DonutChart } from '../charts/DonutChart';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import type { MasterPlanInputs, RiskProfile, AssetCategory } from '../../types';

interface RiskStepProps {
  inputs: MasterPlanInputs;
  riskProfile: RiskProfile;
  riskScore: number;
  manualTargets: Record<AssetCategory, number> | null;
  setManualTargets?: (targets: Record<AssetCategory, number> | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export const RiskStep = ({
  inputs,
  riskProfile,
  riskScore,
  manualTargets,
  setManualTargets: _setManualTargets,
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

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Risk Profile & Strategic Asset Allocation</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Calibrate client risk tolerance, policy asset allocation targets, maximum tolerable portfolio drawdowns, and the equity glidepath into retirement.
        </p>
      </Card>

      {/* Risk Profile Card */}
      <Card className="border border-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-ink capitalize">
                {riskProfile.label} Profile
              </span>
              <Badge variant="navy" className="text-xs font-mono font-bold">
                Score {riskScore}/100
              </Badge>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              {riskProfile.description}
            </p>
          </div>

          <Link
            to="/risk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sunken hover:bg-surface border border-border text-xs font-semibold text-ink transition-all shrink-0"
          >
            <span>Retake 15-Q Questionnaire</span>
            <ExternalLink size={13} />
          </Link>
        </div>

        {/* Quant Risk Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-sunken border border-border">
            <span className="text-[10px] uppercase font-bold text-muted block">Equity Ceiling</span>
            <span className="text-base font-bold font-mono text-ink">{riskProfile.maxEquity}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-sunken border border-border">
            <span className="text-[10px] uppercase font-bold text-muted block">Equity Floor</span>
            <span className="text-base font-bold font-mono text-ink">{riskProfile.minEquity}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-sunken border border-border">
            <span className="text-[10px] uppercase font-bold text-muted block">Max Drawdown</span>
            <span className="text-base font-bold font-mono text-negative">-{riskProfile.maxDrawdown}%</span>
          </div>

          <div className="p-3.5 rounded-xl bg-sunken border border-border">
            <span className="text-[10px] uppercase font-bold text-muted block">Retirement Glidepath</span>
            <span className="text-base font-bold font-mono text-accent">{riskProfile.equityAtRetirement}% Eq</span>
          </div>
        </div>
      </Card>

      {/* Target vs Actual Allocation Comparison */}
      <Card className="border border-border space-y-5">
        <h4 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-3">
          <PieChart size={16} className="text-accent" />
          Strategic Target Allocation vs. Current Portfolio Reality
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Target Chart */}
          <div className="p-4 rounded-xl bg-sunken border border-border space-y-2 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-ink block">
              Policy Target Weights
            </span>
            <div className="h-44 flex items-center justify-center">
              <DonutChart data={targetChartData} />
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2 text-[11px]">
              {targetChartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 font-medium text-ink">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: <strong className="font-mono">{d.value}%</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Actual Chart */}
          <div className="p-4 rounded-xl bg-sunken border border-border space-y-2 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-ink block">
              Current Portfolio Breakdown
            </span>
            <div className="h-44 flex items-center justify-center">
              <DonutChart data={actualChartData} />
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2 text-[11px]">
              {actualChartData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 font-medium text-ink">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: <strong className="font-mono">{d.value}%</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft size={15} />
            <span>Back: Goals</span>
          </Button>
          <Button onClick={onNext} className="flex items-center gap-2">
            <span>Next: Market Assumptions</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
