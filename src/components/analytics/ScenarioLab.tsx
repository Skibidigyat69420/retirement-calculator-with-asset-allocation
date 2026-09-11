import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RotateCcw,
  Pencil,
  Check,
} from 'lucide-react';
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
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { FinancialMetric } from '../ui/FinancialMetric';
import { EmptyState } from '../ui/EmptyState';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useCalculator } from '../../context/CalculatorContext';
import { runWealthEngine, type WealthEngineResult } from '../../lib/wealthEngine';
import { requiredMonthlySIPForGoal } from '../../lib/goals';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { cn } from '../../lib/utils';
import type { MasterPlanInputs, RiskProfile } from '../../types';

type RailId = 'base' | 'conservative' | 'optimistic' | 'what-if' | 'stress';

interface RailEntry {
  id: RailId;
  label: string;
  description: string;
  scenarioInputs: MasterPlanInputs;
  result: WealthEngineResult;
  editable?: boolean;
}

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-raised)',
  boxShadow: 'var(--shadow-popover)',
  padding: '10px 14px',
  fontSize: '12px',
  color: 'var(--color-ink)',
};

/** Low-simulation profile for side-by-side scenario evaluation (same
 *  approach as src/lib/scenarioLab.ts). */
const fastProfile = {
  profile: {
    monteCarloSimulations: 80,
    goalSuccessThreshold: 70,
  } as unknown as RiskProfile,
  score: 50,
};

const signedCompact = (v: number | null): string => {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${formatCurrencyCompact(v)}`;
};

export const ScenarioLab = () => {
  const { inputs, wealthResult, assumptions, updateInputs, showToast } = useCalculator();
  const configured = wealthResult.isConfigured;

  // What-if model state — initialised from the live plan.
  const [whatIf, setWhatIf] = useState(() => ({
    retirementAge: inputs.retirementAge,
    monthlyInvestment: inputs.sip.amount,
    stepUp: inputs.sip.stepUp,
    inflation: inputs.inflation,
    returnShift: 0,
    lifestyle: inputs.swp.monthlyNeedToday,
  }));
  const [whatIfName, setWhatIfName] = useState('What-if');
  const [isRenaming, setIsRenaming] = useState(false);

  const [selectedId, setSelectedId] = useState<RailId>('base');
  const [preset, setPreset] = useState('market');

  const resetWhatIf = () => {
    setWhatIf({
      retirementAge: inputs.retirementAge,
      monthlyInvestment: inputs.sip.amount,
      stepUp: inputs.sip.stepUp,
      inflation: inputs.inflation,
      returnShift: 0,
      lifestyle: inputs.swp.monthlyNeedToday,
    });
    setPreset('market');
  };

  const whatIfInputs = useMemo<MasterPlanInputs>(
    () => ({
      ...inputs,
      retirementAge: whatIf.retirementAge,
      inflation: whatIf.inflation,
      sip: {
        ...inputs.sip,
        amount: whatIf.monthlyInvestment,
        stepUp: whatIf.stepUp,
        equityReturn: Math.max(1, inputs.sip.equityReturn + whatIf.returnShift),
        debtReturn: Math.max(1, inputs.sip.debtReturn + whatIf.returnShift),
      },
      swp: { ...inputs.swp, monthlyNeedToday: whatIf.lifestyle },
    }),
    [inputs, whatIf],
  );

  const railEntries = useMemo<RailEntry[]>(() => {
    if (!configured) return [];

    const conservativeInputs: MasterPlanInputs = {
      ...inputs,
      inflation: inputs.inflation + 1,
      sip: {
        ...inputs.sip,
        equityReturn: Math.max(1, inputs.sip.equityReturn - 2.5),
        debtReturn: Math.max(1, inputs.sip.debtReturn - 1),
      },
    };
    const optimisticInputs: MasterPlanInputs = {
      ...inputs,
      inflation: Math.max(4, inputs.inflation - 0.5),
      sip: { ...inputs.sip, equityReturn: inputs.sip.equityReturn + 2 },
    };
    const stressInputs: MasterPlanInputs = {
      ...inputs,
      inflation: Math.max(inputs.inflation, 8),
      assets: inputs.assets.map(a =>
        a.category === 'equity' ? { ...a, value: Math.round(a.value * 0.65) } : a,
      ),
    };

    return [
      { id: 'base', label: 'Base', description: 'The current master plan, unmodified.', scenarioInputs: inputs, result: wealthResult },
      {
        id: 'conservative',
        label: 'Conservative',
        description: 'Returns 2.5pp below plan, inflation 1pp higher.',
        scenarioInputs: conservativeInputs,
        result: runWealthEngine(conservativeInputs, assumptions, fastProfile),
      },
      {
        id: 'optimistic',
        label: 'Optimistic',
        description: 'Equity returns 2pp above plan, slightly lower inflation.',
        scenarioInputs: optimisticInputs,
        result: runWealthEngine(optimisticInputs, assumptions, fastProfile),
      },
      {
        id: 'what-if',
        label: whatIfName,
        description: 'Manipulate the model directly — every slider re-runs the projection.',
        scenarioInputs: whatIfInputs,
        result: runWealthEngine(whatIfInputs, assumptions, fastProfile),
        editable: true,
      },
      {
        id: 'stress',
        label: 'Stress',
        description: '35% equity drawdown at retirement plus 8% inflation.',
        scenarioInputs: stressInputs,
        result: runWealthEngine(stressInputs, assumptions, fastProfile),
      },
    ];
  }, [configured, inputs, wealthResult, assumptions, whatIfInputs, whatIfName]);

  const selected = railEntries.find(e => e.id === selectedId) ?? railEntries[0];

  // Required corpus under the live plan — the reference every scenario is measured against.
  const reference = useMemo(() => {
    const yearsToRet = Math.max(0, inputs.retirementAge - inputs.currentAge);
    const monthlyAtRet = inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, yearsToRet);
    const annualGross = (monthlyAtRet * 12) / (1 - inputs.swp.taxRate / 100);
    const postRet = inputs.swp.postRetirementReturn / 100;
    const infl = inputs.inflation / 100;
    const realReturn = (1 + postRet) / (1 + infl) - 1;
    const distYears = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);
    const required =
      realReturn <= 0
        ? annualGross * distYears
        : (annualGross * (1 - Math.pow(1 + realReturn, -distYears))) / realReturn;
    return { required, yearsToRet };
  }, [inputs]);

  const metricsFor = (entry: RailEntry | undefined) => {
    if (!entry) {
      return { corpus: null, probability: null, depletion: null, sipNeeded: null };
    }
    const retAge = entry.scenarioInputs.retirementAge;
    const snap =
      entry.result.snapshots.find(s => s.age === retAge) ??
      entry.result.snapshots.filter(s => s.phase === 'accumulation').slice(-1)[0];
    const corpus = guardNumber(snap?.total ?? null);
    const probability = guardNumber(entry.result.monteCarlo.successRate * 100);
    const depletion = entry.result.sustainable
      ? `Age ${entry.scenarioInputs.lifeExpectancy}+`
      : formatOrDash(entry.result.depletionAge, v => `Age ${v}`);
    const gap = corpus === null ? null : corpus - reference.required;
    const yearsToRet = Math.max(0, retAge - entry.scenarioInputs.currentAge);
    const blended =
      (entry.scenarioInputs.sip.equitySplit * entry.scenarioInputs.sip.equityReturn +
        entry.scenarioInputs.sip.debtSplit * entry.scenarioInputs.sip.debtReturn) / 100;
    const sipNeeded =
      gap !== null && gap < 0 && yearsToRet > 0
        ? Math.round(requiredMonthlySIPForGoal(-gap, yearsToRet, blended))
        : null;
    return { corpus, probability, depletion, sipNeeded };
  };

  const selectedMetrics = metricsFor(selected);
  const baseMetrics = metricsFor(railEntries[0]);

  const chartData = useMemo(
    () => (selected ? selected.result.snapshots.map(s => ({ label: `Age ${s.age}`, total: s.total })) : []),
    [selected],
  );

  const handleApply = (entry: RailEntry) => {
    updateInputs(entry.scenarioInputs);
    showToast(`Applied "${entry.label}" to the master plan.`, 'success');
  };

  const handlePreset = (value: string) => {
    setPreset(value);
    setWhatIf(prev => ({
      ...prev,
      returnShift: value === 'conservative' ? -2 : value === 'historical' ? 1 : 0,
      inflation: value === 'conservative' ? inputs.inflation + 1 : inputs.inflation,
    }));
  };

  if (!configured) {
    return (
      <EmptyState
        icon={FlaskConical}
        eyebrow="SCENARIO LAB"
        title="Scenarios need a configured plan"
        description="Set up the client's profile, retirement target and financial position on the master plan before running scenario comparisons."
        action={
          <Link to="/master-plan">
            <Button>
              Configure master plan <ArrowRight size={15} strokeWidth={1.8} />
            </Button>
          </Link>
        }
      />
    );
  }

  const deltaCorpus =
    selectedMetrics.corpus !== null && baseMetrics.corpus !== null
      ? selectedMetrics.corpus - baseMetrics.corpus
      : null;
  const deltaProb =
    selectedMetrics.probability !== null && baseMetrics.probability !== null
      ? selectedMetrics.probability - baseMetrics.probability
      : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <div className="eyebrow">SCENARIO LAB</div>
        <h3 className="font-display text-3xl sm:text-4xl text-ink mt-2">
          Explore the futures your client could face.
        </h3>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Five lenses on the same plan — a conservative tape, an optimistic tape, a market stress, and a
          what-if model you can manipulate live. Deltas are measured against the base plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6">
        {/* Left scenario rail */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible" role="tablist" aria-label="Scenarios">
          {railEntries.map(entry => {
            const m = metricsFor(entry);
            const active = entry.id === selectedId;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedId(entry.id)}
                className={cn(
                  'shrink-0 lg:w-full text-left px-3.5 py-3 rounded-md border transition-colors cursor-pointer select-none',
                  active
                    ? 'border-accent bg-accent-soft/50 shadow-card'
                    : 'border-border bg-surface hover:border-border-strong',
                )}
              >
                <span className="block text-[13px] font-semibold text-ink truncate">{entry.label}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                  <span className="text-muted">{formatPercent(m.probability ?? 0, 0)}</span>
                  {entry.id !== 'base' && m.corpus !== null && baseMetrics.corpus !== null && (
                    <span className={cn('inline-flex items-center gap-0.5', m.corpus - baseMetrics.corpus >= 0 ? 'text-positive' : 'text-negative')}>
                      {m.corpus - baseMetrics.corpus >= 0 ? <TrendingUp size={11} strokeWidth={1.8} /> : <TrendingDown size={11} strokeWidth={1.8} />}
                      {signedCompact(m.corpus - baseMetrics.corpus)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Central panel */}
        <div className="space-y-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {selected?.editable && isRenaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    setIsRenaming(false);
                  }}
                >
                  <input
                    value={whatIfName}
                    onChange={e => setWhatIfName(e.currentTarget.value)}
                    autoFocus
                    aria-label="Scenario name"
                    className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-[15px] font-semibold text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  />
                  <Button size="sm" variant="secondary" onClick={() => setIsRenaming(false)}>
                    <Check size={13} strokeWidth={1.8} /> Save
                  </Button>
                </form>
              ) : (
                <h4 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
                  {selected?.label}
                  {selected?.editable && (
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      aria-label="Rename scenario"
                      className="text-faint hover:text-ink transition-colors cursor-pointer"
                    >
                      <Pencil size={13} strokeWidth={1.7} />
                    </button>
                  )}
                </h4>
              )}
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{selected?.description}</p>
            </div>
            {selected && (
              <div className="flex items-center gap-2 shrink-0">
                {selected.id === 'what-if' && (
                  <Button variant="ghost" size="sm" onClick={resetWhatIf}>
                    <RotateCcw size={13} strokeWidth={1.8} /> Reset
                  </Button>
                )}
                {selected.id !== 'base' && (
                  <Button size="sm" onClick={() => handleApply(selected)}>
                    Apply to plan <ArrowRight size={13} strokeWidth={1.8} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Projection chart */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <span className="eyebrow">Projection</span>
              <span className="flex items-center gap-4 text-[11px] text-muted font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-accent inline-block" /> Scenario
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-5 border-t border-dashed border-brass inline-block" /> Required
                </span>
              </span>
            </div>
            <div className="h-72 w-full" role="img" aria-label={`Corpus projection for the ${selected?.label ?? ''} scenario`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scenarioLabFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.13} />
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
                    interval={Math.max(0, Math.ceil(chartData.length / 9) - 1)}
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
                    y={reference.required}
                    stroke="var(--color-brass)"
                    strokeDasharray="6 4"
                    strokeWidth={1.4}
                    label={{
                      value: `Required ${formatCurrencyCompact(reference.required)}`,
                      position: 'insideTopRight',
                      fill: 'var(--color-brass-strong)',
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
                    fill="url(#scenarioLabFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive
                    animationDuration={500}
                    animationBegin={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key outcomes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-y border-border py-5">
            <FinancialMetric
              label="Corpus at retirement"
              value={selectedMetrics.corpus === null ? null : formatCurrencyCompact(selectedMetrics.corpus)}
              size="sm"
              hint={`Age ${selected?.scenarioInputs.retirementAge ?? inputs.retirementAge}`}
            />
            <FinancialMetric
              label="Plan probability"
              value={selectedMetrics.probability === null ? null : formatPercent(selectedMetrics.probability)}
              size="sm"
              hint="Monte Carlo"
            />
            <FinancialMetric
              label="Depletion age"
              value={selectedMetrics.depletion}
              size="sm"
              hint={selected?.result.sustainable ? 'Outlasts life expectancy' : 'Corpus runs out early'}
            />
            <FinancialMetric
              label="SIP needed"
              value={selectedMetrics.sipNeeded === null ? null : formatCurrency(selectedMetrics.sipNeeded)}
              size="sm"
              hint={selectedMetrics.sipNeeded === null ? 'No shortfall to close' : 'Extra monthly, to close gap'}
            />
          </div>

          {/* Assumption rail — drives the what-if model */}
          {selectedId === 'what-if' && (
            <div className="rounded-lg border border-border bg-surface p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Assumptions</div>
                  <p className="text-xs text-muted mt-1">Every change re-runs the full projection engine live.</p>
                </div>
                <SegmentedControl
                  ariaLabel="Assumption presets"
                  value={preset}
                  onChange={handlePreset}
                  options={[
                    { value: 'market', label: 'Market' },
                    { value: 'conservative', label: 'Conservative' },
                    { value: 'historical', label: 'Historical' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-5">
                <Slider
                  label="Retirement age"
                  value={whatIf.retirementAge}
                  onChange={v => setWhatIf(prev => ({ ...prev, retirementAge: v }))}
                  min={inputs.currentAge + 1}
                  max={Math.max(inputs.currentAge + 2, inputs.lifeExpectancy - 1)}
                  step={1}
                  suffix=" yrs"
                />
                <Slider
                  label="Monthly investment"
                  value={whatIf.monthlyInvestment}
                  onChange={v => setWhatIf(prev => ({ ...prev, monthlyInvestment: v }))}
                  min={0}
                  max={Math.max(100000, inputs.sip.amount * 2, 50000)}
                  step={2500}
                  formatValue={v => formatCurrency(v)}
                />
                <Slider
                  label="SIP step-up"
                  value={whatIf.stepUp}
                  onChange={v => setWhatIf(prev => ({ ...prev, stepUp: v }))}
                  min={0}
                  max={15}
                  step={0.5}
                  suffix="% p.a."
                />
                <Slider
                  label="Inflation"
                  value={whatIf.inflation}
                  onChange={v => setWhatIf(prev => ({ ...prev, inflation: v }))}
                  min={4}
                  max={10}
                  step={0.5}
                  suffix="% p.a."
                />
                <Slider
                  label="Return shift"
                  value={whatIf.returnShift}
                  onChange={v => setWhatIf(prev => ({ ...prev, returnShift: v }))}
                  min={-5}
                  max={5}
                  step={0.5}
                  formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`}
                />
                <Slider
                  label="Lifestyle / mo"
                  value={whatIf.lifestyle}
                  onChange={v => setWhatIf(prev => ({ ...prev, lifestyle: v }))}
                  min={10000}
                  max={Math.max(300000, inputs.swp.monthlyNeedToday * 2)}
                  step={5000}
                  formatValue={v => formatCurrency(v)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison table — deltas live in their own column */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Comparison</div>
          <p className="text-xs text-muted mt-1">All scenarios measured against the base plan.</p>
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Scenario comparison table" tabIndex={0}>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
                <th className="py-2.5 pl-5 pr-4 font-medium">Scenario</th>
                <th className="py-2.5 pr-4 font-medium text-right">Corpus at retirement</th>
                <th className="py-2.5 pr-4 font-medium text-right">Δ Corpus</th>
                <th className="py-2.5 pr-4 font-medium text-right">Probability</th>
                <th className="py-2.5 pr-4 font-medium text-right">Δ Prob</th>
                <th className="py-2.5 pr-4 font-medium text-right">Depletion</th>
                <th className="py-2.5 pl-4 pr-5 font-medium text-right">SIP needed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {railEntries.map(entry => {
                const m = metricsFor(entry);
                const dCorpus = m.corpus !== null && baseMetrics.corpus !== null ? m.corpus - baseMetrics.corpus : null;
                const dProb = m.probability !== null && baseMetrics.probability !== null ? m.probability - baseMetrics.probability : null;
                const isBase = entry.id === 'base';
                return (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      entry.id === selectedId ? 'bg-accent-soft/40' : 'hover:bg-sunken/50',
                    )}
                  >
                    <td className="py-2.5 pl-5 pr-4">
                      <span className="font-medium text-ink">{entry.label}</span>
                      {isBase && <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-faint">Base</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink">
                      {m.corpus === null ? '—' : formatCurrencyCompact(m.corpus)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 pr-4 text-right font-mono tabular-nums',
                        isBase ? 'text-faint' : dCorpus === null ? 'text-faint' : dCorpus >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {isBase ? '—' : signedCompact(dCorpus)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink">
                      {m.probability === null ? '—' : formatPercent(m.probability, 0)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 pr-4 text-right font-mono tabular-nums',
                        isBase ? 'text-faint' : dProb === null ? 'text-faint' : dProb >= 0 ? 'text-positive' : 'text-negative',
                      )}
                    >
                      {isBase ? '—' : dProb === null ? '—' : `${dProb >= 0 ? '+' : ''}${dProb.toFixed(0)}pp`}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink">{m.depletion}</td>
                    <td className="py-2.5 pl-4 pr-5 text-right font-mono tabular-nums text-ink">
                      {m.sipNeeded === null ? '—' : formatCurrency(m.sipNeeded)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {deltaCorpus !== null && deltaProb !== null && (
          <p className="px-5 py-3 border-t border-border-subtle text-xs text-muted leading-relaxed">
            The <strong className="text-ink">{selected?.label}</strong> scenario moves the retirement corpus by{' '}
            <strong className={deltaCorpus >= 0 ? 'text-positive' : 'text-negative'}>{signedCompact(deltaCorpus)}</strong>{' '}
            and the plan probability by{' '}
            <strong className={deltaProb >= 0 ? 'text-positive' : 'text-negative'}>
              {deltaProb >= 0 ? '+' : ''}
              {deltaProb.toFixed(0)}pp
            </strong>{' '}
            versus the base plan.
          </p>
        )}
      </div>
    </section>
  );
};
