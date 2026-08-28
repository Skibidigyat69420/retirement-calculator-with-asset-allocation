import { useMemo } from 'react';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency, formatPercent } from '../lib/formatters';

export const Retirement = () => {
  const { inputs, wealthResult, riskProfile, updateInputs, updateSIP, updateSWP } = useCalculator();

  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);

  const monthlyNeedAtRetirement = useMemo(
    () => inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, yearsToRetirement),
    [inputs.swp.monthlyNeedToday, inputs.inflation, yearsToRetirement],
  );

  const requiredCorpus = useMemo(() => {
    const annualNeed = monthlyNeedAtRetirement * 12;
    const postRetReturn = inputs.swp.postRetirementReturn / 100;
    const infl = inputs.inflation / 100;
    const realReturn = (1 + postRetReturn) / (1 + infl) - 1;
    if (realReturn <= 0) return annualNeed * 30;
    return annualNeed / realReturn;
  }, [monthlyNeedAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation]);

  const gap = wealthResult.terminalValue - requiredCorpus;
  const successRate = wealthResult.monteCarlo.successRate * 100;

  const chartData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'accumulation')
        .map((s) => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal })),
    [wealthResult.snapshots],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Retirement Readiness"
        subtitle="A unified FIRE-style check powered by the master wealth engine: projected corpus vs. what you actually need."
        badge="Standalone"
      />

      {!wealthResult.sustainable && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is not sustainable.</strong> Corpus is projected to deplete at age {wealthResult.depletionAge}. Increase SIP, delay retirement, or reduce monthly needs.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Calculator size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Current Age" value={inputs.currentAge} onChange={(v) => updateInputs({ currentAge: v })} />
            <NumberInput label="Retirement Age" value={inputs.retirementAge} onChange={(v) => updateInputs({ retirementAge: v })} />
            <NumberInput label="Monthly Expense Today" value={inputs.swp.monthlyNeedToday} onChange={(v) => updateSWP({ monthlyNeedToday: v })} />
            <NumberInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
            <NumberInput label="Inflation" value={inputs.inflation} onChange={(v) => updateInputs({ inflation: v })} suffix="%" />
            <NumberInput label="Post-Retirement Return" value={inputs.swp.postRetirementReturn} onChange={(v) => updateSWP({ postRetirementReturn: v })} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Projected Corpus" value={formatCurrency(wealthResult.terminalValue)} variant="navy" />
            <MetricCard label="Required Corpus" value={formatCurrency(requiredCorpus)} variant="gold" />
            <MetricCard
              label="Gap"
              value={formatCurrency(gap)}
              subtext={gap >= 0 ? 'Surplus' : 'Shortfall'}
              variant={gap >= 0 ? 'success' : 'danger'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Monthly Need at Retirement" value={formatCurrency(monthlyNeedAtRetirement)} subtext="Inflation-adjusted" />
            <MetricCard
              label="Plan Success Rate"
              value={formatPercent(successRate)}
              subtext="Monte Carlo"
              variant={successRate >= riskProfile.goalSuccessThreshold ? 'success' : successRate >= riskProfile.goalSuccessThreshold * 0.6 ? 'default' : 'danger'}
            />
            <MetricCard
              label="Depletion Age"
              value={wealthResult.sustainable ? 'Sustainable' : `${wealthResult.depletionAge}`}
              subtext={wealthResult.sustainable ? 'Outlasts life expectancy' : 'Corpus runs out early'}
              variant={wealthResult.sustainable ? 'success' : 'danger'}
            />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" /> Accumulation Trajectory
            </h3>
            <NominalRealChart data={chartData} xKey="label" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Readiness Verdict</h3>
            <div className="flex items-start gap-3 mb-4">
              {gap >= 0 && successRate >= riskProfile.goalSuccessThreshold ? (
                <>
                  <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                  <p className="text-stone-600 leading-relaxed">
                    By age <strong>{inputs.retirementAge}</strong>, your monthly expense of{' '}
                    <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today will inflate to{' '}
                    <strong>{formatCurrency(monthlyNeedAtRetirement)}</strong>. Your projected corpus of{' '}
                    <strong className="text-green-600">{formatCurrency(wealthResult.terminalValue)}</strong>{' '}
                    exceeds the required corpus of <strong>{formatCurrency(requiredCorpus)}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <Target size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-stone-600 leading-relaxed">
                    By age <strong>{inputs.retirementAge}</strong>, your monthly expense of{' '}
                    <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today will inflate to{' '}
                    <strong>{formatCurrency(monthlyNeedAtRetirement)}</strong>. Your projected corpus is{' '}
                    <strong className={gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(wealthResult.terminalValue)}
                    </strong>{' '}
                    against a required corpus of <strong>{formatCurrency(requiredCorpus)}</strong>.
                  </p>
                </>
              )}
            </div>
            <div className="p-4 bg-stone-50 rounded-xl text-sm text-stone-600 space-y-2">
              <div className="flex justify-between">
                <span>Success threshold</span>
                <Badge variant="outline">{formatPercent(riskProfile.goalSuccessThreshold)}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Current savings rate</span>
                <span className="font-medium">{formatPercent(wealthResult.savingsRate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual savings</span>
                <span className="font-medium">{formatCurrency(wealthResult.annualSavings)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
