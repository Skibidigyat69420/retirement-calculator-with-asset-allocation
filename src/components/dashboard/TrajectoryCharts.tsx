import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PieChart } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeader } from '../ui/SectionHeader';
import { NetWorthEvolutionChart } from './charts/NetWorthEvolutionChart';
import { AllocationCompareChart } from './charts/AllocationCompareChart';
import { CashflowWaterfallChart } from './charts/CashflowWaterfallChart';
import { DonutChart } from '../charts/DonutChart';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';

/**
 * Trajectory, composition and cashflow — three chart compositions using the
 * shared chart components (which own their own theming). Display-only
 * derivations live here; all engine math stays in src/lib.
 */
export const TrajectoryCharts = () => {
  const { inputs, wealthResult, riskProfile } = useCalculator();

  const chartData = useMemo(
    () =>
      wealthResult.snapshots.map((s) => ({
        label: `Age ${s.age}`,
        nominal: s.total,
        real: s.realTotal,
      })),
    [wealthResult.snapshots],
  );

  const allocationData = useMemo(
    () =>
      Object.entries(wealthResult.currentAllocation)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name,
          value: value * wealthResult.netWorth,
          color: ASSET_COLORS[name as keyof typeof ASSET_COLORS] || '#94a3b8',
        })),
    [wealthResult],
  );

  const cashflowWaterfall = useMemo(() => {
    const income = wealthResult.annualIncome;
    const expenses = wealthResult.annualExpenses;
    const annualSIP = (wealthResult.monthlySIP || inputs.sip.amount) * 12;
    const surplus = Math.max(0, income - expenses - annualSIP);
    return [
      { name: 'Income', base: 0, value: income, kind: 'income' as const },
      { name: 'Expenses', base: Math.max(0, income - expenses), value: expenses, kind: 'expense' as const },
      { name: 'SIP', base: surplus, value: annualSIP, kind: 'sip' as const },
      { name: 'Surplus', base: 0, value: surplus, kind: 'surplus' as const },
    ];
  }, [wealthResult.annualIncome, wealthResult.annualExpenses, wealthResult.monthlySIP, inputs.sip.amount]);

  const retirementSnapshot = useMemo(
    () =>
      wealthResult.snapshots.find((s) => s.age >= inputs.retirementAge) ??
      wealthResult.snapshots[wealthResult.snapshots.length - 1] ??
      null,
    [wealthResult.snapshots, inputs.retirementAge],
  );

  const terminalSnapshot = wealthResult.snapshots[wealthResult.snapshots.length - 1] ?? null;

  const largestAllocationDrift = useMemo(() => {
    let best: { name: string; drift: number } | null = null;
    for (const [category, currentFrac] of Object.entries(wealthResult.currentAllocation)) {
      const driftPct =
        (currentFrac - (wealthResult.targetAllocation[category as keyof typeof wealthResult.targetAllocation] || 0)) * 100;
      if (Math.abs(driftPct) < 0.5) continue;
      if (!best || Math.abs(driftPct) > Math.abs(best.drift)) {
        best = { name: category, drift: driftPct };
      }
    }
    return best;
  }, [wealthResult.currentAllocation, wealthResult.targetAllocation]);

  const largestSleeve = allocationData.length > 0 ? allocationData.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const annualSIP = (wealthResult.monthlySIP || inputs.sip.amount) * 12;
  const annualSurplus = Math.max(0, wealthResult.annualIncome - wealthResult.annualExpenses - annualSIP);

  return (
    <div className="space-y-10">
      <div>
        <SectionHeader
          title="Wealth trajectory"
          description="Nominal growth against inflation-adjusted purchasing power."
          action={<Badge tone="neutral" dot={false}>Age {inputs.currentAge} → {inputs.lifeExpectancy}</Badge>}
          hairline
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 sm:p-6">
            <NetWorthEvolutionChart
              data={chartData}
              ariaLabel="Net-worth evolution chart showing projected nominal corpus and inflation-adjusted real corpus from current age to life expectancy"
              summary={`Projected corpus at retirement (age ${inputs.retirementAge}): ${retirementSnapshot ? formatCurrencyCompact(retirementSnapshot.total) : '₹0'}. Terminal corpus at age ${inputs.lifeExpectancy}: ${terminalSnapshot ? formatCurrencyCompact(terminalSnapshot.total) : '₹0'} nominal, ${terminalSnapshot ? formatCurrencyCompact(terminalSnapshot.realTotal) : '₹0'} in today's purchasing power.`}
            />
            <p className="text-xs text-muted border-t border-border-subtle pt-3 mt-4 leading-relaxed">
              Corpus reaches <strong className="text-ink font-medium">{retirementSnapshot ? formatCurrencyCompact(retirementSnapshot.total) : '—'}</strong> at
              retirement (age {inputs.retirementAge}) and{' '}
              <strong className="text-ink font-medium">{terminalSnapshot ? formatCurrencyCompact(terminalSnapshot.total) : '—'}</strong> by age{' '}
              {inputs.lifeExpectancy} — in today's money that is{' '}
              <strong className="text-ink font-medium">{terminalSnapshot ? formatCurrencyCompact(terminalSnapshot.realTotal) : '—'}</strong> after inflation.
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-ink tracking-tight">Current allocation</h3>
              <Badge tone="neutral" dot={false}>{allocationData.length} classes</Badge>
            </div>
            {allocationData.length > 0 ? (
              <DonutChart data={allocationData} />
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-center text-sm text-muted gap-2">
                <PieChart size={28} strokeWidth={1.6} className="text-faint" aria-hidden="true" />
                <p>No asset holdings recorded yet.</p>
                <Link to="/master-plan" className="text-ink font-medium hover:underline underline-offset-2 inline-flex items-center gap-1">
                  Add assets in Master Plan <ArrowRight size={12} strokeWidth={1.6} aria-hidden="true" />
                </Link>
              </div>
            )}
            <p className="text-xs text-muted border-t border-border-subtle pt-3 mt-4 leading-relaxed">
              {largestSleeve && wealthResult.netWorth > 0
                ? `Portfolio spans ${allocationData.length} asset class${allocationData.length === 1 ? '' : 'es'} totaling ${formatCurrencyCompact(wealthResult.netWorth)}; the largest sleeve is ${ASSET_LABELS[largestSleeve.name as keyof typeof ASSET_LABELS] ?? largestSleeve.name} at ${formatPercent((largestSleeve.value / wealthResult.netWorth) * 100)}.`
                : 'Composition breakdown appears once holdings are added in the Master Plan.'}
            </p>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader
          title="Drift & cashflow"
          description={`Portfolio drift against the ${riskProfile.label} strategic target, and the annual savings engine.`}
          hairline
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 sm:p-6">
            <AllocationCompareChart
              current={wealthResult.currentAllocation}
              target={wealthResult.targetAllocation}
              ariaLabel="Paired horizontal stacked bars comparing current asset allocation percentages against strategic target percentages by asset class"
              summary={`Current allocation: ${Object.entries(wealthResult.currentAllocation)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k} ${(v * 100).toFixed(1)}%`)
                .join(', ')}. Target allocation: ${Object.entries(wealthResult.targetAllocation)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${ASSET_LABELS[k as keyof typeof ASSET_LABELS] ?? k} ${(v * 100).toFixed(1)}%`)
                .join(', ')}.`}
            />
            <p className="text-xs text-muted border-t border-border-subtle pt-3 mt-4 leading-relaxed">
              {largestAllocationDrift
                ? `${ASSET_LABELS[largestAllocationDrift.name as keyof typeof ASSET_LABELS]} carries the largest drift at ${largestAllocationDrift.drift > 0 ? '+' : ''}${largestAllocationDrift.drift.toFixed(1)} percentage points versus the ${riskProfile.label} target.`
                : `Portfolio is aligned with the ${riskProfile.label} target — no asset class drifts more than 0.5 percentage points.`}
            </p>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-[15px] font-semibold text-ink tracking-tight mb-4">Annual cashflow waterfall</h3>
            <CashflowWaterfallChart
              data={cashflowWaterfall}
              ariaLabel="Waterfall chart of annual income minus living expenses and SIP contributions, ending with investable surplus"
              summary={`Annual income ${formatCurrencyCompact(wealthResult.annualIncome)}, expenses ${formatCurrencyCompact(wealthResult.annualExpenses)}, SIP ${formatCurrencyCompact(annualSIP)}, surplus ${formatCurrencyCompact(annualSurplus)}.`}
            />
            <p className="text-xs text-muted border-t border-border-subtle pt-3 mt-4 leading-relaxed">
              Savings rate of <strong className="text-ink font-medium">{formatPercent(wealthResult.savingsRate)}</strong> funds a{' '}
              <strong className="text-ink font-medium">{formatCurrencyCompact(annualSIP)}/yr</strong> SIP, leaving{' '}
              <strong className="text-ink font-medium">{formatCurrencyCompact(annualSurplus)}/yr</strong> of unallocated surplus.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
