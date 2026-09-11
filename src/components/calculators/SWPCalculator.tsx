import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  PiggyBank,
  Percent,
  Sparkles,
  RefreshCw,
  Send,
  Table as TableIcon,
  LineChart as ChartIcon,
} from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { MetricCard } from '../ui/MetricCard';
import { Badge } from '../ui/Badge';
import { CalculatorShell } from './CalculatorShell';
import { calculateSWP, calculateSustainableSWP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
import { getChartTheme } from '../../lib/chartTheme';
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

export const SWPCalculator = () => {
  const { inputs, wealthResult, updateSWP, updateInputs, showToast } = useCalculator();

  const [corpus, setCorpus] = useState(1_00_00_000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(inputs.swp.monthlyNeedToday || 50_000);
  const [returnRate, setReturnRate] = useState(inputs.swp.postRetirementReturn || 9);
  const [inflation, setInflation] = useState(inputs.inflation || 5);
  const [taxRate, setTaxRate] = useState(inputs.swp.taxRate || 10);
  const [horizonYears, setHorizonYears] = useState(30);
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'table'>('both');
  const [showAllYears, setShowAllYears] = useState(false);

  const result = useMemo(
    () => calculateSWP(corpus, monthlyWithdrawal, returnRate, inflation, taxRate, horizonYears),
    [corpus, monthlyWithdrawal, returnRate, inflation, taxRate, horizonYears],
  );

  const sustainableResult = useMemo(
    () => calculateSustainableSWP(corpus, returnRate, inflation, taxRate, horizonYears),
    [corpus, returnRate, inflation, taxRate, horizonYears],
  );

  const grossAnnualAtStart = (monthlyWithdrawal * 12) / (1 - taxRate / 100);
  const initialWithdrawalRate = corpus > 0 ? (grossAnnualAtStart / corpus) * 100 : 0;
  const wealthMultiple = corpus > 0 ? result.totalWithdrawn / corpus : 0;

  const chartData = useMemo(
    () =>
      result.yearlyData.map((d) => ({
        year: `Y${d.year}`,
        corpus: d.corpusLeft,
        withdrawn: d.withdrawn,
        monthlyNeed: d.monthlyNeed,
      })),
    [result.yearlyData],
  );

  const scheduleRows = showAllYears || result.yearlyData.length <= 15
    ? result.yearlyData
    : [...result.yearlyData.slice(0, 10), result.yearlyData[result.yearlyData.length - 1]];

  const handleApply = () => {
    updateSWP({
      monthlyNeedToday: monthlyWithdrawal,
      postRetirementReturn: returnRate,
      taxRate,
    });
    updateInputs({ inflation });
    showToast('Withdrawal settings applied to Master Plan & Retirement.', 'success');
  };

  const handleSyncFromPlan = () => {
    const retirementSnapshot =
      wealthResult.snapshots.find((s) => s.age === inputs.retirementAge) ||
      wealthResult.snapshots.filter((s) => s.phase === 'accumulation').slice(-1)[0];
    const projectedCorpus = Math.round(retirementSnapshot?.total || wealthResult.netWorth);
    if (projectedCorpus > 0) setCorpus(projectedCorpus);
    setMonthlyWithdrawal(inputs.swp.monthlyNeedToday || 50_000);
    setReturnRate(inputs.swp.postRetirementReturn || 9);
    setInflation(inputs.inflation || 5);
    setTaxRate(inputs.swp.taxRate || 10);
    const horizon = Math.max(10, inputs.lifeExpectancy - inputs.retirementAge);
    if (horizon > 0) setHorizonYears(horizon);
    showToast(
      `Loaded retirement parameters (Corpus: ${formatCurrency(projectedCorpus)}, Horizon: ${horizon} yrs) from Master Plan!`,
      'info',
    );
  };

  const handleApplySustainable = () => {
    if (sustainableResult.monthlyWithdrawal > 0) {
      setMonthlyWithdrawal(Math.round(sustainableResult.monthlyWithdrawal));
      showToast(
        `Applied sustainable monthly drawdown: ${formatCurrency(Math.round(sustainableResult.monthlyWithdrawal))}/mo`,
        'success',
      );
    }
  };

  const handleApplyRuleOfFour = () => {
    if (corpus > 0) {
      const netAnnual = corpus * 0.04 * (1 - taxRate / 100);
      const ruleMonthly = Math.round(netAnnual / 12);
      setMonthlyWithdrawal(ruleMonthly);
      showToast(`Applied 4% Rule benchmark: ${formatCurrency(ruleMonthly)}/mo`, 'info');
    }
  };

  const theme = getChartTheme();

  return (
    <CalculatorShell
      title="SWP & Drawdown Calculator"
      description="Calculate corpus longevity, sustainable decumulation rates, and year-by-year cashflow schedules under inflation and tax."
      hasInput={corpus > 0 || monthlyWithdrawal > 0}
      inputs={
        <>
          <CurrencyInput label="Starting Corpus" value={corpus} onChange={setCorpus} step={100000} />
          <CurrencyInput
            label="Monthly Withdrawal (today's ₹)"
            value={monthlyWithdrawal}
            onChange={setMonthlyWithdrawal}
            helper="Inflation-indexed monthly need"
          />
          <Slider
            label="Expected Return"
            value={returnRate}
            onChange={setReturnRate}
            min={0}
            max={20}
            step={0.5}
            suffix="%"
          />
          <Slider
            label="Annual Inflation"
            value={inflation}
            onChange={setInflation}
            min={0}
            max={15}
            step={0.25}
            suffix="%"
          />
          <NumberInput label="Tax Rate on Withdrawals" value={taxRate} onChange={setTaxRate} suffix="%" min={0} max={50} />
          <NumberInput
            label="Planning Horizon"
            value={horizonYears}
            onChange={setHorizonYears}
            min={5}
            max={50}
            suffix="years"
            helper="Number of decumulation years"
          />

          <div className="pt-2 space-y-2">
            <div className="eyebrow">Advisory Quick Levers</div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleApplySustainable} variant="outline" size="sm" className="text-xs">
                <Sparkles size={14} strokeWidth={1.6} className="mr-1" /> Safe Rate
              </Button>
              <Button onClick={handleApplyRuleOfFour} variant="outline" size="sm" className="text-xs">
                <Percent size={14} strokeWidth={1.6} className="mr-1" /> 4% Rule
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border-subtle">
            <Button onClick={handleSyncFromPlan} className="flex-1 text-xs" variant="ghost">
              <RefreshCw size={13} strokeWidth={1.6} className="mr-1.5" /> Sync from Plan
            </Button>
            <Button onClick={handleApply} className="flex-1 text-xs" variant="outline">
              <Send size={13} strokeWidth={1.6} className="mr-1.5" /> Apply to Plan
            </Button>
          </div>
        </>
      }
      results={
        <div className="space-y-5">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Corpus Longevity"
              value={result.sustainable ? `${horizonYears}+ Yrs` : `${result.years} Yrs`}
              subtext={result.sustainable ? 'Outlasts target horizon' : `Depletes in Year ${result.depletionYear}`}
              icon={result.sustainable ? <CheckCircle2 size={18} strokeWidth={1.6} /> : <AlertTriangle size={18} strokeWidth={1.6} />}
              variant={result.sustainable ? 'success' : 'danger'}
            />
            <MetricCard
              label="Withdrawal Rate"
              value={formatPercent(initialWithdrawalRate)}
              subtext={initialWithdrawalRate <= 4 ? 'Safe (≤4% rule)' : initialWithdrawalRate <= 6 ? 'Moderate (4–6%)' : 'Aggressive (>6%)'}
              icon={<Percent size={18} strokeWidth={1.6} />}
              variant={initialWithdrawalRate <= 4 ? 'success' : initialWithdrawalRate <= 6 ? 'default' : 'danger'}
            />
            <MetricCard
              label="Sustainable Spend"
              value={formatCurrency(sustainableResult.monthlyWithdrawal)}
              subtext={`Safe spend/mo (${horizonYears}-yr horizon)`}
              icon={<Calendar size={18} strokeWidth={1.6} />}
              variant={sustainableResult.monthlyWithdrawal >= monthlyWithdrawal ? 'success' : 'gold'}
            />
            <MetricCard
              label="Total Outflow"
              value={formatCurrencyCompact(result.totalWithdrawn)}
              subtext={`${wealthMultiple.toFixed(2)}x initial (${formatCurrency(result.totalWithdrawn)})`}
              icon={<PiggyBank size={18} strokeWidth={1.6} />}
              variant="default"
            />
          </div>

          {/* Solvency Warning / Advisory Alert */}
          {!result.sustainable && (
            <div className="rounded-md border border-warning/25 bg-warning-soft/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} strokeWidth={1.8} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink">Drawdown exceeds sustainable capacity</div>
                  <div className="text-xs text-muted mt-0.5 leading-relaxed">
                    Your current withdrawal of {formatCurrency(monthlyWithdrawal)}/mo is projected to deplete the corpus in{' '}
                    <strong className="text-ink">Year {result.depletionYear}</strong>. Maximum sustainable withdrawal is{' '}
                    <strong className="text-ink">{formatCurrency(Math.round(sustainableResult.monthlyWithdrawal))}/mo</strong>.
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs shrink-0 self-start sm:self-auto" onClick={handleApplySustainable}>
                Calibrate to Safe Rate
              </Button>
            </div>
          )}

          {/* View toggle header */}
          <div className="flex items-center justify-between">
            <span className="eyebrow">Decumulation Trajectory & Schedule</span>
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5 text-xs bg-sunken/50">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 rounded-sm font-medium transition-colors cursor-pointer ${
                  viewMode === 'both' ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1 rounded-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  viewMode === 'chart' ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <ChartIcon size={13} strokeWidth={1.6} /> Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <TableIcon size={13} strokeWidth={1.6} /> Table
              </button>
            </div>
          </div>
        </div>
      }
    >
      {/* Drawdown Area Chart */}
      {(viewMode === 'both' || viewMode === 'chart') && (
        <div className="mt-5 rounded-lg border border-border bg-raised">
          <div className="px-5 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink tracking-tight">Corpus Drawdown Over Time</div>
              <p className="text-xs text-muted mt-0.5">Compounded remaining capital net of annual withdrawals</p>
            </div>
            <Badge tone={result.sustainable ? 'positive' : 'negative'}>
              {result.sustainable ? `Sustains ${horizonYears}+ Yrs` : `Depletes Year ${result.depletionYear}`}
            </Badge>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-muted leading-relaxed mb-4">
              {result.sustainable
                ? `Withdrawals of ${formatCurrency(monthlyWithdrawal)}/mo (inflation-indexed) are comfortably funded — the corpus still stands at ${formatCurrency(chartData[chartData.length - 1]?.corpus ?? 0)} after ${horizonYears} years.`
                : `At ${formatCurrency(monthlyWithdrawal)}/mo the corpus runs dry in year ${result.depletionYear}; cutting to the sustainable ${formatCurrency(Math.round(sustainableResult.monthlyWithdrawal))}/mo preserves capital through the full horizon.`}
            </p>
            <div
              className="h-72"
              role="img"
              aria-label={`Area chart of remaining corpus over ${horizonYears} years. ${result.sustainable ? `The corpus sustains withdrawals for the full horizon, ending at ${formatCurrency(chartData[chartData.length - 1]?.corpus ?? 0)}.` : `The corpus depletes in year ${result.depletionYear}.`}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="swpCorpusEnriched" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.secondary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tick={{ fontSize: 12, fill: theme.axisLabel }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'corpus' ? 'Ending Corpus' : 'Annual Outflow',
                    ]}
                    labelFormatter={(label) => `Horizon ${label}`}
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${theme.tooltipBorder}`,
                      backgroundColor: theme.tooltipBg,
                      color: theme.tooltipText,
                      padding: '10px 14px',
                    }}
                  />
                  <ReferenceLine y={0} stroke={theme.muted} strokeDasharray="2 2" />
                  <Area
                    type="monotone"
                    dataKey="corpus"
                    name="corpus"
                    stroke={theme.secondary}
                    strokeWidth={2.5}
                    fill="url(#swpCorpusEnriched)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Remaining corpus at the end of each horizon year</caption>
              <thead>
                <tr><th>Year</th><th>Remaining corpus</th></tr>
              </thead>
              <tbody>
                {chartData.map((d) => (
                  <tr key={d.year}>
                    <td>{d.year}</td>
                    <td>{formatCurrency(d.corpus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Year-by-Year Schedule Table */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="mt-5 rounded-lg border border-border bg-raised">
          <div className="px-5 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink tracking-tight">Year-by-Year Withdrawal Schedule</div>
              <p className="text-xs text-muted mt-0.5">Inflation-adjusted monthly needs vs. ending balances</p>
            </div>
            {result.yearlyData.length > 15 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => setShowAllYears((prev) => !prev)}
              >
                {showAllYears ? 'Show Summary (10 Yrs)' : `Show All ${result.yearlyData.length} Years`}
              </Button>
            )}
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="SWP schedule table">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted">
                  <th className="py-2.5 pl-5 pr-4 font-semibold">Year</th>
                  <th className="py-2.5 pr-4 text-right font-semibold">Monthly SWP</th>
                  <th className="py-2.5 pr-4 text-right font-semibold">Annual Outflow</th>
                  <th className="py-2.5 pr-5 text-right font-semibold">Corpus Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {scheduleRows.map((d) => {
                  const isDepleted = d.corpusLeft <= 0;
                  return (
                    <tr
                      key={d.year}
                      className={`transition-colors ${
                        isDepleted ? 'bg-negative-soft/40' : 'hover:bg-sunken/60'
                      }`}
                    >
                      <td className="py-2.5 pl-5 pr-4 font-medium text-ink">Year {d.year}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(d.monthlyNeed)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{formatCurrency(d.withdrawn)}</td>
                      <td
                        className={`py-2.5 pr-5 text-right font-mono tabular-nums font-semibold ${
                          isDepleted ? 'text-negative' : 'text-ink'
                        }`}
                      >
                        {formatCurrency(d.corpusLeft)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!showAllYears && result.yearlyData.length > 15 && (
            <p className="text-xs text-muted mx-5 mb-4 pt-2 border-t border-border-subtle">
              Showing first 10 years and final year of {result.yearlyData.length}-year horizon. Click "Show All" above for the complete table.
            </p>
          )}
        </div>
      )}
    </CalculatorShell>
  );
};
