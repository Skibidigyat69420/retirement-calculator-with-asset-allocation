import { useMemo } from 'react';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2, Target, Sparkles, Clock, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { requiredMonthlySIPForGoal } from '../lib/goals';

export const Retirement = () => {
  const { inputs, wealthResult, riskProfile, updateInputs, updateSIP, updateSWP, showToast } = useCalculator();

  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);

  const monthlyNeedAtRetirement = useMemo(
    () => inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, yearsToRetirement),
    [inputs.swp.monthlyNeedToday, inputs.inflation, yearsToRetirement],
  );

  const projectedCorpusAtRetirement = useMemo(() => {
    const retSnapshot = wealthResult.snapshots.find(s => s.age === inputs.retirementAge)
      || wealthResult.snapshots.filter(s => s.phase === 'accumulation').slice(-1)[0];
    return retSnapshot?.total || 0;
  }, [wealthResult.snapshots, inputs.retirementAge]);

  const requiredCorpus = useMemo(() => {
    const annualNeedAtRetirement = (monthlyNeedAtRetirement * 12) / (1 - inputs.swp.taxRate / 100);
    const postRetReturn = inputs.swp.postRetirementReturn / 100;
    const infl = inputs.inflation / 100;
    const realReturn = (1 + postRetReturn) / (1 + infl) - 1;
    const distributionYears = inputs.lifeExpectancy - inputs.retirementAge;
    
    if (realReturn <= 0) return annualNeedAtRetirement * distributionYears;
    return (
      (annualNeedAtRetirement * (1 - Math.pow(1 + realReturn, -distributionYears))) /
      realReturn
    );
  }, [monthlyNeedAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation, inputs.lifeExpectancy, inputs.retirementAge, inputs.swp.taxRate]);

  const gap = projectedCorpusAtRetirement - requiredCorpus;
  const successRate = wealthResult.monteCarlo.successRate * 100;
  const shortfall = Math.abs(gap);
  const blendedReturn = (inputs.sip.equitySplit * inputs.sip.equityReturn + inputs.sip.debtSplit * inputs.sip.debtReturn) / 100;

  const extraSIPNeeded = useMemo(() => {
    if (gap >= 0 || yearsToRetirement <= 0) return 0;
    return Math.round(requiredMonthlySIPForGoal(shortfall, yearsToRetirement, blendedReturn));
  }, [gap, yearsToRetirement, blendedReturn, shortfall]);

  const recommendedDelayAge = Math.min(inputs.lifeExpectancy - 5, inputs.retirementAge + 3);

  const sustainableMonthlyNeed = useMemo(() => {
    if (gap >= 0 || requiredCorpus <= 0) return inputs.swp.monthlyNeedToday;
    return Math.round(Math.max(10000, (projectedCorpusAtRetirement / requiredCorpus) * inputs.swp.monthlyNeedToday));
  }, [gap, requiredCorpus, projectedCorpusAtRetirement, inputs.swp.monthlyNeedToday]);

  const chartData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        nominal: s.total,
        real: s.realTotal,
        phase: s.phase,
      })),
    [wealthResult.snapshots],
  );

  const drawdownChartData = useMemo(
    () =>
      wealthResult.snapshots
        .filter((s) => s.phase === 'distribution')
        .map((s) => ({ label: `Age ${s.age}`, corpus: s.total })),
    [wealthResult.snapshots],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Retirement Readiness"
        subtitle="A unified FIRE-style check powered by the master wealth engine: projected corpus vs. what you actually need."
        badge="Planning"
      />

      {!wealthResult.sustainable && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is not sustainable.</strong> Corpus is projected to deplete at age {wealthResult.depletionAge}. Review the shortfall solver below to balance your plan.
          </div>
        </div>
      )}

      {gap < 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-gold" />
            <h3 className="text-base font-serif font-bold text-navy">
              Advisory Shortfall Solver — How to Close the Gap of {formatCurrency(shortfall)}
            </h3>
          </div>
          <p className="text-xs text-stone-600 mb-4">
            Select any of the three recommended actions to immediately align your plan with full retirement sustainability:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lever 1: Increase SIP */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <DollarSign size={14} className="text-gold" /> Option 1: Increase SIP
                </div>
                <p className="text-xs text-stone-600">
                  Boost monthly SIP by <strong>+{formatCurrency(extraSIPNeeded)}</strong> (to <strong>{formatCurrency(inputs.sip.amount + extraSIPNeeded)}</strong>/mo).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => {
                  updateSIP({ amount: inputs.sip.amount + extraSIPNeeded });
                  showToast(`Monthly SIP increased to ${formatCurrency(inputs.sip.amount + extraSIPNeeded)}!`, 'success');
                }}
              >
                Apply SIP Increase
              </Button>
            </div>

            {/* Lever 2: Delay Retirement */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <Clock size={14} className="text-gold" /> Option 2: Extend Horizon
                </div>
                <p className="text-xs text-stone-600">
                  Delay retirement by 3 years to age <strong>{recommendedDelayAge}</strong> to allow longer compounding.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => {
                  updateInputs({ retirementAge: recommendedDelayAge });
                  showToast(`Retirement age shifted to ${recommendedDelayAge}!`, 'success');
                }}
              >
                Retire at Age {recommendedDelayAge}
              </Button>
            </div>

            {/* Lever 3: Calibrate Drawdown */}
            <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <Target size={14} className="text-gold" /> Option 3: Calibrate Spend
                </div>
                <p className="text-xs text-stone-600">
                  Adjust retirement drawdown to sustainable level: <strong>{formatCurrency(sustainableMonthlyNeed)}</strong>/mo today.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={() => {
                  updateSWP({ monthlyNeedToday: sustainableMonthlyNeed });
                  showToast(`Retirement drawdown updated to ${formatCurrency(sustainableMonthlyNeed)}/mo!`, 'success');
                }}
              >
                Set Sustainable Spend
              </Button>
            </div>
          </div>
        </Card>
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
            <NumberInput label="Life Expectancy" value={inputs.lifeExpectancy} onChange={(v) => updateInputs({ lifeExpectancy: v })} />
            <NumberInput label="Monthly Expenditure" value={inputs.monthlyExpenditure} onChange={(v) => updateInputs({ monthlyExpenditure: v })} helper="Current lifestyle spend" />
            <NumberInput label="Monthly Need at Retirement" value={inputs.swp.monthlyNeedToday} onChange={(v) => updateSWP({ monthlyNeedToday: v })} helper="Target retirement drawdown" />
            <NumberInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
            <NumberInput label="Inflation" value={inputs.inflation} onChange={(v) => updateInputs({ inflation: v })} suffix="%" />
            <NumberInput label="Post-Retirement Return" value={inputs.swp.postRetirementReturn} onChange={(v) => updateSWP({ postRetirementReturn: v })} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Projected Corpus" value={formatCurrency(projectedCorpusAtRetirement)} variant="navy" />
            <MetricCard label="Required Corpus" value={formatCurrency(requiredCorpus)} variant="gold" />
            <MetricCard
              label="Gap"
              value={formatCurrency(gap)}
              subtext={gap >= 0 ? 'Surplus' : 'Shortfall'}
              variant={gap >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              label="Life Expectancy"
              value={`${inputs.lifeExpectancy} yrs`}
              subtext={`${inputs.lifeExpectancy - inputs.retirementAge} yrs distribution`}
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
              <TrendingUp size={18} className="text-gold" /> Wealth Trajectory
            </h3>
            <NominalRealChart data={chartData} xKey="label" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-gold" /> Distribution Phase
            </h3>
            <SWPDrawdownChart data={drawdownChartData} />
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
                    <strong className="text-green-600">{formatCurrency(projectedCorpusAtRetirement)}</strong>{' '}
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
                      {formatCurrency(projectedCorpusAtRetirement)}
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
                <span>Monthly expenditure</span>
                <span className="font-medium">{formatCurrency(inputs.monthlyExpenditure)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net savings rate</span>
                <span className="font-medium">{formatPercent(wealthResult.savingsRate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual savings</span>
                <span className="font-medium">{formatCurrency(wealthResult.annualSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual invested</span>
                <span className="font-medium">{formatCurrency(wealthResult.annualInvested)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <WorkflowFooter
        prev={{ path: '/goal', label: 'Goals Planner' }}
        next={{ path: '/allocation', label: 'Asset Allocation' }}
        flowHint="Accumulated retirement corpus and required drawdowns dictate strategic asset allocation."
      />
    </div>
  );
};
