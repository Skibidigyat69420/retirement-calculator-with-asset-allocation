import { Repeat, Download } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Field, FieldGrid } from '../ui/Field';
import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { formatCurrency } from '../../lib/formatters';
import type { IncomeSource, MasterPlanInputs } from '../../types';

interface CashflowsStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  updateClient: (updates: Partial<MasterPlanInputs['client']>) => void;
  updateSIP: (updates: Partial<MasterPlanInputs['sip']>) => void;
  updateSTP?: (updates: Partial<MasterPlanInputs['stp']>) => void;
  updateSWP: (updates: Partial<MasterPlanInputs['swp']>) => void;
}

import { useCalculator } from '../../context/CalculatorContext';

export const CashflowsStep = ({
  inputs,
  updateInputs,
  updateClient,
  updateSIP,
  updateSWP,
}: CashflowsStepProps) => {
  const { assumptions } = useCalculator();

  const incomeSources = inputs.client.incomeSources || [];
  const monthlyIncome = Math.round(inputs.annualIncome / 12);
  const monthlySavingsSurplus = monthlyIncome - inputs.monthlyExpenditure;
  const savingsRate = monthlyIncome > 0 ? (monthlySavingsSurplus / monthlyIncome) * 100 : 0;

  const annualIncomeFromSources = (sources: IncomeSource[]) => sources.reduce((total, source) => {
    const spotRate = assumptions?.fx[source.currency || 'INR']?.spotRate || 1.0;
    const baseAmount = source.amount * spotRate;
    return total + Math.max(0, baseAmount) * (source.frequency === 'monthly' ? 12 : 1);
  }, 0);

  const replaceIncomeSources = (sources: IncomeSource[]) => {
    updateClient({ incomeSources: sources });
    updateInputs({ annualIncome: annualIncomeFromSources(sources) });
  };

  const updateIncomeSource = (id: string, patch: Partial<IncomeSource>) => {
    const sources = incomeSources.map((source) => {
      if (source.id !== id) return source;
      const next = { ...source, ...patch };
      // Always store native amount; base currency is calculated on the fly
      return next;
    });
    replaceIncomeSources(sources);
  };

  return (
    <div className="border-t border-border">
      <header className="py-4">
        <div className="eyebrow">Step 03 · Cashflow</div>
        <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1">Cashflow dynamics</h2>
        <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
          Earned income, living expenditure, ongoing SIP accumulation, and post-retirement SWP distributions.
        </p>
      </header>

      <FormSection
        index="01"
        title="Income & expenditure"
        description="Baseline household burn against earned income."
        meta={
          monthlyIncome > 0
            ? `${formatCurrency(monthlyIncome)}/mo · savings rate ${savingsRate.toFixed(1)}%`
            : undefined
        }
      >
        <Field
          hint={
            inputs.client.incomeSources && inputs.client.incomeSources.length > 0 ? (
              <p className="mt-3 rounded-md border border-accent/20 bg-accent-soft px-3 py-2 text-xs text-accent-strong">
                {inputs.client.incomeSources.length} income source{inputs.client.incomeSources.length === 1 ? '' : 's'} linked from Client profile. Edit the source breakdown there; this annual total is used by every projection.
              </p>
            ) : undefined
          }
        >
          <FieldGrid cols={{ sm: 2 }} className="gap-x-6">
            <NumberInput
              kind="currency"
              layout="inline"
              label="Annual gross income"
              value={inputs.annualIncome}
              onChange={(val) => updateInputs({ annualIncome: val })}
              helper={`Approx ${formatCurrency(monthlyIncome)} per month`}
            />
            <NumberInput
              kind="currency"
              layout="inline"
              label="Monthly living spend"
              value={inputs.monthlyLivingExpenses}
              onChange={(val) => updateInputs({ monthlyLivingExpenses: val })}
              helper={`Linked total with EMIs: ${formatCurrency(inputs.monthlyExpenditure)}/mo`}
            />
          </FieldGrid>
        </Field>

        <div className="mt-6">
          <Repeater<IncomeSource>
            items={incomeSources}
            getKey={(source) => source.id}
            emptyLabel="No income sources added here — manage the breakdown in Client profile, or add an inflow directly."
            addLabel="Add income"
            onAdd={() => replaceIncomeSources([...incomeSources, { id: `income-${Date.now()}`, name: '', amount: 0, amountInBaseCurrency: 0, currency: 'INR', frequency: 'monthly', notes: '' }])}
            onRemove={(source) => replaceIncomeSources(incomeSources.filter((item) => item.id !== source.id))}
            renderSummary={(source) => (
              <span className="flex items-baseline gap-3 min-w-0 text-sm">
                <span className="truncate font-medium text-ink">{source.name || 'Unnamed source'}</span>
                <span className="truncate text-xs text-muted">{source.frequency}</span>
                <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-muted">
                  {formatCurrency(source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0))}
                </span>
              </span>
            )}
            renderEditor={(source) => (
              <FieldGrid cols={{ md: 3 }}>
                <Input layout="inline" label="Source" value={source.name} onChange={(event) => updateIncomeSource(source.id, { name: event.target.value })} placeholder="Salary, rental…" />
                <NumberInput kind="currency" layout="inline" label="Amount" value={source.amount} onChange={(value) => updateIncomeSource(source.id, { amount: value })} currency={source.currency} onCurrencyChange={(value) => updateIncomeSource(source.id, { currency: value })} />
                <NumberInput kind="currency" layout="inline" label="INR equivalent" value={source.amountInBaseCurrency ?? (source.currency === 'INR' ? source.amount : 0)} onChange={(value) => updateIncomeSource(source.id, { amountInBaseCurrency: value })} helper={source.currency === 'INR' ? 'Same as amount' : 'Used in projections'} />
                <Select layout="inline" label="Frequency" value={source.frequency} onChange={(value) => updateIncomeSource(source.id, { frequency: value as IncomeSource['frequency'] })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
              </FieldGrid>
            )}
          />
        </div>
      </FormSection>

      <FormSection
        index="02"
        title="Systematic investment"
        description={
          inputs.sip.amount > 0
            ? `${formatCurrency(inputs.sip.amount)}/mo accumulating during the career phase.`
            : 'Monthly accumulation during the career phase.'
        }
        className="mt-8"
      >
        <div className="flex items-center gap-2 text-muted mb-4">
          <Repeat size={14} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
          <span className="text-xs">SIP</span>
        </div>
        <FieldGrid cols={{ sm: 2 }} className="gap-x-6">
          <NumberInput
            kind="currency"
            layout="inline"
            label="Monthly SIP amount"
            value={inputs.sip.amount}
            onChange={(val) => updateSIP({ amount: val })}
          />
          <NumberInput
            layout="inline"
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
            slider="focus"
          />
        </FieldGrid>

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
      </FormSection>

      <FormSection
        index="03"
        title="Post-retirement withdrawal"
        description="Target monthly cashflow once retired."
        meta={`Age ${inputs.retirementAge || '—'} → ${inputs.lifeExpectancy || '—'}`}
        className="mt-8"
      >
        <div className="flex items-center gap-2 text-muted mb-4">
          <Download size={14} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
          <span className="text-xs">SWP</span>
        </div>
        <FieldGrid cols={{ sm: 3 }} className="gap-x-6">
          <NumberInput
            kind="currency"
            layout="inline"
            label="Monthly need"
            value={inputs.swp.monthlyNeedToday}
            onChange={(val) => updateSWP({ monthlyNeedToday: val })}
            helper="In today's terms — inflated to the retirement year"
          />
          <NumberInput
            layout="inline"
            label="Post-ret. return"
            value={inputs.swp.postRetirementReturn}
            onChange={(val) => updateSWP({ postRetirementReturn: val })}
            suffix="%"
            step={0.5}
            min={0}
            max={14}
            slider="focus"
          />
          <NumberInput
            layout="inline"
            label="Withdrawal tax"
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
            slider="focus"
          />
        </FieldGrid>
      </FormSection>
    </div>
  );
};
