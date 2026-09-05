import { useMemo, useState } from 'react';
import { Wallet, ArrowRightLeft, PiggyBank, Calendar } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateSTP } from '../../lib/calculators';
import { formatCurrency } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-4">Deployment Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-700">Lumpsum deployed</span>
                <span className="font-medium">{formatCurrency(lumpsum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Monthly transfer</span>
                <span className="font-medium">{formatCurrency(monthlyTransfer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Un deployed liquid left</span>
                <span className="font-medium">{formatCurrency(result.liquid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-700">Wealth gained vs idle cash</span>
                <span className="font-medium">{formatCurrency(result.total - lumpsum)}</span>
              </div>
            </div>
          </Card>
        </>
      }
    />
  );
};
