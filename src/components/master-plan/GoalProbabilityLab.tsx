import { useDeferredValue, useMemo, useState } from 'react';
import { Activity, Dices, TrendingUp, TriangleAlert } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { FormSection } from '../ui/FormSection';
import { GoalLabFanChart } from '../charts/GoalLabFanChart';
import { useCalculator } from '../../context/CalculatorContext';
import { simulateGoalPlan } from '../../lib/goalMonteCarlo';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { GoalPriority } from '../../types';

const CONFIDENCE_OPTIONS = [0.7, 0.8, 0.9];
const SIM_OPTIONS = [500, 1000, 2500];

const PRIORITY_TONE: Record<GoalPriority, string> = {
  essential: 'text-negative',
  important: 'text-info',
  aspirational: 'text-muted',
};

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

/**
 * Monte Carlo goal-funding lab: simulates the shared household corpus with a
 * goal waterfall and reports per-goal success probabilities, expected
 * shortfalls, and the SIP required to hit a chosen confidence. The SIP
 * control is a what-if — it never writes back to the plan.
 */
export const GoalProbabilityLab = () => {
  const { inputs, assumptions, wealthResult } = useCalculator();
  const [sipOverride, setSipOverride] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0.8);
  const [simulations, setSimulations] = useState(1000);
  const [seed, setSeed] = useState(() => Date.now().toString(36));

  const planSIP = inputs.sip.amount || 0;
  const effectiveSIP = sipOverride ?? planSIP;
  const deferredSIP = useDeferredValue(effectiveSIP);

  const investable = useMemo(
    () => inputs.assets.reduce((sum, a) => sum + (a.value || 0), 0),
    [inputs.assets],
  );

  const weights = wealthResult.targetAllocation;
  const goals = inputs.goals;

  const result = useMemo(
    () =>
      simulateGoalPlan({
        goals,
        currentPortfolioValue: investable,
        monthlySIP: deferredSIP,
        sipStepUp: inputs.sip.stepUp || 0,
        portfolioWeights: weights,
        assumptions,
        simulations,
        seed,
        targetConfidence: confidence,
      }),
    [goals, investable, deferredSIP, inputs.sip.stepUp, weights, assumptions, simulations, seed, confidence],
  );

  const cumulativeCost = useMemo(() => {
    const byYear = new Map<number, number>();
    let running = 0;
    for (const g of [...goals]
      .filter((g) => g.yearsToGoal > 0 && g.targetAmount > 0)
      .sort((a, b) => a.yearsToGoal - b.yearsToGoal)) {
      running += g.targetAmount * Math.pow(1 + (g.inflation || 0) / 100, g.yearsToGoal);
      byYear.set(Math.max(1, Math.round(g.yearsToGoal)), running);
    }
    // Forward-fill so the step line renders across the whole horizon.
    const maxYear = Math.max(0, ...byYear.keys());
    const filled: { year: number; cost: number }[] = [];
    let cost = 0;
    for (let y = 1; y <= maxYear; y++) {
      cost = byYear.get(y) ?? cost;
      filled.push({ year: y, cost });
    }
    return filled;
  }, [goals]);

  if (goals.length === 0) return null;

  const markers = result.goals.map((g) => ({ year: g.horizonYear, name: g.name, cost: g.costAtHorizon }));
  const onTrack = result.planSuccessRate >= confidence;
  const sipDelta = result.requiredSIP - planSIP;

  return (
    <FormSection
      index="02"
      title="Goal probability lab"
      description="Simulated corpus growth with each goal deducted at its horizon. Later goals inherit earlier shortfalls."
      meta={`${result.simulations.toLocaleString()} paths · seed ${seed}`}
      badge={onTrack ? 'complete' : result.planSuccessRate > 0.3 ? 'partial' : 'empty'}
    >
      {/* What-if controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-4 items-end">
        <div className="md:col-span-4">
          <NumberInput
            layout="inline"
            label="Monthly SIP (what-if)"
            value={effectiveSIP}
            onChange={setSipOverride}
            suffix="/mo"
            min={0}
            max={1000000}
            step={5000}
            slider="focus"
            helper={sipOverride !== null && sipOverride !== planSIP ? `Plan SIP is ${formatCurrency(planSIP)}/mo — this override is local to the lab` : undefined}
          />
        </div>
        <div className="md:col-span-3">
          <span className="text-[11px] uppercase tracking-[0.08em] text-faint">Confidence target</span>
          <div className="flex gap-1 mt-1.5">
            {CONFIDENCE_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConfidence(c)}
                aria-pressed={confidence === c}
                className={cn(
                  'px-2.5 min-h-8 text-xs font-mono rounded-md border transition-colors cursor-pointer',
                  confidence === c
                    ? 'border-accent bg-accent text-on-inkfill'
                    : 'border-border text-muted hover:text-ink hover:border-border-strong',
                )}
              >
                {pct(c)}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-3">
          <span className="text-[11px] uppercase tracking-[0.08em] text-faint">Simulation paths</span>
          <div className="flex gap-1 mt-1.5">
            {SIM_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSimulations(s)}
                aria-pressed={simulations === s}
                className={cn(
                  'px-2.5 min-h-8 text-xs font-mono rounded-md border transition-colors cursor-pointer',
                  simulations === s
                    ? 'border-accent bg-accent text-on-inkfill'
                    : 'border-border text-muted hover:text-ink hover:border-border-strong',
                )}
              >
                {s.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 flex md:justify-end">
          <button
            type="button"
            onClick={() => setSeed(Date.now().toString(36))}
            className="inline-flex items-center gap-1.5 px-3 min-h-8 text-xs font-medium rounded-md border border-border text-muted hover:text-ink hover:border-border-strong transition-colors cursor-pointer"
          >
            <Dices size={13} strokeWidth={1.8} aria-hidden="true" />
            Re-run
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-border bg-border overflow-hidden">
        <div className="bg-surface px-4 py-3">
          <div className="eyebrow">Plan success</div>
          <div className={cn('mt-1 font-display text-2xl tabular-nums', onTrack ? 'text-positive' : 'text-negative')}>
            {pct(result.planSuccessRate)}
          </div>
          <div className="text-[11px] text-muted mt-0.5">all goals funded in {pct(result.planSuccessRate)} of paths</div>
        </div>
        <div className="bg-surface px-4 py-3">
          <div className="eyebrow">Goals at {pct(confidence)}</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-ink">
            {result.fundedGoalCount}
            <span className="text-muted text-lg"> / {result.goals.length}</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">meet the confidence target</div>
        </div>
        <div className="bg-surface px-4 py-3">
          <div className="eyebrow">Required SIP</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-ink">
            {formatCurrencyCompact(result.requiredSIP)}
            <span className="text-muted text-sm font-sans"> /mo</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {sipDelta > 0 ? (
              <span className="inline-flex items-center gap-1 text-negative">
                <TriangleAlert size={11} strokeWidth={1.8} aria-hidden="true" />
                {formatCurrencyCompact(sipDelta)}/mo above plan
              </span>
            ) : (
              'plan SIP already suffices'
            )}
          </div>
        </div>
        <div className="bg-surface px-4 py-3">
          <div className="eyebrow">Total goal cost</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-ink">
            {formatCurrencyCompact(result.totalCostAtFinalHorizon)}
          </div>
          <div className="text-[11px] text-muted mt-0.5">inflated, across all horizons</div>
        </div>
      </div>

      {/* Fan chart */}
      <div className="mt-6">
        <GoalLabFanChart
          data={result.yearlyCorpus}
          markers={markers}
          cumulativeCost={cumulativeCost}
          ariaLabel="Simulated household corpus fan against cumulative goal cost"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[11px] text-muted font-mono">
          <span className="inline-flex items-center gap-1.5">
            <Activity size={11} strokeWidth={1.8} aria-hidden="true" /> p5–p95 corpus band
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp size={11} strokeWidth={1.8} aria-hidden="true" /> median corpus
          </span>
          {markers.map((m) => (
            <span key={`${m.year}-${m.name}`} className="inline-flex items-center gap-1.5" title={`${m.name} — deducted at year ${m.year}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-brass" aria-hidden="true" />
              {m.name} · y{m.year} · {formatCurrencyCompact(m.cost)}
            </span>
          ))}
        </div>
      </div>

      {/* Per-goal table */}
      <div className="mt-6 border-t border-border">
        {result.goals.map((g) => {
          const atTarget = g.successRate >= confidence;
          return (
            <div key={g.goalId} className="grid grid-cols-12 gap-x-4 items-center py-3 border-b border-border">
              <div className="col-span-12 sm:col-span-4 min-w-0">
                <div className="truncate text-sm font-medium text-ink">{g.name}</div>
                <div className={cn('text-[10px] uppercase tracking-[0.08em] font-mono mt-0.5', PRIORITY_TONE[g.priority] ?? 'text-muted')}>
                  {g.priority} · year {g.horizonYear}
                </div>
              </div>
              <div className="col-span-5 sm:col-span-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-sunken overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-[width]', atTarget ? 'bg-positive' : 'bg-negative')}
                      style={{ width: `${Math.min(100, g.successRate * 100)}%` }}
                    />
                  </div>
                  <span className={cn('font-mono text-xs tabular-nums shrink-0', atTarget ? 'text-positive' : 'text-negative')}>
                    {pct(g.successRate)}
                  </span>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-2 font-mono text-xs tabular-nums text-muted">
                cost {formatCurrencyCompact(g.costAtHorizon)}
              </div>
              <div className="col-span-3 sm:col-span-2 font-mono text-xs tabular-nums text-muted">
                median {formatCurrencyCompact(g.medianCorpusAtHorizon)}
              </div>
              <div className="col-span-12 sm:col-span-1 font-mono text-xs tabular-nums text-right">
                {g.expectedShortfall > 0 ? (
                  <span className="text-negative" title="Mean shortfall across failing paths">
                    −{formatCurrencyCompact(g.expectedShortfall)}
                  </span>
                ) : (
                  <span className="text-positive">funded</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </FormSection>
  );
};
