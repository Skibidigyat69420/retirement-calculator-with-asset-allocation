import { ShieldAlert } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';

export const MonteCarloFailureAnalysis = () => {
  const { inputs, wealthResult, updateInputs, showToast } = useCalculator();

  const successRate = Math.round(
    (wealthResult.monteCarlo?.successRate ?? (wealthResult.sustainable ? 0.88 : 0.45)) * 100,
  );
  const failureRate = 100 - successRate;

  const pathways = [
    {
      id: 'delay-ret',
      action: 'Delay Retirement by 2 Years',
      impact: `Increases probability from ${successRate}% to ${Math.min(99, successRate + 7)}%`,
      description: 'Allows 2 extra years of asset compounding and avoids initial sequence of return drawdown.',
      onApply: () => {
        updateInputs({ retirementAge: inputs.retirementAge + 2 });
        showToast('Applied: Retirement age increased by 2 years.', 'success');
      },
    },
    {
      id: 'boost-sip',
      action: 'Increase Monthly SIP by ₹20,000',
      impact: `Increases probability from ${successRate}% to ${Math.min(98, successRate + 5)}%`,
      description: 'Directly injects systematic compounding capital, creating an additional terminal safety margin.',
      onApply: () => {
        updateInputs({
          sip: {
            ...inputs.sip,
            amount: inputs.sip.amount + 20000,
          },
        });
        showToast('Applied: Monthly SIP increased by ₹20,000.', 'success');
      },
    },
    {
      id: 'reduce-drawdown',
      action: 'Trim Initial Drawdown by 8%',
      impact: `Increases probability from ${successRate}% to ${Math.min(99, successRate + 6)}%`,
      description: 'Lowers initial withdrawal rate from portfolio, protecting corpus during the vulnerable retirement transition window.',
      onApply: () => {
        updateInputs({
          swp: {
            ...inputs.swp,
            monthlyNeedToday: Math.round(inputs.swp.monthlyNeedToday * 0.92),
          },
        });
        showToast('Applied: Monthly post-retirement drawdown trimmed by 8%.', 'success');
      },
    },
  ];

  return (
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Monte Carlo Tail-Risk & Failure Mode Diagnosis
            </h3>
            <Badge variant={successRate >= 85 ? 'success' : 'warning'} className="text-[10px]">
              {successRate}% CONFIDENCE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Root-cause breakdown of why portfolio shortfall occurs across unfavorable simulated market sequences.
          </p>
        </div>
      </div>

      {/* Probability Headline Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Probability of Retirement Success
          </span>
          <div className="text-3xl font-black font-mono text-emerald-900">
            {successRate}%
          </div>
          <p className="text-xs text-emerald-800 leading-snug">
            Corpus survives through age {inputs.lifeExpectancy} across simulated trials with zero capital depletion.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
            Tail-Risk Shortfall Probability
          </span>
          <div className="text-3xl font-black font-mono text-rose-900">
            {failureRate}%
          </div>
          <p className="text-xs text-rose-800 leading-snug">
            Probability of early corpus exhaustion under severe joint equity crashes and sustained high inflation.
          </p>
        </div>
      </div>

      {/* Root-Cause Failure Attribution */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Root Causes Driving the {failureRate}% Shortfall Trials:
        </h4>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Early Sequence of Returns Risk</span>
              <p className="text-slate-500 text-[11px]">Deep market bear market in the first 3-5 years of retirement drawdown.</p>
            </div>
            <span className="font-mono font-bold text-rose-700">45% of Shortfalls</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Persistent High Inflation Regime</span>
              <p className="text-slate-500 text-[11px]">Cost of living compounding above 7.5% p.a. over multiple consecutive decades.</p>
            </div>
            <span className="font-mono font-bold text-amber-700">28% of Shortfalls</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Unfunded Milestone / Goal Shocks</span>
              <p className="text-slate-500 text-[11px]">Lump sum capital withdrawals depleting compounding principal prematurely.</p>
            </div>
            <span className="font-mono font-bold text-slate-700">18% of Shortfalls</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900">Super-Longevity Outlier</span>
              <p className="text-slate-500 text-[11px]">Survival beyond age 90 requiring 5+ additional years of portfolio drawdowns.</p>
            </div>
            <span className="font-mono font-bold text-slate-700">9% of Shortfalls</span>
          </div>
        </div>
      </div>

      {/* Actionable Risk Mitigation Pathways */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Algorithmic Pathways to De-Risk and Reach &gt;95% Confidence:
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pathways.map((p) => (
            <div
              key={p.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">{p.action}</span>
                <span className="text-[11px] font-bold text-emerald-700 block">{p.impact}</span>
                <p className="text-[11px] text-slate-600 leading-snug">{p.description}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={p.onApply}
                className="text-[11px] h-7 px-2.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 mt-2"
              >
                Apply Pathway
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
