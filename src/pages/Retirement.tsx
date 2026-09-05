import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2, Target, Sparkles, Clock, DollarSign, Umbrella, ArrowRight, ShieldCheck, Flame, Scale, Zap } from 'lucide-react';
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
import { calculateSWP, calculateSustainableSWP } from '../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { requiredMonthlySIPForGoal } from '../lib/goals';
import { RetirementSensitivityMatrix } from '../components/analytics/RetirementSensitivityMatrix';
import { StressTestSimulator } from '../components/analytics/StressTestSimulator';
import { MonteCarloFailureAnalysis } from '../components/analytics/MonteCarloFailureAnalysis';
import { ScenarioLab } from '../components/analytics/ScenarioLab';
import { cn } from '../lib/utils';

export const Retirement = () => {
  const { inputs, wealthResult, riskProfile, updateInputs, updateSIP, updateSWP, showToast } = useCalculator();
  const [showAllSchedule, setShowAllSchedule] = useState(false);

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
  const distributionYears = Math.max(0, inputs.lifeExpectancy - inputs.retirementAge);

  const extraSIPNeeded = useMemo(() => {
    if (gap >= 0 || yearsToRetirement <= 0) return 0;
    return Math.round(requiredMonthlySIPForGoal(shortfall, yearsToRetirement, blendedReturn));
  }, [gap, yearsToRetirement, blendedReturn, shortfall]);

  const maxDelayAge = Math.min(inputs.lifeExpectancy - 5, inputs.retirementAge + 3);
  const recommendedDelayAge = Math.max(inputs.retirementAge + 1, maxDelayAge);
  const delayYears = recommendedDelayAge - inputs.retirementAge;

  // Annuity-based sustainable drawdown: the largest monthly withdrawal today's
  // corpus trajectory can support through life expectancy, deflated to today's ₹.
  const sustainableMonthlyNeed = useMemo(() => {
    const { monthlyWithdrawal } = calculateSustainableSWP(
      projectedCorpusAtRetirement,
      inputs.swp.postRetirementReturn,
      inputs.inflation,
      inputs.swp.taxRate,
      distributionYears,
    );
    if (projectedCorpusAtRetirement <= 0 || monthlyWithdrawal <= 0) return 0;
    return Math.round(Math.max(10000, monthlyWithdrawal / Math.pow(1 + inputs.inflation / 100, yearsToRetirement)));
  }, [projectedCorpusAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation, inputs.swp.taxRate, distributionYears, yearsToRetirement]);

  // Post-retirement SWP plan on the projected corpus at retirement.
  const swpPlan = useMemo(
    () =>
      calculateSWP(
        projectedCorpusAtRetirement,
        monthlyNeedAtRetirement,
        inputs.swp.postRetirementReturn,
        inputs.inflation,
        inputs.swp.taxRate,
        Math.max(distributionYears, 1),
      ),
    [projectedCorpusAtRetirement, monthlyNeedAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation, inputs.swp.taxRate, distributionYears],
  );

  const grossAnnualAtRetirement = (monthlyNeedAtRetirement * 12) / (1 - inputs.swp.taxRate / 100);
  const swpWithdrawalRate = projectedCorpusAtRetirement > 0 ? (grossAnnualAtRetirement / projectedCorpusAtRetirement) * 100 : 0;

  const sustainableAtRetirement = useMemo(
    () =>
      calculateSustainableSWP(
        projectedCorpusAtRetirement,
        inputs.swp.postRetirementReturn,
        inputs.inflation,
        inputs.swp.taxRate,
        distributionYears,
      ),
    [projectedCorpusAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation, inputs.swp.taxRate, distributionYears],
  );

  const depletionProbability = useMemo(() => {
    const outcomes = wealthResult.monteCarlo.outcomes;
    if (!outcomes.length) return 0;
    return (outcomes.filter((o) => o.depletionAge !== null).length / outcomes.length) * 100;
  }, [wealthResult.monteCarlo.outcomes]);

  const scheduleRows = showAllSchedule || swpPlan.yearlyData.length <= 15
    ? swpPlan.yearlyData
    : [...swpPlan.yearlyData.slice(0, 10), swpPlan.yearlyData[swpPlan.yearlyData.length - 1]];

  const [simulatedInflation, setSimulatedInflation] = useState<number>(inputs.inflation);

  const simulatedMonthlyNeedAtRetirement = useMemo(
    () => inputs.swp.monthlyNeedToday * Math.pow(1 + simulatedInflation / 100, yearsToRetirement),
    [inputs.swp.monthlyNeedToday, simulatedInflation, yearsToRetirement],
  );

  const simulatedSWPPlan = useMemo(
    () =>
      calculateSWP(
        projectedCorpusAtRetirement,
        simulatedMonthlyNeedAtRetirement,
        inputs.swp.postRetirementReturn,
        simulatedInflation,
        inputs.swp.taxRate,
        Math.max(distributionYears, 1),
      ),
    [projectedCorpusAtRetirement, simulatedMonthlyNeedAtRetirement, inputs.swp.postRetirementReturn, simulatedInflation, inputs.swp.taxRate, distributionYears],
  );

  // Longevity Gauge calculations
  const totalLifespanSpan = Math.max(1, inputs.lifeExpectancy - inputs.currentAge);
  const accumulationSpan = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const accumulationPct = (accumulationSpan / totalLifespanSpan) * 100;
  const fundedRetirementSpan = wealthResult.sustainable
    ? distributionYears
    : Math.max(0, (wealthResult.depletionAge ?? inputs.retirementAge) - inputs.retirementAge);
  const fundedRetirementPct = (fundedRetirementSpan / totalLifespanSpan) * 100;
  const shortfallSpan = wealthResult.sustainable
    ? 0
    : Math.max(0, inputs.lifeExpectancy - (wealthResult.depletionAge ?? inputs.retirementAge));
  const shortfallPct = (shortfallSpan / totalLifespanSpan) * 100;

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

  const drawdownChartData = useMemo(() => {
    return swpPlan.yearlyData.map((d) => ({
      label: `Age ${inputs.retirementAge + d.year}`,
      corpus: d.corpusLeft,
      withdrawal: d.withdrawn,
    }));
  }, [swpPlan.yearlyData, inputs.retirementAge]);

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
        <Card className="border-zinc-200 bg-zinc-50/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-zinc-600" />
            <h3 className="text-base font-serif font-bold text-navy">
              Advisory Shortfall Solver — How to Close the Gap of {formatCurrency(shortfall)}
            </h3>
          </div>
          <p className="text-xs text-zinc-600 mb-4">
            Select any of the three recommended actions to immediately align your plan with full retirement sustainability:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lever 1: Increase SIP */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <DollarSign size={14} className="text-zinc-600" /> Option 1: Increase SIP
                </div>
                <p className="text-xs text-zinc-600">
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
            <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <Clock size={14} className="text-zinc-600" /> Option 2: Extend Horizon
                </div>
                <p className="text-xs text-zinc-600">
                  Delay retirement by {delayYears} year{delayYears === 1 ? '' : 's'} to age <strong>{recommendedDelayAge}</strong> to allow longer compounding.
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
            <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy mb-1">
                  <Target size={14} className="text-zinc-600" /> Option 3: Calibrate Spend
                </div>
                <p className="text-xs text-zinc-600">
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

      {/* Longevity & Solvency Horizon Gauge Card */}
      <Card className="bg-white border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-zinc-700" />
              <h3 className="text-base font-bold text-zinc-950">Longevity & Solvency Horizon Gauge</h3>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Visual lifespan comparison: accumulation vs funded distribution solvency vs early depletion boundary.
            </p>
          </div>
          <Badge variant={wealthResult.sustainable ? 'success' : 'danger'} className="text-xs font-semibold px-2.5 py-1">
            {wealthResult.sustainable ? 'Fully Solvent' : `Depletes at Age ${wealthResult.depletionAge}`}
          </Badge>
        </div>

        {/* Visual Multi-Segment Lifespan Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-zinc-500">
            <span>Age {inputs.currentAge} (Now)</span>
            <span>Age {inputs.retirementAge} (Retirement)</span>
            {!wealthResult.sustainable && wealthResult.depletionAge && (
              <span className="text-rose-600 font-bold">Age {wealthResult.depletionAge} (Depleted)</span>
            )}
            <span>Age {inputs.lifeExpectancy} (Life Exp.)</span>
          </div>

          <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner border border-zinc-200/80">
            {/* Accumulation Phase */}
            <div
              className="bg-zinc-800 transition-all relative group flex items-center justify-center text-[10px] font-bold text-zinc-200"
              style={{ width: `${Math.max(5, accumulationPct)}%` }}
              title={`Accumulation: Age ${inputs.currentAge} to ${inputs.retirementAge} (${yearsToRetirement} yrs)`}
            >
              <span className="truncate px-1">Accumulation ({yearsToRetirement}y)</span>
            </div>

            {/* Funded Distribution Phase */}
            <div
              className="bg-emerald-500 transition-all relative group flex items-center justify-center text-[10px] font-bold text-emerald-950"
              style={{ width: `${Math.max(5, fundedRetirementPct)}%` }}
              title={`Funded Retirement: Age ${inputs.retirementAge} to ${wealthResult.sustainable ? inputs.lifeExpectancy : wealthResult.depletionAge} (${fundedRetirementSpan} yrs)`}
            >
              <span className="truncate px-1">Funded SWP ({fundedRetirementSpan}y)</span>
            </div>

            {/* Shortfall Phase (if depleted early) */}
            {shortfallSpan > 0 && (
              <div
                className="bg-rose-500 transition-all relative group flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${Math.max(5, shortfallPct)}%` }}
                title={`Unfunded Shortfall: Age ${wealthResult.depletionAge} to ${inputs.lifeExpectancy} (${shortfallSpan} yrs)`}
              >
                <span className="truncate px-1">Gap ({shortfallSpan}y)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-zinc-800 inline-block" />
              Accumulation Horizon ({yearsToRetirement} yrs)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              Funded Distribution ({fundedRetirementSpan} yrs)
            </span>
            {shortfallSpan > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Unfunded Shortfall ({shortfallSpan} yrs)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 size={12} /> Full {distributionYears}y Solvency Buffer
              </span>
            )}
          </div>
        </div>

        {/* 3 Executive Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Accumulation Window</div>
            <div className="text-xl font-bold font-mono text-zinc-950 mt-1">{yearsToRetirement} Years</div>
            <div className="text-xs text-zinc-500 mt-0.5">SIP & active wealth compounding</div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Distribution Horizon</div>
            <div className="text-xl font-bold font-mono text-zinc-950 mt-1">{distributionYears} Years</div>
            <div className="text-xs text-zinc-500 mt-0.5">From age {inputs.retirementAge} to {inputs.lifeExpectancy}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70">
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Corpus Longevity Verdict</div>
            <div className={cn("text-xl font-bold font-mono mt-1", wealthResult.sustainable ? "text-emerald-700" : "text-rose-600")}>
              {wealthResult.sustainable ? `Solvent (Age ${inputs.lifeExpectancy}+)` : `Depletes Age ${wealthResult.depletionAge}`}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {wealthResult.sustainable ? `${distributionYears}y full coverage guaranteed` : `${shortfallSpan}y unfunded deficit before life exp.`}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Calculator size={18} className="text-zinc-600" />
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
            <NumberInput label="SWP Tax Rate" value={inputs.swp.taxRate} onChange={(v) => updateSWP({ taxRate: v })} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              label="Projected Corpus"
              value={formatCurrencyCompact(projectedCorpusAtRetirement)}
              subtext={`Full: ${formatCurrency(projectedCorpusAtRetirement)}`}
              variant="navy"
            />
            <MetricCard
              label="Required Corpus"
              value={formatCurrencyCompact(requiredCorpus)}
              subtext={`Full: ${formatCurrency(requiredCorpus)}`}
              variant="gold"
            />
            <MetricCard
              label="Gap"
              value={formatCurrencyCompact(gap)}
              subtext={gap >= 0 ? `Surplus (${formatCurrency(gap)})` : `Shortfall (${formatCurrency(Math.abs(gap))})`}
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
              <TrendingUp size={18} className="text-zinc-600" /> Wealth Trajectory
            </h3>
            <NominalRealChart data={chartData} xKey="label" />
          </Card>

          <Card className="bg-white border border-zinc-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <TrendingUp size={18} className="text-zinc-600" /> SWP Cash Flow & Drawdown Horizon
              </h3>
              <span className="text-xs font-mono text-zinc-500">
                Dual-axis: Annual withdrawals (bars) + remaining corpus (area)
              </span>
            </div>
            <SWPDrawdownChart data={drawdownChartData} />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Readiness Verdict</h3>
            <div className="flex items-start gap-3 mb-4">
              {gap >= 0 && successRate >= riskProfile.goalSuccessThreshold ? (
                <>
                  <CheckCircle2 size={20} className="text-green-700 shrink-0 mt-0.5" />
                  <p className="text-zinc-600 leading-relaxed">
                    By age <strong>{inputs.retirementAge}</strong>, your monthly expense of{' '}
                    <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today will inflate to{' '}
                    <strong>{formatCurrency(monthlyNeedAtRetirement)}</strong>. Your projected corpus of{' '}
                    <strong className="text-green-700">{formatCurrency(projectedCorpusAtRetirement)}</strong>{' '}
                    exceeds the required corpus of <strong>{formatCurrency(requiredCorpus)}</strong>.
                  </p>
                </>
              ) : (
                <>
                  <Target size={20} className="text-zinc-600 shrink-0 mt-0.5" />
                  <p className="text-zinc-600 leading-relaxed">
                    By age <strong>{inputs.retirementAge}</strong>, your monthly expense of{' '}
                    <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today will inflate to{' '}
                    <strong>{formatCurrency(monthlyNeedAtRetirement)}</strong>. Your projected corpus is{' '}
                    <strong className={gap >= 0 ? 'text-green-700' : 'text-red-600'}>
                      {formatCurrency(projectedCorpusAtRetirement)}
                    </strong>{' '}
                    against a required corpus of <strong>{formatCurrency(requiredCorpus)}</strong>.
                  </p>
                </>
              )}
            </div>
            <div className="p-4 bg-zinc-50 rounded-xl text-sm text-zinc-600 space-y-2">
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

      {/* === Section B: Post-Retirement SWP Plan === */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif text-navy flex items-center gap-2">
            <Umbrella size={20} className="text-zinc-600" /> Post-Retirement SWP Plan
          </h3>
          <Badge variant="navy">Decumulation</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="SWP Withdrawal Rate"
            value={formatPercent(swpWithdrawalRate)}
            subtext="Gross first-year withdrawal ÷ corpus"
            variant={swpWithdrawalRate <= 6 ? 'success' : swpWithdrawalRate <= 9 ? 'default' : 'danger'}
          />
          <MetricCard
            label="Sustainable Monthly Drawdown"
            value={formatCurrency(sustainableAtRetirement.monthlyWithdrawal)}
            subtext={`${formatCurrency(sustainableMonthlyNeed)}/mo in today's ₹`}
            variant={sustainableAtRetirement.monthlyWithdrawal >= monthlyNeedAtRetirement ? 'success' : 'danger'}
          />
          <MetricCard
            label="Corpus Longevity"
            value={swpPlan.sustainable ? `${distributionYears} Yrs (full horizon)` : `${swpPlan.years} Years`}
            subtext={swpPlan.sustainable ? 'Outlasts life expectancy' : `Needs ${distributionYears} years`}
            variant={swpPlan.sustainable ? 'success' : 'danger'}
          />
          <MetricCard
            label="Depletion Probability"
            value={formatPercent(depletionProbability)}
            subtext="Monte Carlo paths that run dry"
            variant={depletionProbability <= 20 ? 'success' : depletionProbability <= 50 ? 'default' : 'danger'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              updateSWP({ monthlyNeedToday: sustainableMonthlyNeed });
              showToast(`SWP set to sustainable level of ${formatCurrency(sustainableMonthlyNeed)}/mo (today's ₹)!`, 'success');
            }}
            disabled={sustainableMonthlyNeed <= 0}
          >
            <CheckCircle2 size={16} className="mr-2" /> Apply Sustainable SWP
          </Button>
          <Link to="/calculators">
            <Button variant="outline">
              Open SWP Calculator <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          {sustainableAtRetirement.monthlyWithdrawal < monthlyNeedAtRetirement && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-zinc-200 rounded-lg px-3 py-2">
              Current drawdown exceeds what the corpus can sustain — apply the sustainable SWP or close the gap above.
            </span>
          )}
        </div>

        {/* Section B.2: Withdrawal Rate Analysis & Step-Up Inflation Simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Withdrawal Rate Analysis */}
          <Card className="bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-zinc-600" />
                  <h3 className="text-base font-bold text-zinc-950">Withdrawal Rate Analysis</h3>
                </div>
                <Badge
                  variant={swpWithdrawalRate <= 4.0 ? 'success' : swpWithdrawalRate <= 5.5 ? 'warning' : 'danger'}
                  className="text-xs font-semibold"
                >
                  {swpWithdrawalRate <= 4.0 ? 'Low Risk' : swpWithdrawalRate <= 5.5 ? 'Moderate Risk' : 'Elevated Risk'}
                </Badge>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                Evaluating first-year initial withdrawal rate against the empirical Safe Withdrawal Rate (SWR) rules (Trinity 4% and Indian 3.5%–4.5% inflation-adjusted benchmarks).
              </p>

              <div className="space-y-3 text-xs">
                {/* Benchmark Comparison Rows */}
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 font-medium">Your Gross Initial Withdrawal Rate</span>
                    <span className={cn(
                      "font-mono font-bold text-sm",
                      swpWithdrawalRate <= 4.0 ? "text-emerald-700" : swpWithdrawalRate <= 5.5 ? "text-amber-700" : "text-rose-700"
                    )}>
                      {formatPercent(swpWithdrawalRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 font-medium">Net Withdrawal Rate (Post-Tax)</span>
                    <span className="font-mono font-semibold text-zinc-900">
                      {projectedCorpusAtRetirement > 0 ? formatPercent(((monthlyNeedAtRetirement * 12) / projectedCorpusAtRetirement) * 100) : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-600 font-medium">Tax Drag on Annual SWP ({inputs.swp.taxRate}%)</span>
                    <span className="font-mono font-medium text-rose-700">
                      +{formatCurrency(grossAnnualAtRetirement - monthlyNeedAtRetirement * 12)} / yr
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Benchmark Standards</div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-700">Trinity Study Rule (30-yr US baseline)</span>
                    <span className="font-mono font-bold text-zinc-900">4.00%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                    <span className="text-zinc-700">Indian Longevity Benchmark (5–7% infl.)</span>
                    <span className="font-mono font-bold text-zinc-900">3.50% – 4.50%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                    <span className="text-emerald-950 font-medium">Max Fully Sustainable Rate (This Plan)</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {projectedCorpusAtRetirement > 0
                        ? formatPercent(((sustainableAtRetirement.monthlyWithdrawal * 12) / (1 - inputs.swp.taxRate / 100) / projectedCorpusAtRetirement) * 100)
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Target size={13} className="text-zinc-400 shrink-0" />
              <span>Withdrawals under 4.5% historically survive 95%+ of 30-year high-inflation sequences.</span>
            </div>
          </Card>

          {/* Card 2: Step-Up Inflation Simulation */}
          <Card className="bg-white border border-zinc-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-zinc-600" />
                  <h3 className="text-base font-bold text-zinc-950">Step-Up Inflation Simulation</h3>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
                  Active: {simulatedInflation}% p.a.
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                Test how higher annual step-up inflation accelerates SWP drawdowns and shortens portfolio survival age.
              </p>

              {/* Preset Selector */}
              <div className="flex items-center gap-2 mb-4">
                {[5, 6, 7, 8].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSimulatedInflation(rate)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center",
                      simulatedInflation === rate
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                    )}
                  >
                    {rate}% {rate === 5 ? '(Low)' : rate === 6 ? '(Base)' : rate === 7 ? '(High)' : '(Stress)'}
                  </button>
                ))}
              </div>

              {/* Simulation Results */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Simulated 1st-Year Monthly SWP:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(simulatedMonthlyNeedAtRetirement)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Simulated 10th-Year Monthly SWP:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(simulatedMonthlyNeedAtRetirement * Math.pow(1 + simulatedInflation / 100, 10))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">Simulated 20th-Year Monthly SWP:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {formatCurrency(simulatedMonthlyNeedAtRetirement * Math.pow(1 + simulatedInflation / 100, 20))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-200/80">
                  <span className="text-zinc-800 font-semibold">Simulated Longevity Outcome:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    simulatedSWPPlan.sustainable ? "text-emerald-700" : "text-rose-600"
                  )}>
                    {simulatedSWPPlan.sustainable ? `Sustainable to Age ${inputs.lifeExpectancy}+` : `Depleted in Year ${simulatedSWPPlan.depletionYear} (Age ${inputs.retirementAge + (simulatedSWPPlan.depletionYear || 0)})`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-500">Plan inflation setting: {inputs.inflation}%</span>
              {simulatedInflation !== inputs.inflation && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="text-xs font-semibold h-8 text-zinc-900 hover:text-zinc-950"
                  onClick={() => {
                    updateInputs({ inflation: simulatedInflation });
                    showToast(`Updated inflation to ${simulatedInflation}% p.a. across the plan`, 'success');
                  }}
                >
                  <Zap size={13} className="mr-1 fill-current" /> Apply {simulatedInflation}% to Plan
                </Button>
              )}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-serif text-navy">Year-by-Year SWP Schedule</h3>
              <Badge variant={swpPlan.sustainable ? 'success' : 'danger'}>
                {swpPlan.sustainable ? 'Sustains to life expectancy' : `Depletes in year ${swpPlan.depletionYear}`}
              </Badge>
            </div>
            {swpPlan.yearlyData.length > 15 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowAllSchedule((prev) => !prev)}
              >
                {showAllSchedule ? 'Show Summary (10 Yrs)' : `Show All ${swpPlan.yearlyData.length} Years`}
              </Button>
            )}
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable SWP schedule table">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-700">
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Age</th>
                  <th className="py-2 pr-4 text-right">Monthly SWP</th>
                  <th className="py-2 pr-4 text-right">Annual Withdrawal</th>
                  <th className="py-2 pr-4 text-right">Corpus at Year-End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {scheduleRows.map((d) => (
                  <tr
                    key={d.year}
                    className={`hover:bg-zinc-50/80 transition-colors ${
                      d.corpusLeft <= 0 ? 'bg-rose-50/50 text-rose-900' : ''
                    }`}
                  >
                    <td className="py-2 pr-4">{inputs.retirementAge > 0 ? `Ret + ${d.year}` : `Year ${d.year}`}</td>
                    <td className="py-2 pr-4">{inputs.retirementAge + d.year}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(d.monthlyNeed)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(d.withdrawn)}</td>
                    <td className={`py-2 pr-4 text-right font-medium ${d.corpusLeft <= 0 ? 'text-rose-600 font-bold' : ''}`}>
                      {formatCurrency(d.corpusLeft)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAllSchedule && swpPlan.yearlyData.length > 15 && (
            <p className="text-xs text-zinc-500 mt-3 pt-2 border-t border-zinc-100">
              Showing first 10 years and final year of a {swpPlan.yearlyData.length}-year distribution horizon. Click "Show All" above for the complete table.
            </p>
          )}
        </Card>
      </div>

      {/* SECTION C: SENSITIVITY & SCENARIO MATRIX */}
      <RetirementSensitivityMatrix />

      {/* SECTION D: CRISIS & MACRO STRESS TESTING */}
      <StressTestSimulator />

      {/* SECTION E: MONTE CARLO TAIL-RISK & FAILURE MODE DIAGNOSIS */}
      <MonteCarloFailureAnalysis />

      {/* SECTION F: SCENARIO LABORATORY & TRADE-OFF MATRIX */}
      <ScenarioLab />

      <WorkflowFooter
        prev={{ path: '/goal', label: 'Goals' }}
        next={{ path: '/allocation', label: 'Allocation' }}
        flowHint="Retirement corpus and the post-retirement SWP it must fund dictate your strategic asset allocation."
      />
    </div>
  );
};
