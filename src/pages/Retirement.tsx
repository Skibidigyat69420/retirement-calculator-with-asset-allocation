import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Flame,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Umbrella,
  Zap,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { NumberInput } from '../components/ui/NumberInput';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { useCalculator } from '../context/CalculatorContext';
import { calculateSWP, calculateSustainableSWP } from '../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { guardNumber, formatOrDash } from '../lib/planState';
import { requiredMonthlySIPForGoal } from '../lib/goals';
import { RetirementSensitivityMatrix } from '../components/analytics/RetirementSensitivityMatrix';
import { StressTestSimulator } from '../components/analytics/StressTestSimulator';
import { MonteCarloFailureAnalysis } from '../components/analytics/MonteCarloFailureAnalysis';
import { ScenarioLab } from '../components/analytics/ScenarioLab';
import { cn } from '../lib/utils';

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-raised)',
  boxShadow: 'var(--shadow-popover)',
  padding: '10px 14px',
  fontSize: '12px',
  color: 'var(--color-ink)',
};

interface HeroChartProps {
  data: { label: string; total: number }[];
  requiredCorpus: number;
  retirementAge: number;
}

/** Editorial projection: thin moss line, soft fill, brass dashed required-corpus
 *  reference, subtle retirement-age marker. */
const HeroProjectionChart = ({ data, requiredCorpus, retirementAge }: HeroChartProps) => {
  const reduceMotion = useReducedMotion();
  const first = data[0];
  const last = data[data.length - 1];
  const interval = Math.max(0, Math.ceil(data.length / 9) - 1);

  return (
    <div
      className="h-[340px] w-full"
      role="img"
      aria-label={`Projected corpus trajectory with required corpus reference line at ${formatCurrencyCompact(requiredCorpus)}`}
    >
      <span className="sr-only">
        {data.length === 0
          ? 'No projection data.'
          : `Projected corpus moves from ${formatCurrencyCompact(first.total)} at ${first.label} to ${formatCurrencyCompact(last.total)} at ${last.label}. Required corpus at retirement is ${formatCurrencyCompact(requiredCorpus)}.`}
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="retirementHeroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="var(--color-border-subtle)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-faint)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={interval}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
            tick={{ fontSize: 11, fill: 'var(--color-faint)' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value: any) => formatCurrencyCompact(typeof value === 'number' ? value : Number(value))}
            contentStyle={TOOLTIP_STYLE}
          />
          <ReferenceLine
            y={requiredCorpus}
            stroke="var(--color-brass)"
            strokeDasharray="6 4"
            strokeWidth={1.4}
            label={{
              value: `Required ${formatCurrencyCompact(requiredCorpus)}`,
              position: 'insideTopRight',
              fill: 'var(--color-brass-strong)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}
          />
          <ReferenceLine
            x={`Age ${retirementAge}`}
            stroke="var(--color-border-strong)"
            strokeWidth={1}
            label={{
              value: 'Retirement',
              position: 'insideTopLeft',
              fill: 'var(--color-muted)',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Projected corpus"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="url(#retirementHeroFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
            animationBegin={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const Retirement = () => {
  const { inputs, wealthResult, riskProfile, updateInputs, updateSIP, updateSWP, showToast } = useCalculator();
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const configured = wealthResult.isConfigured;

  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const distributionYears = Math.max(0, inputs.lifeExpectancy - inputs.retirementAge);

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
    if (realReturn <= 0) return annualNeedAtRetirement * distributionYears;
    return (
      (annualNeedAtRetirement * (1 - Math.pow(1 + realReturn, -distributionYears))) / realReturn
    );
  }, [monthlyNeedAtRetirement, inputs.swp.postRetirementReturn, inputs.inflation, distributionYears, inputs.swp.taxRate]);

  const gap = projectedCorpusAtRetirement - requiredCorpus;
  const successRate = wealthResult.monteCarlo.successRate * 100;
  const shortfall = Math.abs(gap);
  const blendedReturn =
    (inputs.sip.equitySplit * inputs.sip.equityReturn + inputs.sip.debtSplit * inputs.sip.debtReturn) / 100;

  const extraSIPNeeded = useMemo(() => {
    if (gap >= 0 || yearsToRetirement <= 0) return 0;
    return Math.round(requiredMonthlySIPForGoal(shortfall, yearsToRetirement, blendedReturn));
  }, [gap, yearsToRetirement, blendedReturn, shortfall]);

  const maxDelayAge = Math.min(inputs.lifeExpectancy - 5, inputs.retirementAge + 3);
  const recommendedDelayAge = Math.max(inputs.retirementAge + 1, maxDelayAge);
  const delayYears = recommendedDelayAge - inputs.retirementAge;

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
  const swpWithdrawalRate =
    projectedCorpusAtRetirement > 0 ? (grossAnnualAtRetirement / projectedCorpusAtRetirement) * 100 : 0;

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
    return (outcomes.filter(o => o.depletionAge !== null).length / outcomes.length) * 100;
  }, [wealthResult.monteCarlo.outcomes]);

  const chartData = useMemo(
    () => wealthResult.snapshots.map(s => ({ label: `Age ${s.age}`, total: s.total })),
    [wealthResult.snapshots],
  );

  const drawdownChartData = useMemo(() => {
    const percentilesByAge = new Map(wealthResult.monteCarlo.yearlyPercentiles.map(p => [p.age, p]));
    return swpPlan.yearlyData.map(d => {
      const age = inputs.retirementAge + d.year;
      const band = percentilesByAge.get(age);
      return {
        label: `Age ${age}`,
        corpus: d.corpusLeft,
        withdrawal: d.withdrawn,
        p5: band?.p5,
        p50: band?.p50,
        p95: band?.p95,
      };
    });
  }, [swpPlan.yearlyData, inputs.retirementAge, wealthResult.monteCarlo.yearlyPercentiles]);

  const survivalByYear = useMemo(() => {
    const outcomes = wealthResult.monteCarlo.outcomes;
    const totalYears = Math.max(0, inputs.lifeExpectancy - inputs.currentAge);
    const accYears = Math.max(0, inputs.retirementAge - inputs.currentAge);
    const rows: { age: number; probability: number }[] = [];
    for (let y = accYears; y < totalYears; y++) {
      const alive = outcomes.filter(o => (o.yearlyValues[y] ?? 0) > 0).length;
      rows.push({
        age: inputs.currentAge + y + 1,
        probability: outcomes.length > 0 ? alive / outcomes.length : 1,
      });
    }
    return rows;
  }, [wealthResult.monteCarlo.outcomes, inputs.lifeExpectancy, inputs.currentAge, inputs.retirementAge]);

  const halfSurvivalAge = survivalByYear.find(r => r.probability < 0.5)?.age ?? null;

  // Longevity gauge spans
  const totalLifespanSpan = Math.max(1, inputs.lifeExpectancy - inputs.currentAge);
  const accumulationPct = (Math.max(0, yearsToRetirement) / totalLifespanSpan) * 100;
  const fundedRetirementSpan = wealthResult.sustainable
    ? distributionYears
    : Math.max(0, (wealthResult.depletionAge ?? inputs.retirementAge) - inputs.retirementAge);
  const fundedRetirementPct = (fundedRetirementSpan / totalLifespanSpan) * 100;
  const shortfallSpan = wealthResult.sustainable
    ? 0
    : Math.max(0, inputs.lifeExpectancy - (wealthResult.depletionAge ?? inputs.retirementAge));
  const shortfallPct = (shortfallSpan / totalLifespanSpan) * 100;

  // Step-up inflation simulation
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

  const scheduleRows =
    showAllSchedule || swpPlan.yearlyData.length <= 15
      ? swpPlan.yearlyData
      : [...swpPlan.yearlyData.slice(0, 10), swpPlan.yearlyData[swpPlan.yearlyData.length - 1]];

  const gapValue = configured ? guardNumber(gap) : null;
  const probabilityValue = configured ? guardNumber(successRate) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        eyebrow="RETIREMENT"
        title="What does financial independence look like for this client?"
      />

      {/* Hero metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 border-y border-border py-8">
        <FinancialMetric
          label="Projected at retirement"
          value={configured ? formatCurrencyCompact(projectedCorpusAtRetirement) : null}
          hint={configured ? `Age ${inputs.retirementAge}` : undefined}
          size="lg"
        />
        <FinancialMetric
          label="Required corpus"
          value={configured ? formatCurrencyCompact(requiredCorpus) : null}
          hint={configured ? `${formatPercent(inputs.swp.postRetirementReturn)} post-retirement return` : undefined}
          size="lg"
        />
        <FinancialMetric
          label="Surplus"
          value={configured ? formatCurrencyCompact(gap) : null}
          deltaLabel={gapValue === null ? undefined : gap >= 0 ? 'ahead of requirement' : 'short of requirement'}
          hint={configured ? `Need ${formatCurrencyCompact(monthlyNeedAtRetirement)}/mo at retirement` : undefined}
          size="lg"
        />
        <FinancialMetric
          label="Plan probability"
          value={probabilityValue === null ? null : formatPercent(probabilityValue)}
          hint={configured ? `Threshold ${formatPercent(riskProfile.goalSuccessThreshold)}` : undefined}
          size="lg"
        />
      </div>

      {/* Hero chart */}
      {configured ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-2">
              <div>
                <div className="eyebrow">Projection</div>
                <p className="mt-1 text-sm text-muted">
                  Corpus trajectory from age {inputs.currentAge} to {inputs.lifeExpectancy}
                </p>
              </div>
              <div className="flex items-center gap-5 text-[11px] text-muted font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-accent inline-block" /> Projected
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-6 border-t border-dashed border-brass inline-block" /> Required
                </span>
              </div>
            </div>
            <div className="px-2 pb-2">
              <HeroProjectionChart
                data={chartData}
                requiredCorpus={requiredCorpus}
                retirementAge={inputs.retirementAge}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <EmptyState
          icon={Compass}
          display
          eyebrow="NO PROJECTION YET"
          title="Retirement plan not configured"
          description="Add the client's age, retirement target and current financial position to generate a projection."
          action={
            <Link to="/master-plan">
              <Button>
                Configure master plan <ArrowRight size={15} strokeWidth={1.8} />
              </Button>
            </Link>
          }
        />
      )}

      {/* Configuration surface — always available */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Calculator size={17} strokeWidth={1.7} className="text-muted" />
            <h3 className="text-[15px] font-semibold text-ink tracking-tight">Plan inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Current Age" value={inputs.currentAge} onChange={v => updateInputs({ currentAge: v })} />
            <NumberInput label="Retirement Age" value={inputs.retirementAge} onChange={v => updateInputs({ retirementAge: v })} />
            <NumberInput label="Life Expectancy" value={inputs.lifeExpectancy} onChange={v => updateInputs({ lifeExpectancy: v })} />
            <NumberInput label="Monthly Expenditure" value={inputs.monthlyExpenditure} onChange={v => updateInputs({ monthlyExpenditure: v })} helper="Current lifestyle spend" />
            <NumberInput label="Monthly Need at Retirement" value={inputs.swp.monthlyNeedToday} onChange={v => updateSWP({ monthlyNeedToday: v })} helper="Target retirement drawdown" />
            <NumberInput label="Monthly SIP" value={inputs.sip.amount} onChange={v => updateSIP({ amount: v })} />
            <NumberInput label="Inflation" value={inputs.inflation} onChange={v => updateInputs({ inflation: v })} suffix="%" />
            <NumberInput label="Post-Retirement Return" value={inputs.swp.postRetirementReturn} onChange={v => updateSWP({ postRetirementReturn: v })} suffix="%" />
            <NumberInput label="SWP Tax Rate" value={inputs.swp.taxRate} onChange={v => updateSWP({ taxRate: v })} suffix="%" />
          </div>
        </Card>

        {configured && (
          <div className="lg:col-span-2 space-y-6">
            {!wealthResult.sustainable && (
              <div className="p-3.5 rounded-md border border-negative/25 bg-negative-soft/60 text-sm flex items-start gap-3">
                <AlertTriangle size={15} strokeWidth={1.8} className="text-negative shrink-0 mt-0.5" />
                <div className="leading-relaxed text-pretty">
                  <strong>Plan is not sustainable.</strong> Corpus is projected to deplete at age{' '}
                  {formatOrDash(wealthResult.depletionAge, v => `${v}`)}. Review the shortfall solver below to
                  balance the plan.
                </div>
              </div>
            )}

            {gap < 0 && (
              <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} strokeWidth={1.7} className="text-muted" />
                  <h3 className="text-[15px] font-semibold text-ink tracking-tight">
                    Closing a shortfall of {formatCurrency(shortfall)}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Three levers that immediately align the plan with full retirement sustainability:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: DollarSign,
                      title: 'Increase SIP',
                      body: <>Boost monthly SIP by <strong>+{formatCurrency(extraSIPNeeded)}</strong> (to <strong>{formatCurrency(inputs.sip.amount + extraSIPNeeded)}</strong>/mo).</>,
                      cta: 'Apply SIP increase',
                      onClick: () => {
                        updateSIP({ amount: inputs.sip.amount + extraSIPNeeded });
                        showToast(`Monthly SIP increased to ${formatCurrency(inputs.sip.amount + extraSIPNeeded)}!`, 'success');
                      },
                    },
                    {
                      icon: Clock,
                      title: 'Extend horizon',
                      body: <>Delay retirement by {delayYears} year{delayYears === 1 ? '' : 's'} to age <strong>{recommendedDelayAge}</strong> to allow longer compounding.</>,
                      cta: `Retire at age ${recommendedDelayAge}`,
                      onClick: () => {
                        updateInputs({ retirementAge: recommendedDelayAge });
                        showToast(`Retirement age shifted to ${recommendedDelayAge}!`, 'success');
                      },
                    },
                    {
                      icon: Target,
                      title: 'Calibrate spend',
                      body: <>Adjust retirement drawdown to a sustainable <strong>{formatCurrency(sustainableMonthlyNeed)}</strong>/mo today.</>,
                      cta: 'Set sustainable spend',
                      onClick: () => {
                        updateSWP({ monthlyNeedToday: sustainableMonthlyNeed });
                        showToast(`Retirement drawdown updated to ${formatCurrency(sustainableMonthlyNeed)}/mo!`, 'success');
                      },
                    },
                  ].map(lever => (
                    <div key={lever.title} className="bg-raised border border-border rounded-md p-4 flex flex-col justify-between gap-3 shadow-card">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                          <lever.icon size={13} strokeWidth={1.7} className="text-muted" /> {lever.title}
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{lever.body}</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={lever.onClick}>
                        {lever.cta}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Longevity & solvency gauge */}
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border-subtle">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={17} strokeWidth={1.7} className="text-muted" />
                    <h3 className="text-[15px] font-semibold text-ink tracking-tight">Longevity &amp; solvency horizon</h3>
                  </div>
                  <p className="text-xs text-muted mt-0.5">Accumulation vs funded distribution vs early depletion.</p>
                </div>
                <Badge tone={wealthResult.sustainable ? 'positive' : 'negative'}>
                  {wealthResult.sustainable ? 'Fully solvent' : `Depletes at age ${wealthResult.depletionAge}`}
                </Badge>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>Age {inputs.currentAge}</span>
                  <span>Age {inputs.retirementAge}</span>
                  {!wealthResult.sustainable && wealthResult.depletionAge && (
                    <span className="text-negative font-semibold">Age {wealthResult.depletionAge}</span>
                  )}
                  <span>Age {inputs.lifeExpectancy}</span>
                </div>
                <div className="w-full h-4 bg-sunken rounded-sm overflow-hidden flex border border-border">
                  <div className="bg-ink transition-all" style={{ width: `${Math.max(5, accumulationPct)}%` }} title={`Accumulation: age ${inputs.currentAge} to ${inputs.retirementAge}`} />
                  <div className="bg-positive transition-all" style={{ width: `${Math.max(5, fundedRetirementPct)}%` }} title={`Funded retirement: ${fundedRetirementSpan} yrs`} />
                  {shortfallSpan > 0 && (
                    <div className="bg-negative transition-all" style={{ width: `${Math.max(5, shortfallPct)}%` }} title={`Unfunded: ${shortfallSpan} yrs`} />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[11px] text-muted pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-ink inline-block" /> Accumulation ({yearsToRetirement} yrs)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-positive inline-block" /> Funded ({fundedRetirementSpan} yrs)
                  </span>
                  {shortfallSpan > 0 ? (
                    <span className="flex items-center gap-1.5 text-negative font-medium">
                      <span className="w-2.5 h-2.5 rounded-xs bg-negative inline-block" /> Unfunded ({shortfallSpan} yrs)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-positive font-medium">
                      <CheckCircle2 size={12} strokeWidth={1.8} /> Full {distributionYears}y solvency
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Accumulation window', value: `${yearsToRetirement} years`, sub: 'SIP & active compounding' },
                  { label: 'Distribution horizon', value: `${distributionYears} years`, sub: `Age ${inputs.retirementAge} to ${inputs.lifeExpectancy}` },
                  {
                    label: 'Longevity verdict',
                    value: wealthResult.sustainable ? `Solvent (age ${inputs.lifeExpectancy}+)` : `Depletes age ${wealthResult.depletionAge}`,
                    sub: wealthResult.sustainable ? `${distributionYears}y full coverage` : `${shortfallSpan}y unfunded before life expectancy`,
                    tone: wealthResult.sustainable ? 'text-positive' : 'text-negative',
                  },
                ].map(tile => (
                  <div key={tile.label} className="p-3.5 rounded-md bg-sunken/60 border border-border-subtle">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted">{tile.label}</div>
                    <div className={cn('text-lg font-mono text-ink mt-1 tabular-nums', tile.tone)}>{tile.value}</div>
                    <div className="text-[11px] text-muted mt-0.5">{tile.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinancialMetric label="Monthly need at retirement" value={formatCurrency(monthlyNeedAtRetirement)} size="sm" hint="Inflation-adjusted" />
              <FinancialMetric
                label="Plan success rate"
                value={formatOrDash(successRate, v => formatPercent(v))}
                size="sm"
                hint="Monte Carlo"
              />
              <FinancialMetric
                label="Depletion age"
                value={wealthResult.sustainable ? 'Sustainable' : formatOrDash(wealthResult.depletionAge, v => `Age ${v}`)}
                size="sm"
                hint={wealthResult.sustainable ? 'Outlasts life expectancy' : 'Corpus runs out early'}
              />
              <FinancialMetric label="Net savings rate" value={formatOrDash(wealthResult.savingsRate, v => formatPercent(v))} size="sm" hint={formatOrDash(wealthResult.annualSavings, v => `${formatCurrency(v)}/yr saved`)} />
            </div>

            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-[15px] font-semibold text-ink tracking-tight mb-4 flex items-center gap-2">
                <TrendingUp size={17} strokeWidth={1.7} className="text-muted" /> Wealth trajectory
              </h3>
              <NominalRealChart data={wealthResult.snapshots.map(s => ({ label: `Age ${s.age}`, nominal: s.total, real: s.realTotal }))} xKey="label" />
            </div>

            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
                  <TrendingUp size={17} strokeWidth={1.7} className="text-muted" /> SWP drawdown horizon
                </h3>
                <span className="text-[11px] font-mono text-muted">Withdrawals (bars) + remaining corpus (area)</span>
              </div>
              <SWPDrawdownChart data={drawdownChartData} />
            </div>

            {/* Depletion risk heat strip */}
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
                  <Flame size={17} strokeWidth={1.7} className="text-muted" /> Depletion risk by age
                </h3>
                <span className="text-[11px] font-mono text-muted">
                  {wealthResult.monteCarlo.outcomes.length.toLocaleString()} Monte Carlo paths
                </span>
              </div>
              <div role="img" aria-label={`Solvency probability at each age from ${inputs.retirementAge + 1} to ${inputs.lifeExpectancy}`}>
                <span className="sr-only">
                  {halfSurvivalAge !== null
                    ? `Survival probability falls below 50 percent at age ${halfSurvivalAge}.`
                    : `The corpus stays solvent in at least half of all simulated paths through age ${inputs.lifeExpectancy}.`}
                </span>
                {survivalByYear.length > 0 ? (
                  <>
                    <div className="flex gap-0.5" aria-hidden="true">
                      {survivalByYear.map(r => (
                        <div
                          key={r.age}
                          className={cn(
                            'flex-1 h-8 rounded-xs min-w-0 transition-colors',
                            r.probability >= 0.95
                              ? 'bg-positive'
                              : r.probability >= 0.8
                                ? 'bg-positive/70'
                                : r.probability >= 0.5
                                  ? 'bg-warning'
                                  : r.probability > 0
                                    ? 'bg-negative/60'
                                    : 'bg-negative',
                          )}
                          title={`Age ${r.age}: ${formatPercent(r.probability * 100)} of paths solvent`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-0.5 mt-1 text-[9px] font-mono text-faint" aria-hidden="true">
                      {survivalByYear.map((r, i) => (
                        <div key={r.age} className="flex-1 min-w-0 text-center">
                          {i % 5 === 0 || i === survivalByYear.length - 1 ? r.age : ''}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">No distribution years to display.</p>
                )}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-positive inline-block" aria-hidden="true" /> ≥95% solvent</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-positive/70 inline-block" aria-hidden="true" /> 80–95%</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-warning inline-block" aria-hidden="true" /> 50–80%</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-negative/60 inline-block" aria-hidden="true" /> 1–50%</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-negative inline-block" aria-hidden="true" /> Depleted</span>
                  <span className="ml-auto font-mono text-muted">Age →</span>
                </div>
              </div>
              <p className="text-xs text-muted mt-4 pt-3 border-t border-border-subtle leading-relaxed">
                {halfSurvivalAge !== null
                  ? `Half of the simulated paths run dry by age ${halfSurvivalAge} — the amber-to-red transition marks where sequence risk bites.`
                  : `Every simulated path retains a positive corpus through age ${inputs.lifeExpectancy}; the plan carries no depletion risk.`}
              </p>
            </div>

            {/* Readiness verdict */}
            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-[15px] font-semibold text-ink tracking-tight mb-4">Readiness verdict</h3>
              <div className="flex items-start gap-3 mb-4">
                {gap >= 0 && successRate >= riskProfile.goalSuccessThreshold ? (
                  <>
                    <CheckCircle2 size={18} strokeWidth={1.7} className="text-positive shrink-0 mt-0.5" />
                    <p className="text-sm text-muted leading-relaxed">
                      By age <strong className="text-ink">{inputs.retirementAge}</strong>, a monthly expense of{' '}
                      <strong className="text-ink">{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today inflates to{' '}
                      <strong className="text-ink">{formatCurrency(monthlyNeedAtRetirement)}</strong>. The projected corpus of{' '}
                      <strong className="text-positive">{formatCurrency(projectedCorpusAtRetirement)}</strong> exceeds the
                      required corpus of <strong className="text-ink">{formatCurrency(requiredCorpus)}</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <Target size={18} strokeWidth={1.7} className="text-muted shrink-0 mt-0.5" />
                    <p className="text-sm text-muted leading-relaxed">
                      By age <strong className="text-ink">{inputs.retirementAge}</strong>, a monthly expense of{' '}
                      <strong className="text-ink">{formatCurrency(inputs.swp.monthlyNeedToday)}</strong> today inflates to{' '}
                      <strong className="text-ink">{formatCurrency(monthlyNeedAtRetirement)}</strong>. The projected corpus is{' '}
                      <strong className={gap >= 0 ? 'text-positive' : 'text-negative'}>
                        {formatCurrency(projectedCorpusAtRetirement)}
                      </strong>{' '}
                      against a required corpus of <strong className="text-ink">{formatCurrency(requiredCorpus)}</strong>.
                    </p>
                  </>
                )}
              </div>
              <div className="p-4 bg-sunken/60 rounded-md text-sm text-muted space-y-2 border border-border-subtle">
                <div className="flex justify-between gap-4">
                  <span>Success threshold</span>
                  <span className="font-mono text-ink">{formatPercent(riskProfile.goalSuccessThreshold)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Monthly expenditure</span>
                  <span className="font-mono text-ink">{formatCurrency(inputs.monthlyExpenditure)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Annual invested</span>
                  <span className="font-mono text-ink">{formatCurrency(wealthResult.annualInvested)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post-retirement SWP plan */}
      {configured && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold text-ink tracking-tight flex items-center gap-2">
              <Umbrella size={17} strokeWidth={1.7} className="text-muted" /> Post-retirement SWP plan
            </h3>
            <Badge tone="accent">Decumulation</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FinancialMetric
              label="Withdrawal rate"
              value={formatOrDash(swpWithdrawalRate, v => formatPercent(v))}
              size="sm"
              hint="Gross first-year withdrawal ÷ corpus"
            />
            <FinancialMetric
              label="Sustainable drawdown"
              value={formatOrDash(sustainableAtRetirement.monthlyWithdrawal, v => formatCurrency(v))}
              size="sm"
              hint={`${formatCurrency(sustainableMonthlyNeed)}/mo in today's ₹`}
            />
            <FinancialMetric
              label="Corpus longevity"
              value={swpPlan.sustainable ? `${distributionYears} yrs (full)` : `${swpPlan.years} years`}
              size="sm"
              hint={swpPlan.sustainable ? 'Outlasts life expectancy' : `Needs ${distributionYears} years`}
            />
            <FinancialMetric
              label="Depletion probability"
              value={formatOrDash(depletionProbability, v => formatPercent(v))}
              size="sm"
              hint="Monte Carlo paths that run dry"
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
              <CheckCircle2 size={15} strokeWidth={1.8} /> Apply sustainable SWP
            </Button>
            <Link to="/calculators">
              <Button variant="outline">
                Open SWP calculator <ArrowRight size={15} strokeWidth={1.8} />
              </Button>
            </Link>
            {sustainableAtRetirement.monthlyWithdrawal < monthlyNeedAtRetirement && (
              <span className="text-xs text-warning bg-warning-soft border border-warning/25 rounded-md px-3 py-2">
                Current drawdown exceeds what the corpus can sustain — apply the sustainable SWP or close the gap above.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Withdrawal rate analysis */}
            <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Scale size={17} strokeWidth={1.7} className="text-muted" />
                    <h3 className="text-[15px] font-semibold text-ink tracking-tight">Withdrawal rate analysis</h3>
                  </div>
                  <Badge tone={swpWithdrawalRate <= 4.0 ? 'positive' : swpWithdrawalRate <= 5.5 ? 'warning' : 'negative'}>
                    {swpWithdrawalRate <= 4.0 ? 'Low risk' : swpWithdrawalRate <= 5.5 ? 'Moderate risk' : 'Elevated risk'}
                  </Badge>
                </div>

                <div
                  className="mb-4"
                  role="img"
                  aria-label={`Withdrawal rate gauge: current gross initial withdrawal rate ${formatPercent(swpWithdrawalRate)}; safe below 3.5 percent, caution 3.5 to 4.5 percent, elevated above 4.5 percent`}
                >
                  <div className="flex justify-between text-[10px] font-mono text-faint mb-1">
                    <span>0%</span>
                    <span>3.5% safe</span>
                    <span>4.5% caution</span>
                    <span>10%+</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden flex border border-border" aria-hidden="true">
                    <div className="bg-positive h-full" style={{ width: '35%' }} />
                    <div className="bg-warning h-full" style={{ width: '10%' }} />
                    <div className="bg-negative h-full" style={{ width: '55%' }} />
                    <div
                      className="absolute top-0 h-full w-0.5 bg-ink"
                      style={{ left: `${Math.min(99, Math.max(0, swpWithdrawalRate * 10))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[11px]">
                    <span className="text-muted">Initial withdrawal rate</span>
                    <span className="font-mono text-ink tabular-nums">{formatPercent(swpWithdrawalRate)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-md bg-sunken/60 border border-border-subtle space-y-2">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-muted">Gross initial withdrawal rate</span>
                      <span className={cn(
                        'font-mono font-semibold',
                        swpWithdrawalRate <= 4.0 ? 'text-positive' : swpWithdrawalRate <= 5.5 ? 'text-warning' : 'text-negative',
                      )}>
                        {formatPercent(swpWithdrawalRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-muted">Net withdrawal rate (post-tax)</span>
                      <span className="font-mono text-ink">
                        {projectedCorpusAtRetirement > 0 ? formatPercent(((monthlyNeedAtRetirement * 12) / projectedCorpusAtRetirement) * 100) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-muted">Tax drag on annual SWP ({inputs.swp.taxRate}%)</span>
                      <span className="font-mono text-negative">
                        +{formatCurrency(grossAnnualAtRetirement - monthlyNeedAtRetirement * 12)} / yr
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Benchmarks</div>
                    <div className="flex items-center justify-between gap-4 p-2 rounded-sm bg-sunken/60 border border-border-subtle">
                      <span className="text-muted">Trinity study rule (30-yr baseline)</span>
                      <span className="font-mono text-ink">4.00%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-2 rounded-sm bg-sunken/60 border border-border-subtle">
                      <span className="text-muted">Indian longevity benchmark</span>
                      <span className="font-mono text-ink">3.50% – 4.50%</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 p-2 rounded-sm bg-positive-soft border border-positive/25">
                      <span className="text-positive">Max fully sustainable rate (this plan)</span>
                      <span className="font-mono text-positive">
                        {projectedCorpusAtRetirement > 0
                          ? formatPercent(((sustainableAtRetirement.monthlyWithdrawal * 12) / (1 - inputs.swp.taxRate / 100) / projectedCorpusAtRetirement) * 100)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-muted flex items-center gap-1.5">
                <Target size={13} strokeWidth={1.7} className="shrink-0" />
                Withdrawals under 4.5% historically survive 95%+ of 30-year high-inflation sequences.
              </div>
            </div>

            {/* Step-up inflation simulation */}
            <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Flame size={17} strokeWidth={1.7} className="text-muted" />
                    <h3 className="text-[15px] font-semibold text-ink tracking-tight">Step-up inflation simulation</h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted bg-sunken px-2 py-1 rounded-sm border border-border">
                    Active: {simulatedInflation}% p.a.
                  </span>
                </div>

                <p className="text-xs text-muted leading-relaxed mb-4">
                  Test how higher annual step-up inflation accelerates SWP drawdowns and shortens portfolio survival.
                </p>

                <div className="mb-4">
                  <SegmentedInflationPresets value={simulatedInflation} onChange={setSimulatedInflation} />
                </div>

                <div className="p-3 rounded-md bg-sunken/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted">Simulated 1st-year monthly SWP</span>
                    <span className="font-mono text-ink">{formatCurrency(simulatedMonthlyNeedAtRetirement)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted">Simulated 10th-year monthly SWP</span>
                    <span className="font-mono text-ink">{formatCurrency(simulatedMonthlyNeedAtRetirement * Math.pow(1 + simulatedInflation / 100, 10))}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted">Simulated 20th-year monthly SWP</span>
                    <span className="font-mono text-ink">{formatCurrency(simulatedMonthlyNeedAtRetirement * Math.pow(1 + simulatedInflation / 100, 20))}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
                    <span className="text-ink font-medium">Simulated longevity outcome</span>
                    <span className={cn('font-mono font-semibold', simulatedSWPPlan.sustainable ? 'text-positive' : 'text-negative')}>
                      {simulatedSWPPlan.sustainable
                        ? `Sustainable to age ${inputs.lifeExpectancy}+`
                        : `Depleted in year ${simulatedSWPPlan.depletionYear} (age ${inputs.retirementAge + (simulatedSWPPlan.depletionYear || 0)})`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted">Plan inflation setting: {inputs.inflation}%</span>
                {simulatedInflation !== inputs.inflation && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8"
                    onClick={() => {
                      updateInputs({ inflation: simulatedInflation });
                      showToast(`Updated inflation to ${simulatedInflation}% p.a. across the plan`, 'success');
                    }}
                  >
                    <Zap size={13} strokeWidth={1.8} /> Apply {simulatedInflation}% to plan
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Year-by-year schedule */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-semibold text-ink tracking-tight">Year-by-year SWP schedule</h3>
                <Badge tone={swpPlan.sustainable ? 'positive' : 'negative'}>
                  {swpPlan.sustainable ? 'Sustains to life expectancy' : `Depletes in year ${swpPlan.depletionYear}`}
                </Badge>
              </div>
              {swpPlan.yearlyData.length > 15 && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAllSchedule(prev => !prev)}>
                  {showAllSchedule ? 'Show summary (10 yrs)' : `Show all ${swpPlan.yearlyData.length} years`}
                </Button>
              )}
            </div>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable SWP schedule table">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
                    <th className="py-2 pr-4 font-medium">Year</th>
                    <th className="py-2 pr-4 font-medium">Age</th>
                    <th className="py-2 pr-4 font-medium text-right">Monthly SWP</th>
                    <th className="py-2 pr-4 font-medium text-right">Annual withdrawal</th>
                    <th className="py-2 pr-4 font-medium text-right">Corpus at year-end</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {scheduleRows.map(d => (
                    <tr key={d.year} className={cn('hover:bg-sunken/50 transition-colors', d.corpusLeft <= 0 && 'text-negative')}>
                      <td className="py-2 pr-4">{inputs.retirementAge > 0 ? `Ret + ${d.year}` : `Year ${d.year}`}</td>
                      <td className="py-2 pr-4 font-mono tabular-nums">{inputs.retirementAge + d.year}</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(d.monthlyNeed)}</td>
                      <td className="py-2 pr-4 text-right font-mono tabular-nums">{formatCurrency(d.withdrawn)}</td>
                      <td className={cn('py-2 pr-4 text-right font-mono tabular-nums font-medium', d.corpusLeft <= 0 && 'text-negative')}>
                        {formatCurrency(d.corpusLeft)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAllSchedule && swpPlan.yearlyData.length > 15 && (
              <p className="text-xs text-muted mt-3 pt-2 border-t border-border-subtle">
                Showing the first 10 years and the final year of a {swpPlan.yearlyData.length}-year distribution horizon.
              </p>
            )}
          </div>
        </div>
      )}

      {configured && <RetirementSensitivityMatrix />}
      {configured && <StressTestSimulator />}
      {configured && <MonteCarloFailureAnalysis />}
      <ScenarioLab />

      <div className="pb-8">
        <WorkflowFooter
          prev={{ path: '/goal', label: 'Goals' }}
          next={{ path: '/allocation', label: 'Allocation' }}
          flowHint="Retirement corpus and the post-retirement SWP it must fund dictate your strategic asset allocation."
        />
      </div>
    </div>
  );
};

const INFLATION_PRESETS = [
  { value: 5, label: '5% Low' },
  { value: 6, label: '6% Base' },
  { value: 7, label: '7% High' },
  { value: 8, label: '8% Stress' },
];

const SegmentedInflationPresets = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-sunken">
    {INFLATION_PRESETS.map(p => (
      <button
        key={p.value}
        type="button"
        onClick={() => onChange(p.value)}
        className={cn(
          'px-2.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors cursor-pointer select-none',
          value === p.value ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
        )}
      >
        {p.label}
      </button>
    ))}
  </div>
);
