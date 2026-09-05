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
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CalculatorShell } from './CalculatorShell';
import { calculateSWP, calculateSustainableSWP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
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
import { COLORS } from '../../lib/constants';

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

  return (
    <CalculatorShell
      title="SWP & Drawdown Calculator"
      description="Calculate corpus longevity, sustainable decumulation rates, and year-by-year cashflow schedules under inflation and tax."
      inputs={
        <>
          <NumberInput label="Starting Corpus" value={corpus} onChange={setCorpus} />
          <NumberInput
            label="Monthly Withdrawal (today's ₹)"
            value={monthlyWithdrawal}
            onChange={setMonthlyWithdrawal}
            helper="Inflation-indexed monthly need"
          />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Annual Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Tax Rate on Withdrawals" value={taxRate} onChange={setTaxRate} suffix="%" />
          <NumberInput
            label="Planning Horizon (Years)"
            value={horizonYears}
            onChange={setHorizonYears}
            min={5}
            max={50}
            helper="Number of decumulation years"
          />

          <div className="pt-2 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Advisory Quick Levers</div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleApplySustainable} variant="outline" size="sm" className="text-xs">
                <Sparkles size={14} className="mr-1 text-zinc-600" /> Safe Rate
              </Button>
              <Button onClick={handleApplyRuleOfFour} variant="outline" size="sm" className="text-xs">
                <Percent size={14} className="mr-1 text-navy" /> 4% Rule
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <Button onClick={handleSyncFromPlan} className="flex-1 text-xs" variant="ghost">
              <RefreshCw size={13} className="mr-1.5" /> Sync from Plan
            </Button>
            <Button onClick={handleApply} className="flex-1 text-xs" variant="outline">
              <Send size={13} className="mr-1.5" /> Apply to Plan
            </Button>
          </div>
        </>
      }
      results={
        <div className="space-y-6">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Corpus Longevity"
              value={result.sustainable ? `${horizonYears}+ Yrs` : `${result.years} Yrs`}
              subtext={result.sustainable ? 'Outlasts target horizon' : `Depletes in Year ${result.depletionYear}`}
              icon={result.sustainable ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              variant={result.sustainable ? 'success' : 'danger'}
            />
            <MetricCard
              label="Withdrawal Rate"
              value={formatPercent(initialWithdrawalRate)}
              subtext={initialWithdrawalRate <= 4 ? 'Safe (≤4% rule)' : initialWithdrawalRate <= 6 ? 'Moderate (4–6%)' : 'Aggressive (>6%)'}
              icon={<Percent size={18} />}
              variant={initialWithdrawalRate <= 4 ? 'success' : initialWithdrawalRate <= 6 ? 'default' : 'danger'}
            />
            <MetricCard
              label="Sustainable Spend"
              value={formatCurrency(sustainableResult.monthlyWithdrawal)}
              subtext={`Safe spend/mo (${horizonYears}-yr horizon)`}
              icon={<Calendar size={18} />}
              variant={sustainableResult.monthlyWithdrawal >= monthlyWithdrawal ? 'success' : 'gold'}
            />
            <MetricCard
              label="Total Outflow"
              value={formatCurrencyCompact(result.totalWithdrawn)}
              subtext={`${wealthMultiple.toFixed(2)}x initial (${formatCurrency(result.totalWithdrawn)})`}
              icon={<PiggyBank size={18} />}
              variant="navy"
            />
          </div>

          {/* Solvency Warning / Advisory Alert */}
          {!result.sustainable && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-zinc-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-navy">Drawdown Exceeds Sustainable Capacity</div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    Your current withdrawal of {formatCurrency(monthlyWithdrawal)}/mo is projected to deplete the corpus in{' '}
                    <strong>Year {result.depletionYear}</strong>. Maximum sustainable withdrawal is{' '}
                    <strong>{formatCurrency(Math.round(sustainableResult.monthlyWithdrawal))}/mo</strong>.
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">Decumulation Trajectory & Schedule</h4>
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'both' ? 'bg-white text-navy shadow-xs' : 'text-zinc-600 hover:text-navy'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'chart' ? 'bg-white text-navy shadow-xs' : 'text-zinc-600 hover:text-navy'
                }`}
              >
                <ChartIcon size={13} /> Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'table' ? 'bg-white text-navy shadow-xs' : 'text-zinc-600 hover:text-navy'
                }`}
              >
                <TableIcon size={13} /> Table
              </button>
            </div>
          </div>

          {/* Drawdown Area Chart */}
          {(viewMode === 'both' || viewMode === 'chart') && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-navy">Corpus Drawdown Over Time</h4>
                  <p className="text-xs text-zinc-500">Compounded remaining capital net of annual withdrawals</p>
                </div>
                <Badge variant={result.sustainable ? 'success' : 'danger'}>
                  {result.sustainable ? `Sustains ${horizonYears}+ Yrs` : `Depletes Year ${result.depletionYear}`}
                </Badge>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="swpCorpusEnriched" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={formatCurrencyCompact}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatCurrency(Number(value)),
                        name === 'corpus' ? 'Ending Corpus' : 'Annual Outflow',
                      ]}
                      labelFormatter={(label) => `Horizon ${label}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                    <Area
                      type="monotone"
                      dataKey="corpus"
                      name="corpus"
                      stroke={COLORS.gold}
                      strokeWidth={2.5}
                      fill="url(#swpCorpusEnriched)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Year-by-Year Schedule Table */}
          {(viewMode === 'both' || viewMode === 'table') && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-navy">Year-by-Year Withdrawal Schedule</h4>
                  <p className="text-xs text-zinc-500">Inflation-adjusted monthly needs vs. ending balances</p>
                </div>
                {result.yearlyData.length > 15 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowAllYears((prev) => !prev)}
                  >
                    {showAllYears ? 'Show Summary (10 Yrs)' : `Show All ${result.yearlyData.length} Years`}
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="SWP schedule table">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-700">
                      <th className="py-2.5 pr-4">Year</th>
                      <th className="py-2.5 pr-4 text-right">Monthly SWP</th>
                      <th className="py-2.5 pr-4 text-right">Annual Outflow</th>
                      <th className="py-2.5 pr-4 text-right">Corpus Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {scheduleRows.map((d) => {
                      const isDepleted = d.corpusLeft <= 0;
                      return (
                        <tr
                          key={d.year}
                          className={`hover:bg-zinc-50/80 transition-colors ${
                            isDepleted ? 'bg-rose-50/50 text-rose-900' : ''
                          }`}
                        >
                          <td className="py-2.5 pr-4 font-medium">Year {d.year}</td>
                          <td className="py-2.5 pr-4 text-right">{formatCurrency(d.monthlyNeed)}</td>
                          <td className="py-2.5 pr-4 text-right">{formatCurrency(d.withdrawn)}</td>
                          <td
                            className={`py-2.5 pr-4 text-right font-medium ${
                              isDepleted ? 'text-rose-600 font-bold' : 'text-zinc-900'
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
                <p className="text-xs text-zinc-500 mt-3 pt-2 border-t border-zinc-100">
                  Showing first 10 years and final year of {result.yearlyData.length}-year horizon. Click "Show All" above for complete table.
                </p>
              )}
            </Card>
          )}
        </div>
      }
    />
  );
};
