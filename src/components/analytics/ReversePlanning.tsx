import { useState, useMemo } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  GitCompare,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { CurrencyInput } from '../ui/CurrencyInput';
import { EmptyState } from '../ui/EmptyState';
import { runReversePlanning } from '../../lib/reversePlanning';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { ReversePathway } from '../../types';

export const ReversePlanning = () => {
  const {
    inputs,
    wealthResult,
    updateInputs,
    updateSIP,
    updateSWP,
    showToast,
    logDecision,
  } = useCalculator();

  const currentWealth = wealthResult.netWorth;
  const initialTargetCorpus = wealthResult.terminalValue > 0
    ? Math.round((wealthResult.terminalValue * 1.15) / 1000000) * 1000000
    : 0;

  const [targetCorpus, setTargetCorpus] = useState<number>(initialTargetCorpus);
  const [targetAge, setTargetAge] = useState<number>(Math.max(inputs.currentAge + 1, inputs.retirementAge));
  const [appliedPathway, setAppliedPathway] = useState<string | null>(null);

  // Synchronize target age when inputs.retirementAge updates from external
  // components — adjusted during render (derived-state pattern) instead of
  // in an effect.
  const [prevAges, setPrevAges] = useState({ retirement: inputs.retirementAge, current: inputs.currentAge });
  if (prevAges.retirement !== inputs.retirementAge || prevAges.current !== inputs.currentAge) {
    setPrevAges({ retirement: inputs.retirementAge, current: inputs.currentAge });
    setTargetAge((prev) => (prev === inputs.retirementAge ? prev : Math.max(inputs.currentAge + 1, inputs.retirementAge)));
  }

  const handleTargetAgeChange = (newAge: number) => {
    const validAge = Math.max(inputs.currentAge + 1, Math.min(newAge, inputs.lifeExpectancy - 1));
    setTargetAge(validAge);
    // Immediately write back to CalculatorContext so the entire plan updates in real-time
    updateInputs({ retirementAge: validAge });
  };

  const result = useMemo(() => {
    return runReversePlanning(inputs, wealthResult, {
      targetCorpus,
      targetAge,
    });
  }, [inputs, wealthResult, targetCorpus, targetAge]);

  // Solver Action 1: Apply Required Monthly SIP
  const handleApplyRequiredSip = () => {
    updateSIP({ amount: result.requiredMonthlySip });
    logDecision({
      category: 'sip',
      actionTitle: `Applied Required SIP: ${formatCurrency(result.requiredMonthlySip)}/mo`,
      summary: `Adjusted monthly SIP from ${formatCurrency(inputs.sip.amount)} to ${formatCurrency(result.requiredMonthlySip)} to fund ${formatCurrencyCompact(targetCorpus)} milestone.`,
      previousValue: `${formatCurrency(inputs.sip.amount)}/mo`,
      newValue: `${formatCurrency(result.requiredMonthlySip)}/mo`,
      rationale: `Solved monthly contribution required to achieve ${formatCurrencyCompact(targetCorpus)} by age ${targetAge} at ${inputs.sip.stepUp}% annual step-up.`,
      author: 'Advisor',
      revertPatch: { sip: { ...inputs.sip } },
    });
    showToast(`Monthly SIP updated to ${formatCurrency(result.requiredMonthlySip)}!`, 'success');
  };

  // Solver Action 2: Apply Feasible Retirement Age
  const handleApplyFeasibleAge = () => {
    updateInputs({ retirementAge: result.feasibleRetirementAge });
    setTargetAge(result.feasibleRetirementAge);
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Feasible Retirement Age: ${result.feasibleRetirementAge}`,
      summary: `Calibrated target retirement age from ${inputs.retirementAge} to ${result.feasibleRetirementAge} based on current SIP runway.`,
      previousValue: `Age ${inputs.retirementAge}`,
      newValue: `Age ${result.feasibleRetirementAge}`,
      rationale: `Compounding at the current SIP rate of ${formatCurrency(inputs.sip.amount)}/mo reaches ${formatCurrencyCompact(targetCorpus)} at age ${result.feasibleRetirementAge}.`,
      author: 'Advisor',
      revertPatch: { retirementAge: inputs.retirementAge },
    });
    showToast(`Retirement age shifted to ${result.feasibleRetirementAge}!`, 'success');
  };

  // Solver Action 3: Apply Max Sustainable Spend
  const handleApplySustainableSpend = () => {
    updateSWP({ monthlyNeedToday: result.maxSustainableMonthlySpend });
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Sustainable Living Spend: ${formatCurrency(result.maxSustainableMonthlySpend)}/mo`,
      summary: `Calibrated post-retirement monthly living expenditure to ${formatCurrency(result.maxSustainableMonthlySpend)} (today's purchasing power).`,
      previousValue: `${formatCurrency(inputs.swp.monthlyNeedToday)}/mo`,
      newValue: `${formatCurrency(result.maxSustainableMonthlySpend)}/mo`,
      rationale: `Calibrated decumulation to the maximum sustainable annuity yield over ${inputs.lifeExpectancy - targetAge} years from target corpus.`,
      author: 'Advisor',
      revertPatch: { swp: { ...inputs.swp } },
    });
    showToast(`Retirement living budget updated to ${formatCurrency(result.maxSustainableMonthlySpend)}/mo!`, 'success');
  };

  // 1-Click Apply for 4 Strategic Pathways
  const handleApplyPathway = (pathway: ReversePathway) => {
    updateInputs(pathway.patch);
    if (pathway.patch.retirementAge) {
      setTargetAge(pathway.patch.retirementAge);
    }
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Reverse Planning: ${pathway.name}`,
      summary: `${pathway.primaryAction} to achieve ${formatCurrencyCompact(targetCorpus)} target corpus.`,
      newValue: `${formatCurrencyCompact(pathway.targetCorpus)} Target`,
      rationale: pathway.tradeOffDescription,
      author: 'Advisor',
      revertPatch: {
        retirementAge: inputs.retirementAge,
        sip: { ...inputs.sip },
        swp: { ...inputs.swp },
      },
    });
    setAppliedPathway(pathway.id);
    showToast(`Applied "${pathway.name}" to Master Plan!`, 'success');
  };

  const isSipAlreadyApplied = inputs.sip.amount === result.requiredMonthlySip;
  const isAgeAlreadyApplied = inputs.retirementAge === result.feasibleRetirementAge;
  const isSpendAlreadyApplied = inputs.swp.monthlyNeedToday === result.maxSustainableMonthlySpend;

  const milestonePresets = [50000000, 75000000, 100000000, 150000000];
  const agePresets = [45, 50, 55, 58, 60].filter(
    (age) => age > inputs.currentAge && age < inputs.lifeExpectancy,
  );

  const pathwayChartData = useMemo(
    () =>
      result.pathways.map((p) => ({
        id: p.id,
        name: p.name,
        requiredSipMonthly: p.requiredSipMonthly,
        projectedRetirementAge: p.projectedRetirementAge,
        successProbability: p.successProbability,
      })),
    [result.pathways],
  );

  const cheapestPathway = useMemo(
    () => pathwayChartData.reduce((a, b) => (b.requiredSipMonthly < a.requiredSipMonthly ? b : a), pathwayChartData[0]),
    [pathwayChartData],
  );
  const fastestPathway = useMemo(
    () => pathwayChartData.reduce((a, b) => (b.projectedRetirementAge < a.projectedRetirementAge ? b : a), pathwayChartData[0]),
    [pathwayChartData],
  );

  if (!wealthResult.isConfigured) {
    return (
      <EmptyState
        eyebrow="Reverse planning"
        title="Configure a plan before solving backwards"
        description="Add the client's profile, current position and planning horizon first. Reverse planning will then solve the exact savings or timing needed to reach a target."
        action={<a href="/master-plan" className="text-sm font-semibold text-accent-strong underline underline-offset-4">Open Master Plan</a>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Milestone Configuration Card */}
      <Card className="border border-border bg-raised shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-deep text-deep rounded-lg">
                <Compass size={18} />
              </span>
              <h3 className="text-xl font-sans font-bold text-ink tracking-tight">
                Reverse Planning & Target Milestone Solver
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                Milestone Solver
              </Badge>
            </div>
            <p className="text-xs text-muted mt-1">
              Set your target retirement corpus milestone to compute required monthly contributions, required capital, and feasible retirement timelines.
            </p>
          </div>
        </div>

        {/* Milestone Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-surface rounded-2xl border border-border">
          <div className="space-y-2.5">
            <CurrencyInput
              label="Target Retirement Corpus Milestone"
              value={targetCorpus}
              onChange={setTargetCorpus}
              helper={`Current projected corpus: ${formatCurrencyCompact(wealthResult.terminalValue)}`}
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-muted">Presets:</span>
              {milestonePresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetCorpus(amt)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors cursor-pointer ${
                    targetCorpus === amt
                      ? 'bg-deep text-deep shadow-2xs'
                      : 'bg-raised border border-border text-ink-soft hover:bg-sunken hover:border-border'
                  }`}
                >
                  {formatCurrencyCompact(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Slider
              label="Target Retirement Age"
              value={targetAge}
              onChange={handleTargetAgeChange}
              min={inputs.currentAge + 1}
              max={Math.min(75, inputs.lifeExpectancy - 5)}
              step={1}
              suffix=" yrs old"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-muted">Age Presets:</span>
              {agePresets.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => handleTargetAgeChange(age)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors cursor-pointer ${
                    targetAge === age
                      ? 'bg-deep text-deep shadow-2xs'
                      : 'bg-raised border border-border text-ink-soft hover:bg-sunken hover:border-border'
                  }`}
                >
                  Age {age}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted pt-0.5">
              <span>Current Age: {inputs.currentAge}</span>
              <span className="font-semibold text-ink">{result.yearsToTarget} Years Compounding</span>
              <span>Life Expectancy: {inputs.lifeExpectancy}</span>
            </div>
          </div>
        </div>

        {/* 1-Click Solver Action Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <Layers size={14} className="text-ink-soft" />
              Target Solver Diagnostics & 1-Click Plan Actions
            </h4>
            <span className="text-[11px] text-muted font-medium">Click any lever to immediately synchronize with Master Plan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lever 1: Required Monthly SIP */}
            <div className="bg-raised p-4 rounded-2xl border border-border shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-muted mb-1">
                  <span>Required Monthly SIP</span>
                  <TrendingUp size={14} className="text-ink-soft" />
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {formatCurrency(result.requiredMonthlySip)}
                </div>
                <p className="text-xs text-muted mt-1 leading-snug">
                  Current SIP: <strong>{formatCurrency(inputs.sip.amount)}/mo</strong> ({result.requiredMonthlySip > inputs.sip.amount ? `+${formatCurrency(result.requiredMonthlySip - inputs.sip.amount)}` : 'Sufficient'}).
                </p>
              </div>
              <Button
                size="sm"
                variant={isSipAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplyRequiredSip}
                disabled={isSipAlreadyApplied || result.requiredMonthlySip <= 0}
                className={`w-full text-xs font-semibold ${
                  isSipAlreadyApplied
                    ? 'border-accent text-accent-strong bg-accent-softer'
                    : 'bg-deep text-deep hover:bg-deep'
                }`}
              >
                {isSipAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-accent-strong" /> Current SIP
                  </>
                ) : (
                  'Apply Required SIP'
                )}
              </Button>
            </div>

            {/* Lever 2: Feasible Retirement Age */}
            <div className="bg-raised p-4 rounded-2xl border border-border shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-muted mb-1">
                  <span>Feasible Retirement Age</span>
                  <Clock size={14} className="text-ink-soft" />
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  Age {result.feasibleRetirementAge}
                </div>
                <p className="text-xs text-muted mt-1 leading-snug">
                  At current SIP: {result.feasibleRetirementAge === inputs.retirementAge ? 'Matches planned age' : `${result.feasibleRetirementAge > inputs.retirementAge ? `+${result.feasibleRetirementAge - inputs.retirementAge}` : result.feasibleRetirementAge - inputs.retirementAge} yrs vs Age ${inputs.retirementAge}`}.
                </p>
              </div>
              <Button
                size="sm"
                variant={isAgeAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplyFeasibleAge}
                disabled={isAgeAlreadyApplied}
                className={`w-full text-xs font-semibold ${
                  isAgeAlreadyApplied
                    ? 'border-accent text-accent-strong bg-accent-softer'
                    : 'bg-deep text-deep hover:bg-deep'
                }`}
              >
                {isAgeAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-accent-strong" /> Current Age
                  </>
                ) : (
                  `Retire at Age ${result.feasibleRetirementAge}`
                )}
              </Button>
            </div>

            {/* Lever 3: Max Sustainable Spend */}
            <div className="bg-raised p-4 rounded-2xl border border-border shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-muted mb-1">
                  <span>Max Sustainable Spend</span>
                  <ShieldCheck size={14} className="text-accent-strong" />
                </div>
                <div className="text-xl font-bold font-mono text-accent-strong">
                  {formatCurrency(result.maxSustainableMonthlySpend)}/mo
                </div>
                <p className="text-xs text-muted mt-1 leading-snug">
                  Target spend today: <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}/mo</strong>.
                </p>
              </div>
              <Button
                size="sm"
                variant={isSpendAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplySustainableSpend}
                disabled={isSpendAlreadyApplied || result.maxSustainableMonthlySpend <= 0}
                className={`w-full text-xs font-semibold ${
                  isSpendAlreadyApplied
                    ? 'border-accent text-accent-strong bg-accent-softer'
                    : 'bg-deep text-deep hover:bg-deep'
                }`}
              >
                {isSpendAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-accent-strong" /> Spend Applied
                  </>
                ) : (
                  'Apply Sustainable Spend'
                )}
              </Button>
            </div>

            {/* Lever 4: Required Capital Today */}
            <div className="bg-raised p-4 rounded-2xl border border-border shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-muted mb-1">
                  <span>Required Capital Today</span>
                  <DollarSign size={14} className="text-ink-soft" />
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {formatCurrencyCompact(result.requiredInitialCorpus)}
                </div>
                <p className="text-xs text-muted mt-1 leading-snug">
                  Net worth: {formatCurrencyCompact(currentWealth)} ({currentWealth >= result.requiredInitialCorpus ? (
                    <span className="text-accent-strong font-semibold">Surplus</span>
                  ) : (
                    <span className="text-negative font-semibold">Shortfall {formatCurrencyCompact(result.requiredInitialCorpus - currentWealth)}</span>
                  )}).
                </p>
              </div>
              <div className="text-[11px] text-muted py-1.5 px-2 bg-surface rounded-lg text-center font-medium border border-border">
                Lump sum capital requirement
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Pathway Comparison Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border bg-raised shadow-2xs space-y-3">
          <h4 className="text-sm font-sans font-bold text-ink flex items-center gap-2">
            <GitCompare size={16} className="text-ink-soft" />
            Required Monthly SIP per Pathway
          </h4>
          <p className="text-xs text-ink-soft">
            {cheapestPathway ? `"${cheapestPathway.name}" demands the lowest commitment at ${formatCurrency(cheapestPathway.requiredSipMonthly)}/mo; the spread across pathways shows how spend, age, and SIP levers trade off against each other.` : ''}
          </p>
          <div
            className="h-64 w-full"
            role="img"
            aria-label={`Horizontal bar chart of required monthly SIP per pathway. Lowest: ${cheapestPathway ? `${cheapestPathway.name} at ${formatCurrency(cheapestPathway.requiredSipMonthly)} per month` : 'n/a'}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pathwayChartData} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => formatCurrencyCompact(v)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, _name: any, item: any) => [
                    `${formatCurrency(Number(value))}/mo · ${Number(item?.payload?.successProbability ?? 0)}% success`,
                    'Required SIP',
                  ]}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    padding: '10px 14px',
                  }}
                />
                <Bar dataKey="requiredSipMonthly" name="Required SIP" radius={[0, 4, 4, 0]} minPointSize={2}>
                  {pathwayChartData.map((p) => (
                    <Cell key={p.id} style={{ fill: 'var(--color-accent)' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Required monthly SIP per pathway</caption>
            <thead>
              <tr><th>Pathway</th><th>Required SIP</th><th>Success probability</th></tr>
            </thead>
            <tbody>
              {pathwayChartData.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatCurrency(p.requiredSipMonthly)}</td>
                  <td>{p.successProbability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="border border-border bg-raised shadow-2xs space-y-3">
          <h4 className="text-sm font-sans font-bold text-ink flex items-center gap-2">
            <Clock size={16} className="text-ink-soft" />
            Feasible Retirement Age Timeline
          </h4>
          <p className="text-xs text-ink-soft">
            {fastestPathway ? `"${fastestPathway.name}" reaches the milestone earliest at age ${fastestPathway.projectedRetirementAge}; bars right of the dashed line retire later than the current plan (age ${inputs.retirementAge}).` : ''}
          </p>
          <div
            className="h-64 w-full"
            role="img"
            aria-label={`Horizontal bar chart of projected retirement age per pathway relative to the current plan age of ${inputs.retirementAge}. Earliest: ${fastestPathway ? `${fastestPathway.name} at age ${fastestPathway.projectedRetirementAge}` : 'n/a'}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pathwayChartData} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickFormatter={(v: number) => `Age ${v}`}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => [`Age ${Number(value)}`, 'Projected retirement age']}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    padding: '10px 14px',
                  }}
                />
                <ReferenceLine x={inputs.retirementAge} stroke="var(--color-warning)" strokeDasharray="5 4" />
                <Bar dataKey="projectedRetirementAge" name="Projected retirement age" radius={[0, 4, 4, 0]} minPointSize={2}>
                  {pathwayChartData.map((p) => (
                    <Cell
                      key={p.id}
                      style={{ fill: p.projectedRetirementAge <= inputs.retirementAge ? 'var(--color-accent)' : 'var(--color-info)' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-accent" /> At/before plan age</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-info" /> Later than plan</span>
            <span className="text-muted">Dashed line = current plan (age {inputs.retirementAge})</span>
          </div>
          <table className="sr-only">
            <caption>Projected retirement age per pathway versus the current plan age</caption>
            <thead>
              <tr><th>Pathway</th><th>Projected retirement age</th><th>Current plan age</th></tr>
            </thead>
            <tbody>
              {pathwayChartData.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.projectedRetirementAge}</td>
                  <td>{inputs.retirementAge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* 4 Strategic Pathways */}
      <div className="space-y-4">
        <div>
          <h4 className="text-base font-sans font-bold text-ink tracking-tight">
            Strategic Implementation Pathways
          </h4>
          <p className="text-xs text-muted">
            Four mathematical pathways to achieve {formatCurrencyCompact(targetCorpus)}:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.pathways.map((p) => {
            const isApplied = appliedPathway === p.id;
            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between border transition-all ${
                  isApplied
                    ? 'border-accent bg-accent-softer/20 shadow-2xs'
                    : 'border-border bg-raised hover:border-border shadow-2xs'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted">
                        {p.tagline}
                      </span>
                      <h4 className="text-base font-bold text-ink mt-0.5">{p.name}</h4>
                    </div>
                    <Badge
                      variant={p.successProbability >= 94 ? 'success' : 'navy'}
                      className="text-[10px] font-mono shrink-0"
                    >
                      {p.successProbability}% Success
                    </Badge>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-border text-xs text-ink-soft font-medium leading-relaxed">
                    {p.summary}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-raised rounded-xl border border-border">
                      <span className="text-[10px] text-muted uppercase font-bold block">Monthly SIP</span>
                      <span className="font-bold font-mono text-ink">{formatCurrency(p.requiredSipMonthly)}</span>
                    </div>
                    <div className="p-2.5 bg-raised rounded-xl border border-border">
                      <span className="text-[10px] text-muted uppercase font-bold block">Retirement Age</span>
                      <span className="font-bold font-mono text-ink">Age {p.projectedRetirementAge}</span>
                    </div>
                    <div className="p-2.5 bg-raised rounded-xl border border-border">
                      <span className="text-[10px] text-muted uppercase font-bold block">Post-Ret Spend</span>
                      <span className="font-bold font-mono text-ink">{formatCurrency(p.monthlyRetirementSpending)}/mo</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-ink-soft leading-snug">
                    <strong className="text-ink">Trade-Off Analysis:</strong> {p.tradeOffDescription}
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{p.primaryAction}</span>
                  <Button
                    size="sm"
                    variant={isApplied ? 'outline' : 'primary'}
                    onClick={() => handleApplyPathway(p)}
                    className={
                      isApplied
                        ? 'border-accent text-accent-strong bg-accent-softer text-xs font-semibold'
                        : 'bg-deep text-deep hover:bg-deep text-xs font-semibold'
                    }
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={13} className="mr-1 text-accent-strong" />
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
