import { useMemo, useState } from 'react';
import { Wallet, ArrowRightLeft, PiggyBank, Calendar } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateSTP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
import { COLORS } from '../../lib/constants';
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

  return (
    <CalculatorShell
      title="STP Calculator"
      description="Model deploying a lumpsum from a liquid fund into a target portfolio gradually."
      inputs={
        <>
          <NumberInput label="Lumpsum Capital" value={lumpsum} onChange={setLumpsum} />
          <NumberInput label="Monthly Transfer" value={monthlyTransfer} onChange={setMonthlyTransfer} />
          <NumberInput label="Liquid Fund Return" value={liquidReturn} onChange={setLiquidReturn} suffix="%" />
          <NumberInput label="Target Portfolio Return" value={targetReturn} onChange={setTargetReturn} suffix="%" />
          <div className="flex gap-2 mt-2">
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Initial Capital" value={formatCurrency(lumpsum)} icon={<Wallet size={18} />} variant="navy" />
            <MetricCard label="STP Duration" value={`${result.months} months`} icon={<Calendar size={18} />} />
            <MetricCard label="Final Target Value" value={formatCurrency(result.target)} icon={<ArrowRightLeft size={18} />} variant="gold" />
            <MetricCard label="Total Final Value" value={formatCurrency(result.total)} icon={<PiggyBank size={18} />} variant="success" />
          </div>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Deployment Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Lumpsum deployed</span>
                <span className="font-medium">{formatCurrency(lumpsum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Monthly transfer</span>
                <span className="font-medium">{formatCurrency(monthlyTransfer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Un deployed liquid left</span>
                <span className="font-medium">{formatCurrency(result.liquid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Wealth gained vs idle cash</span>
                <span className="font-medium">{formatCurrency(result.total - lumpsum)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Capital Deployment Schedule</h4>
            <p className="text-xs text-muted mb-3">
              The lumpsum stays in the liquid fund earning {liquidReturn}% while {formatCurrency(monthlyTransfer)}/mo is systematically routed into the target portfolio — full deployment takes {result.months} months.
            </p>
            <div className="h-64" role="img" aria-label={`Area chart of STP deployment over ${result.months} months: liquid fund balance falls from ${formatCurrencyCompact(lumpsum)} to ${formatCurrencyCompact(result.liquid)} while the target portfolio grows to ${formatCurrencyCompact(result.target)}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scheduleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stpLiquid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.ink} stopOpacity={0.14} />
                      <stop offset="95%" stopColor={COLORS.ink} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stpTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value)),
                      name === 'liquid' ? 'Liquid fund (undeployed)' : 'Target portfolio',
                    ]}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      padding: '10px 14px',
                    }}
                  />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="liquid" name="Liquid fund (undeployed)" stroke={COLORS.ink} strokeWidth={2} fill="url(#stpLiquid)" />
                  <Area type="monotone" dataKey="target" name="Target portfolio" stroke={COLORS.gold} strokeWidth={2} fill="url(#stpTarget)" />
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
          </Card>
        </>
      }
    />
  );
};
