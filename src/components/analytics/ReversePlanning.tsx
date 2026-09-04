import { useState, useMemo } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
import { Slider } from '../ui/Slider';
import { CurrencyInput } from '../ui/CurrencyInput';
import { runReversePlanning } from '../../lib/reversePlanning';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { ReversePathway } from '../../types';

export const ReversePlanning = () => {
  const { inputs, wealthResult, updateInputs, showToast, logDecision } = useCalculator();

  const currentWealth = wealthResult.netWorth > 0 ? wealthResult.netWorth : 15000000;
  const initialTargetCorpus = Math.max(
    50000000,
    Math.round(((wealthResult.terminalValue || currentWealth * 2.5) * 1.15) / 1000000) * 1000000,
  );

  const [targetCorpus, setTargetCorpus] = useState<number>(initialTargetCorpus);
  const [targetAge, setTargetAge] = useState<number>(Math.max(inputs.currentAge + 1, inputs.retirementAge));
  const [appliedPathway, setAppliedPathway] = useState<string | null>(null);

  const result = useMemo(() => {
    return runReversePlanning(inputs, wealthResult, {
      targetCorpus,
      targetAge,
    });
  }, [inputs, wealthResult, targetCorpus, targetAge]);

  const handleApplyPathway = (pathway: ReversePathway) => {
    updateInputs(pathway.patch);
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Reverse Planning: ${pathway.name}`,
      summary: `${pathway.primaryAction} to achieve ${formatCurrencyCompact(targetCorpus)} target corpus.`,
      newValue: `${formatCurrencyCompact(pathway.targetCorpus)} Target`,
      rationale: pathway.tradeOffDescription,
      author: 'Adviser',
      revertPatch: {
        retirementAge: inputs.retirementAge,
        sip: { ...inputs.sip },
        swp: { ...inputs.swp },
      },
    });
    setAppliedPathway(pathway.id);
    showToast(`Applied "${pathway.name}" to Master Plan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-900 text-white rounded-lg">
                <Compass size={18} />
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-900 tracking-tight">
                Reverse Financial Planning Engine
              </h3>
              <Badge variant="gold" className="text-[10px] uppercase font-mono">
                Target Solver
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Specify your target retirement milestone, and the quantitative engine solves for the required savings, capital, and returns across 4 actionable pathways.
            </p>
          </div>
        </div>

        {/* Target Milestone Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
          <div className="space-y-2">
            <CurrencyInput
              label="Target Retirement Corpus Milestone"
              value={targetCorpus}
              onChange={setTargetCorpus}
              helper={`Currently projected: ${formatCurrencyCompact(wealthResult.terminalValue)}`}
            />
            <div className="flex gap-2 pt-1">
              {[50000000, 75000000, 100000000, 150000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetCorpus(amt)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors ${
                    targetCorpus === amt
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {formatCurrencyCompact(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Slider
              label="Target Retirement Age"
              value={targetAge}
              onChange={setTargetAge}
              min={inputs.currentAge + 1}
              max={Math.min(75, inputs.lifeExpectancy - 5)}
              step={1}
              suffix=" yrs old"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Current Age: {inputs.currentAge}</span>
              <span className="font-semibold text-slate-700">{result.yearsToTarget} Years Compounding</span>
              <span>Life Exp: {inputs.lifeExpectancy}</span>
            </div>
          </div>
        </div>

        {/* Topline Diagnostic Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Required Monthly SIP"
            value={formatCurrency(result.requiredMonthlySip)}
            subtext={`At ${inputs.sip.stepUp}% step-up`}
            icon={<TrendingUp size={16} />}
            variant="gold"
          />
          <MetricCard
            label="Required Capital Today"
            value={formatCurrencyCompact(result.requiredInitialCorpus)}
            subtext={`If keeping current SIP`}
            icon={<DollarSign size={16} />}
          />
          <MetricCard
            label="Max Sustainable Spend"
            value={`${formatCurrency(result.maxSustainableMonthlySpend)}/mo`}
            subtext={`During retirement (inflation-indexed)`}
            icon={<ShieldCheck size={16} />}
            variant="success"
          />
          <MetricCard
            label="Feasible Age at Current SIP"
            value={`Age ${result.feasibleRetirementAge}`}
            subtext={`Without increasing savings`}
            icon={<Clock size={16} />}
          />
        </div>
      </Card>

      {/* 4 Actionable Strategic Pathways */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Strategic Implementation Pathways
            </h4>
            <p className="text-xs text-slate-500">
              Multiple trade-off avenues to reach {formatCurrencyCompact(targetCorpus)}:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.pathways.map((p) => {
            const isApplied = appliedPathway === p.id;
            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between border transition-all ${
                  isApplied
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {p.tagline}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">{p.name}</h4>
                    </div>
                    <Badge variant={p.successProbability >= 94 ? 'success' : 'navy'} className="text-[10px] font-mono shrink-0">
                      {p.successProbability}% Success
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed">
                    {p.summary}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Monthly SIP</span>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(p.requiredSipMonthly)}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Retirement Age</span>
                      <span className="font-bold font-mono text-slate-900">Age {p.projectedRetirementAge}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Post-Ret Spend</span>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(p.monthlyRetirementSpending)}/mo</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 leading-snug">
                    <strong className="text-slate-700">Trade-Off Analysis:</strong> {p.tradeOffDescription}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">{p.primaryAction}</span>
                  <Button
                    size="sm"
                    variant={isApplied ? 'outline' : 'primary'}
                    onClick={() => handleApplyPathway(p)}
                    className={
                      isApplied
                        ? 'border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs'
                        : 'bg-slate-900 text-white hover:bg-slate-800 text-xs'
                    }
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
                        Applied to Plan
                      </>
                    ) : (
                      <>
                        Apply Pathway <ArrowRight size={13} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
