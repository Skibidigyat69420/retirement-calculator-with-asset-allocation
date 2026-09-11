import {
  ArrowRight,
  ArrowLeft,
  Repeat,
  Download,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { FinancialMetric } from '../ui/FinancialMetric';
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

  const summary = [
    {
      label: 'Monthly income',
      value: monthlyIncome > 0 ? formatCurrency(monthlyIncome) : null,
      hint: inputs.annualIncome > 0 ? `Annual ${formatCurrency(inputs.annualIncome)}` : 'Set annual income below',
    },
    {
      label: 'Monthly spend',
      value: inputs.monthlyExpenditure > 0 ? formatCurrency(inputs.monthlyExpenditure) : null,
      hint: 'Baseline household burn',
    },
    {
      label: 'Savings capacity',
      value:
        monthlyIncome > 0 || inputs.monthlyExpenditure > 0
          ? formatCurrency(monthlySavingsSurplus)
          : null,
      hint:
        monthlyIncome > 0
          ? `Savings rate ${savingsRate.toFixed(1)}%`
          : 'Income minus living spend',
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow">Step 03 · Cashflow</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Cashflow dynamics</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Earned income, living expenditure, ongoing SIP accumulation, and post-retirement SWP distributions.
        </p>
      </header>

      {/* Summary — hairline-separated metrics */}
      <section className="border-t border-b border-border divide-y divide-border">
        {summary.map((m) => (
          <div key={m.label} className="py-3.5">
            <FinancialMetric label={m.label} value={m.value} size="sm" hint={m.hint} />
          </div>
        ))}
      </section>

      {/* Income & expenditure */}
      <section className="border-t border-border pt-6">
        <h3 className="text-[15px] font-semibold text-ink tracking-tight">Income & living expenditure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
          <CurrencyInput
            label="Annual household gross income"
            value={inputs.annualIncome}
            onChange={(val) => updateInputs({ annualIncome: val })}
            helper={`Approx ${formatCurrency(monthlyIncome)} per month`}
          />
          <CurrencyInput
            label="Monthly baseline living spend"
            value={inputs.monthlyExpenditure}
            onChange={(val) => updateInputs({ monthlyExpenditure: val })}
            helper="Excluding one-off milestone goals"
          />
        </div>
      </section>

      {/* SIP */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
              <Repeat size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
              Systematic investment (SIP)
            </h3>
            <p className="mt-0.5 text-xs text-muted">Monthly accumulation during the career phase.</p>
          </div>
          <span className="font-mono text-[11px] text-faint tabular-nums">
            {formatCurrency(inputs.sip.amount)}/mo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mt-5">
          <CurrencyInput
            label="Monthly SIP amount"
            value={inputs.sip.amount}
            onChange={(val) => updateSIP({ amount: val })}
          />
          <NumberInput
            label="Annual step-up rate"
            value={inputs.sip.stepUp}
            onChange={(val) => updateSIP({ stepUp: val })}
            suffix="%"
            step={1}
            min={0}
            max={25}
            presets={[
              { label: '0% flat', value: 0 },
              { label: '5%', value: 5 },
              { label: '10%', value: 10 },
            ]}
          />
        </div>

        <div className="mt-6 max-w-md">
          <div className="flex items-baseline justify-between text-xs mb-2">
            <span className="font-medium text-ink">SIP allocation split</span>
            <span className="font-mono tabular-nums text-muted">
              <span className="text-accent">{inputs.sip.equitySplit}% equity</span>
              {' / '}
              <span>{inputs.sip.debtSplit}% debt</span>
            </span>
          </div>
          <Slider
            label="SIP equity allocation"
            value={inputs.sip.equitySplit}
            onChange={(val) => updateSIP({ equitySplit: val, debtSplit: 100 - val })}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </section>

      {/* SWP */}
      <section className="border-t border-border pt-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold text-ink tracking-tight flex items-center gap-2">
              <Download size={15} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
              Post-retirement withdrawal (SWP)
            </h3>
            <p className="mt-0.5 text-xs text-muted">Target monthly cashflow once retired.</p>
          </div>
          <span className="font-mono text-[11px] text-faint tabular-nums">
            Age {inputs.retirementAge || '—'} → {inputs.lifeExpectancy || '—'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 mt-5">
          <CurrencyInput
            label="Monthly need (today's terms)"
            value={inputs.swp.monthlyNeedToday}
            onChange={(val) => updateSWP({ monthlyNeedToday: val })}
            helper="Inflated to the retirement year"
          />
          <NumberInput
            label="Post-retirement return"
            value={inputs.swp.postRetirementReturn}
            onChange={(val) => updateSWP({ postRetirementReturn: val })}
            suffix="%"
            step={0.5}
            min={0}
            max={14}
          />
          <NumberInput
            label="Withdrawal tax rate"
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
      </section>

      {/* Step navigation */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Back · Financials</span>
        </Button>
        <Button onClick={onNext} className="flex items-center gap-2">
          <span>Next · Goals</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
