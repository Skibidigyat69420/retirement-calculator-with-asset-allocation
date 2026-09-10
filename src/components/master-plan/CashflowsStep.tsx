import {
  Wallet,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Repeat,
  Download,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { Badge } from '../ui/Badge';
import { formatCurrency } from '../../lib/formatters';
import type { MasterPlanInputs } from '../../types';

interface CashflowsStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  updateSIP: (updates: Partial<MasterPlanInputs['sip']>) => void;
  updateSTP?: (updates: Partial<MasterPlanInputs['stp']>) => void;
  updateSWP: (updates: Partial<MasterPlanInputs['swp']>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CashflowsStep = ({
  inputs,
  updateInputs,
  updateSIP,
  updateSWP,
  onNext,
  onBack,
}: CashflowsStepProps) => {
  const monthlyIncome = Math.round(inputs.annualIncome / 12);
  const monthlySavingsSurplus = monthlyIncome - inputs.monthlyExpenditure;
  const savingsRate = monthlyIncome > 0 ? (monthlySavingsSurplus / monthlyIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <Card className="border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-accent" />
          <h3 className="text-lg font-bold text-ink">Cashflow Dynamics & Systematic Allocations</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Calibrate earned income, living expenditure, ongoing SIP contributions, and post-retirement SWP distributions.
        </p>
      </Card>

      {/* Cashflow Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Monthly Gross Income</span>
          <div className="text-lg font-mono font-bold text-ink truncate">
            {formatCurrency(monthlyIncome)}
          </div>
          <span className="text-[10px] text-faint">Annual: {formatCurrency(inputs.annualIncome)}</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Monthly Living Expenses</span>
          <div className="text-lg font-mono font-bold text-negative truncate">
            {formatCurrency(inputs.monthlyExpenditure)}
          </div>
          <span className="text-[10px] text-faint">Baseline household burn</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted">Net Monthly Savings Capacity</span>
          <div
            className={`text-lg font-mono font-bold truncate ${
              monthlySavingsSurplus >= 0 ? 'text-positive' : 'text-negative'
            }`}
          >
            {formatCurrency(monthlySavingsSurplus)}
          </div>
          <span className="text-[10px] text-muted font-semibold">
            Savings Rate: <strong className="text-ink">{savingsRate.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      {/* SECTION 1: Baseline Income & Living Expenses */}
      <Card className="border border-border space-y-5">
        <h4 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-border pb-3">
          <TrendingUp size={16} className="text-accent" />
          Income & Living Expenditure Baseline
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput
            label="Annual Household Gross Income"
            value={inputs.annualIncome}
            onChange={(val) => updateInputs({ annualIncome: val })}
            helper={`Translates to approx ${formatCurrency(monthlyIncome)} per month`}
          />

          <CurrencyInput
            label="Monthly Baseline Living Spend"
            value={inputs.monthlyExpenditure}
            onChange={(val) => updateInputs({ monthlyExpenditure: val })}
            helper="Excluding one-off lumpy milestone goals"
          />
        </div>
      </Card>

      {/* SECTION 2: Accumulation Phase SIP Configuration */}
      <Card className="border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <Repeat size={16} className="text-positive" />
              Systematic Investment Plan (SIP) Configuration
            </h4>
            <span className="text-xs text-muted">Monthly systematic wealth accumulation during pre-retirement career.</span>
          </div>
          <Badge variant="navy" className="text-xs font-mono">
            {formatCurrency(inputs.sip.amount)}/mo
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CurrencyInput
            label="Monthly Systematic SIP Amount"
            value={inputs.sip.amount}
            onChange={(val) => updateSIP({ amount: val })}
          />

          <NumberInput
            label="Annual Step-Up Rate (%)"
            value={inputs.sip.stepUp}
            onChange={(val) => updateSIP({ stepUp: val })}
            suffix="%"
            step={1}
            min={0}
            max={25}
            presets={[
              { label: '0% (Flat)', value: 0 },
              { label: '5%', value: 5 },
              { label: '10%', value: 10 },
            ]}
          />
        </div>

        {/* Equity vs Debt Split Slider */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">SIP Asset Allocation Split:</span>
            <span className="font-mono text-xs">
              <strong className="text-accent">{inputs.sip.equitySplit}% Equity</strong> /{' '}
              <strong className="text-warning">{inputs.sip.debtSplit}% Debt</strong>
            </span>
          </div>
          <Slider
            label="SIP Equity Allocation (%)"
            value={inputs.sip.equitySplit}
            onChange={(val) => updateSIP({ equitySplit: val, debtSplit: 100 - val })}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </Card>

      {/* SECTION 3: Distribution Phase SWP Configuration */}
      <Card className="border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-ink flex items-center gap-2">
              <Download size={16} className="text-warning" />
              Post-Retirement Systematic Withdrawal Plan (SWP)
            </h4>
            <span className="text-xs text-muted">Target monthly cashflow distribution required post-retirement.</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Age {inputs.retirementAge} → {inputs.lifeExpectancy}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CurrencyInput
            label="Monthly Living Need (In Today's Terms)"
            value={inputs.swp.monthlyNeedToday}
            onChange={(val) => updateSWP({ monthlyNeedToday: val })}
            helper="Will be inflated to retirement year"
          />

          <NumberInput
            label="Post-Retirement Portfolio Return (%)"
            value={inputs.swp.postRetirementReturn}
            onChange={(val) => updateSWP({ postRetirementReturn: val })}
            suffix="%"
            step={0.5}
            min={4}
            max={14}
          />

          <NumberInput
            label="Effective Withdrawal Tax Rate (%)"
            value={inputs.swp.taxRate}
            onChange={(val) => updateSWP({ taxRate: val })}
            suffix="%"
            step={1}
            min={0}
            max={35}
            presets={[
              { label: '0%', value: 0 },
              { label: '10%', value: 10 },
              { label: '15%', value: 15 },
              { label: '20%', value: 20 },
            ]}
          />
        </div>

        {/* Step Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft size={15} />
            <span>Back: Financials</span>
          </Button>
          <Button onClick={onNext} className="flex items-center gap-2">
            <span>Next: Goals & Milestones</span>
            <ArrowRight size={15} />
          </Button>
        </div>
      </Card>
    </div>
  );
};
