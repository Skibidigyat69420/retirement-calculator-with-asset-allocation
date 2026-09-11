import { useMemo, useState } from 'react';
import { Wallet, ArrowRightLeft, PiggyBank, Calendar } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';

import { Slider } from '../ui/Slider';
import { MetricCard } from '../ui/MetricCard';
import { CalculatorShell } from './CalculatorShell';
import { calculateSTP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
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
  Legend,
} from 'recharts';

export const STPCalculator = () => {
  const { inputs, updateSTP, showToast } = useCalculator();
  const [lumpsum, setLumpsum] = useState(inputs.stp.lumpsum || 50_00_000);
  const [monthlyTransfer, setMonthlyTransfer] = useState(inputs.stp.monthlyTransfer || 1_00_000);
  const [liquidReturn, setLiquidReturn] = useState(inputs.stp.liquidReturn || 7);
  const [targetReturn, setTargetReturn] = useState(12);

  const result = useMemo(
    () => calculateSTP(lumpsum, monthlyTransfer, liquidReturn, targetReturn),
    [lumpsum, monthlyTransfer, liquidReturn, targetReturn],
  );

  // Month-by-month deployment schedule: idle liquid balance drains while the
  // target portfolio compounds at its expected rate.
  const scheduleData = useMemo(() => {
    const liqR = liquidReturn / 100 / 12;
    const tgtR = targetReturn / 100 / 12;
    let liquid = lumpsum;
    let target = 0;
    const points: { month: string; liquid: number; target: number }[] = [];
    for (let m = 1; m <= result.months && m <= 120; m++) {
      liquid = liquid * (1 + liqR);
      target = target * (1 + tgtR);
      const transfer = Math.min(liquid, monthlyTransfer);
      liquid -= transfer;
      target += transfer;
      if (result.months <= 24 || m % Math.ceil(result.months / 24) === 0 || m === result.months) {
        points.push({ month: `M${m}`, liquid: Math.round(liquid), target: Math.round(target) });
      }
    }
    return points;
  }, [lumpsum, monthlyTransfer, liquidReturn, targetReturn, result.months]);

  const handleApply = () => {
    updateSTP({
      active: true,
      lumpsum,
      monthlyTransfer,
      liquidReturn,
    });
    showToast('STP settings applied to Master Plan.', 'success');
  };

  const handleSyncFromPlan = () => {
    setLumpsum(inputs.stp.lumpsum || 1000000);
    setMonthlyTransfer(inputs.stp.monthlyTransfer || 50000);
    setLiquidReturn(inputs.stp.liquidReturn || 6);
    setTargetReturn(inputs.sip.equityReturn || 12);
    showToast(`Loaded STP settings (${formatCurrency(inputs.stp.monthlyTransfer || 50000)}/mo) from Master Plan.`, 'info');
  };

  const theme = getChartTheme();

  const summaryRows: { label: string; value: string }[] = [
    { label: 'Lumpsum deployed', value: formatCurrency(lumpsum) },
    { label: 'Monthly transfer', value: formatCurrency(monthlyTransfer) },
    { label: 'Undeployed liquid left', value: formatCurrency(result.liquid) },
    { label: 'Wealth gained vs idle cash', value: formatCurrency(result.total - lumpsum) },
  ];

  return (
    <CalculatorShell
      title="STP Calculator"
      description="Model deploying a lumpsum from a liquid fund into a target portfolio gradually."
      hasInput={lumpsum > 0 || monthlyTransfer > 0}
      inputs={
        <>
          <CurrencyInput label="Lumpsum Capital" value={lumpsum} onChange={setLumpsum} step={50000} />
          <CurrencyInput label="Monthly Transfer" value={monthlyTransfer} onChange={setMonthlyTransfer} step={10000} />
          <Slider
            label="Liquid Fund Return"
            value={liquidReturn}
            onChange={setLiquidReturn}
            min={0}
            max={15}
            step={0.25}
            suffix="%"
          />
          <Slider
            label="Target Portfolio Return"
            value={targetReturn}
            onChange={setTargetReturn}
            min={0}
            max={30}
            step={0.5}
            suffix="%"
          />
          <div className="flex gap-2 pt-2 border-t border-border-subtle">
            <Button onClick={handleSyncFromPlan} className="flex-1 text-xs" variant="ghost">
              Sync from Plan
            </Button>
            <Button onClick={handleApply} className="flex-1 text-xs" variant="outline">
              Apply to Plan
            </Button>
          </div>
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Initial Capital" value={formatCurrency(lumpsum)} icon={<Wallet size={18} strokeWidth={1.6} />} variant="default" />
          <MetricCard label="STP Duration" value={`${result.months} months`} icon={<Calendar size={18} strokeWidth={1.6} />} />
          <MetricCard label="Final Target Value" value={formatCurrency(result.target)} icon={<ArrowRightLeft size={18} strokeWidth={1.6} />} variant="gold" />
          <MetricCard label="Total Final Value" value={formatCurrency(result.total)} icon={<PiggyBank size={18} strokeWidth={1.6} />} variant="success" />
        </div>
      }
    >
      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Deployment Summary</div>
        </div>
        <div className="p-5">
          <dl className="divide-y divide-border-subtle text-sm">
            {summaryRows.map((row) => (
              <div key={row.label} className="flex justify-between py-2.5">
                <dt className="text-muted">{row.label}</dt>
                <dd className="font-mono tabular-nums font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Capital Deployment Schedule</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The lumpsum stays in the liquid fund earning {liquidReturn}% while {formatCurrency(monthlyTransfer)}/mo is systematically routed into the target portfolio — full deployment takes {result.months} months.
          </p>
          <div className="h-64" role="img" aria-label={`Area chart of STP deployment over ${result.months} months: liquid fund balance falls from ${formatCurrencyCompact(lumpsum)} to ${formatCurrencyCompact(result.liquid)} while the target portfolio grows to ${formatCurrencyCompact(result.target)}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scheduleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stpLiquid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.16} />
                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="stpTarget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.secondary} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={theme.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tick={{ fontSize: 11, fill: theme.axisLabel }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === 'liquid' ? 'Liquid fund (undeployed)' : 'Target portfolio',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${theme.tooltipBorder}`,
                    backgroundColor: theme.tooltipBg,
                    color: theme.tooltipText,
                    padding: '10px 14px',
                  }}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="liquid" name="Liquid fund (undeployed)" stroke={theme.primary} strokeWidth={2} fill="url(#stpLiquid)" />
                <Area type="monotone" dataKey="target" name="Target portfolio" stroke={theme.secondary} strokeWidth={2} fill="url(#stpTarget)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>STP deployment checkpoints: liquid balance and target portfolio value by month</caption>
            <thead>
              <tr><th>Month</th><th>Liquid balance</th><th>Target portfolio</th></tr>
            </thead>
            <tbody>
              {scheduleData.map((d) => (
                <tr key={d.month}>
                  <td>{d.month}</td>
                  <td>{formatCurrency(d.liquid)}</td>
                  <td>{formatCurrency(d.target)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CalculatorShell>
  );
};
