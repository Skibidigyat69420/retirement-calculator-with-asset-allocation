import { useMemo } from 'react';
import { Repeat, Download, ArrowLeftRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Field, FieldGrid } from '../ui/Field';
import { FormSection } from '../ui/FormSection';
import { Repeater } from '../ui/Repeater';
import { formatCurrency } from '../../lib/formatters';
import { calculateRetirementCorpus, calculateSustainableSWP } from '../../lib/calculators';
import { cn } from '../../lib/utils';
import type { IncomeSource, MasterPlanInputs } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

interface CashflowsStepProps {
  inputs: MasterPlanInputs;
  updateInputs: (updates: Partial<MasterPlanInputs>) => void;
  updateClient: (updates: Partial<MasterPlanInputs['client']>) => void;
  updateSIP: (updates: Partial<MasterPlanInputs['sip']>) => void;
  updateSTP?: (updates: Partial<MasterPlanInputs['stp']>) => void;
  updateSWP: (updates: Partial<MasterPlanInputs['swp']>) => void;
}

export const CashflowsStep = ({
  inputs,
  updateInputs,
  updateClient,
  updateSIP,
  updateSTP,
  updateSWP,
}: CashflowsStepProps) => {
  const { assumptions, wealthResult } = useCalculator();
  const currencyOptions = Object.keys(assumptions.fx);
  const toInr = (amount: number, currency: string) =>
    amount * (assumptions.fx[currency || 'INR']?.spotRate ?? 0);

  const incomeSources = inputs.client.incomeSources || [];
  const annualIncomeFromSources = (sources: IncomeSource[]) => sources.reduce((total, source) => {
    const spotRate = assumptions?.fx[source.currency || 'INR']?.spotRate || 1.0;
    const baseAmount = source.amount * spotRate;
    return total + Math.max(0, baseAmount) * (source.frequency === 'monthly' ? 12 : 1);
  }, 0);
  const annualIncome = incomeSources.length > 0 ? annualIncomeFromSources(incomeSources) : inputs.annualIncome;
  const monthlyIncome = Math.round(annualIncome / 12);
  const monthlySavingsSurplus = monthlyIncome - inputs.monthlyExpenditure;
  const savingsRate = monthlyIncome > 0 ? (monthlySavingsSurplus / monthlyIncome) * 100 : 0;

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

  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const swpStartAge = inputs.swp.startAge || inputs.retirementAge || 60;
  const swpEndAge = inputs.swp.endAge || inputs.lifeExpectancy || 85;
  const distributionYears = Math.max(0, swpEndAge - swpStartAge);

  const monthlyNeedAtRetirement = useMemo(
    () => (inputs.swp.monthlyNeedToday || 0) * Math.pow(1 + inputs.inflation / 100, yearsToRetirement),
    [inputs.swp.monthlyNeedToday, inputs.inflation, yearsToRetirement],
  );

  const grossAnnualAtRetirement = useMemo(() => {
    const taxFactor = Math.max(0.01, 1 - (inputs.swp.taxRate || 0) / 100);
    return (monthlyNeedAtRetirement * 12) / taxFactor;
  }, [monthlyNeedAtRetirement, inputs.swp.taxRate]);

  const projectedCorpusAtRetirement = useMemo(() => {
    const retSnapshot =
      wealthResult.snapshots.find((s) => s.age === inputs.retirementAge) ||
      wealthResult.snapshots.filter((s) => s.phase === 'accumulation').slice(-1)[0];
    return retSnapshot?.total || 0;
  }, [wealthResult.snapshots, inputs.retirementAge]);

  const requiredCorpus = useMemo(() => {
    if (!inputs.swp.monthlyNeedToday || distributionYears <= 0) return 0;
    return calculateRetirementCorpus(
      inputs.currentAge,
      swpStartAge,
      swpEndAge,
      inputs.swp.monthlyNeedToday,
      inputs.inflation,
      inputs.swp.postRetirementReturn,
    ).requiredCorpus;
  }, [
    inputs.currentAge,
    swpStartAge,
    swpEndAge,
    inputs.swp.monthlyNeedToday,
    inputs.inflation,
    inputs.swp.postRetirementReturn,
    distributionYears,
  ]);

  const sustainableMonthlyNeed = useMemo(() => {
    if (projectedCorpusAtRetirement <= 0 || distributionYears <= 0) return 0;
    const { monthlyWithdrawal } = calculateSustainableSWP(
      projectedCorpusAtRetirement,
      inputs.swp.postRetirementReturn,
      inputs.inflation,
      inputs.swp.taxRate,
      distributionYears,
    );
    return Math.round(
      Math.max(0, monthlyWithdrawal / Math.pow(1 + inputs.inflation / 100, yearsToRetirement)),
    );
  }, [
    projectedCorpusAtRetirement,
    inputs.swp.postRetirementReturn,
    inputs.inflation,
    inputs.swp.taxRate,
    distributionYears,
    yearsToRetirement,
  ]);

  const corpusGap = projectedCorpusAtRetirement - requiredCorpus;
  const isSustainable = requiredCorpus > 0 && corpusGap >= 0;

  return (
    <div>
      <div className="py-2.5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-border/60 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Household Cashflow Dynamics</h2>
          <p className="text-xs text-muted max-w-prose mt-0.5">
            Earned income, living expenditure, ongoing SIP accumulation, and post-retirement SWP distributions.
          </p>
        </div>
      </div>

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
                  {formatCurrency(toInr(source.amount, source.currency))}
                </span>
              </span>
            )}
            renderEditor={(source) => (
              <FieldGrid cols={{ md: 3 }}>
                <Input layout="inline" label="Source" value={source.name} onChange={(event) => updateIncomeSource(source.id, { name: event.target.value })} placeholder="Salary, rental…" />
                <NumberInput kind="currency" layout="inline" label="Amount" value={source.amount} onChange={(value) => updateIncomeSource(source.id, { amount: value })} currency={source.currency} currencyOptions={currencyOptions} onCurrencyChange={(value) => updateIncomeSource(source.id, { currency: value })} />
                <NumberInput kind="currency" layout="inline" label="INR equivalent" value={toInr(source.amount, source.currency)} onChange={() => {}} disabled helper="Live reference rate · all plan outputs use INR" />
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

      {/* Systematic Transfer Plan (STP) Deployment */}
      <FormSection
        index="02b"
        title="Systematic Transfer Plan (STP)"
        description="Gradually deploy idle liquid lumpsums into long-term equity/debt."
        meta={inputs.stp?.active ? `Active · ${formatCurrency(inputs.stp.monthlyTransfer)}/mo` : 'Inactive'}
        className="mt-8"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-muted">
            <ArrowLeftRight size={14} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
            <span className="text-xs font-medium text-ink">Systematic transfer from parking capital</span>
          </div>
          <button
            type="button"
            onClick={() => updateSTP?.({ active: !inputs.stp?.active })}
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-md transition-colors',
              inputs.stp?.active
                ? 'bg-accent text-on-inkfill'
                : 'bg-sunken text-muted hover:text-ink border border-border',
            )}
          >
            {inputs.stp?.active ? 'Active' : 'Enable STP'}
          </button>
        </div>

        {inputs.stp?.active && (
          <FieldGrid cols={{ sm: 3 }} className="gap-x-6">
            <NumberInput
              kind="currency"
              layout="inline"
              label="Source liquid capital"
              value={inputs.stp.lumpsum}
              onChange={(val) => updateSTP?.({ lumpsum: val })}
              helper="Total capital to gradually deploy"
            />
            <NumberInput
              kind="currency"
              layout="inline"
              label="Monthly transfer"
              value={inputs.stp.monthlyTransfer}
              onChange={(val) => updateSTP?.({ monthlyTransfer: val })}
              helper="Transfer amount per month"
            />
            <NumberInput
              layout="inline"
              label="Liquid parking return"
              value={inputs.stp.liquidReturn}
              onChange={(val) => updateSTP?.({ liquidReturn: val })}
              suffix="%"
              step={0.5}
              min={0}
              max={10}
              helper="Return while parked in liquid fund"
            />
          </FieldGrid>
        )}
      </FormSection>

      <FormSection
        index="03"
        title="Post-retirement withdrawal (SWP)"
        description="Design systematic withdrawal plans to generate stable, inflation-hedged retirement income."
        meta={`Drawdown: Age ${swpStartAge} → ${swpEndAge} (${distributionYears} yrs)`}
        className="mt-8"
      >
        {/* Living expense benchmark actions */}
        {inputs.monthlyExpenditure > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-surface border border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Download size={15} strokeWidth={1.8} className="text-accent shrink-0" aria-hidden="true" />
              <span className="text-xs text-ink font-medium">
                Benchmark retirement SWP from current household expenses ({formatCurrency(inputs.monthlyExpenditure)}/mo):
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: inputs.monthlyExpenditure })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="100% replacement ratio"
              >
                100% ({formatCurrency(inputs.monthlyExpenditure)})
              </button>
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: Math.round(inputs.monthlyExpenditure * 0.8) })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="80% replacement ratio (standard post-mortgage/work expense drop)"
              >
                80% ({formatCurrency(Math.round(inputs.monthlyExpenditure * 0.8))})
              </button>
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: Math.round(inputs.monthlyExpenditure * 0.7) })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="70% replacement ratio (frugal lifestyle)"
              >
                70% ({formatCurrency(Math.round(inputs.monthlyExpenditure * 0.7))})
              </button>
            </div>
          </div>
        )}

        <FieldGrid cols={{ sm: 3 }} className="gap-x-6">
          <NumberInput
            kind="currency"
            layout="inline"
            label="Monthly need (today's terms)"
            value={inputs.swp.monthlyNeedToday}
            onChange={(val) => updateSWP({ monthlyNeedToday: val })}
            helper="Baseline target retirement drawdown"
          />
          <NumberInput
            layout="inline"
            label="Post-retirement return"
            value={inputs.swp.postRetirementReturn}
            onChange={(val) => updateSWP({ postRetirementReturn: val })}
            suffix="%"
            step={0.5}
            min={0}
            max={14}
            slider="focus"
            helper="Expected return across drawdown years"
          />
          <NumberInput
            layout="inline"
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
            slider="focus"
            helper="Blended LTCG / slab tax on withdrawals"
          />
        </FieldGrid>

        <FieldGrid cols={{ sm: 2 }} className="gap-x-6 mt-4">
          <NumberInput
            layout="inline"
            label="Drawdown start age"
            value={inputs.swp.startAge || inputs.retirementAge || 60}
            onChange={(val) => updateSWP({ startAge: val })}
            min={18}
            max={inputs.lifeExpectancy || 100}
            helper={`Defaults to retirement age (${inputs.retirementAge || 60})`}
          />
          <NumberInput
            layout="inline"
            label="Drawdown end age"
            value={inputs.swp.endAge || inputs.lifeExpectancy || 85}
            onChange={(val) => updateSWP({ endAge: val })}
            min={inputs.swp.startAge || inputs.retirementAge || 60}
            max={100}
            helper={`Defaults to life expectancy (${inputs.lifeExpectancy || 85})`}
          />
        </FieldGrid>

        {/* Live SWP Fiduciary Readiness Analysis Card */}
        {inputs.swp.monthlyNeedToday > 0 && (
          <div className="mt-5 p-4 rounded-lg bg-surface border border-border">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5 pb-2.5 border-b border-border/60">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-accent" />
                SWP Solvency &amp; Readiness Summary
              </span>
              {requiredCorpus > 0 && (
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1.5',
                    isSustainable
                      ? 'bg-positive/10 text-positive border border-positive/20'
                      : 'bg-warning/10 text-warning border border-warning/20',
                  )}
                >
                  {isSustainable ? (
                    <>
                      <CheckCircle2 size={13} />
                      Sustainable through Age {swpEndAge}
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} />
                      Shortfall of {formatCurrency(Math.abs(corpusGap))}
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Monthly Drawdown at Retirement</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatCurrency(monthlyNeedAtRetirement)}/mo
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Inflated at {inputs.inflation}% over {yearsToRetirement} yrs
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Gross Annual Outflow</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatCurrency(grossAnnualAtRetirement)}/yr
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Pre-tax at {inputs.swp.taxRate}% tax rate
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Required Corpus</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatCurrency(requiredCorpus)}
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Projected: {formatCurrency(projectedCorpusAtRetirement)}
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Safe Max Sustainable SWP</span>
                <strong className="text-accent text-sm font-semibold block font-mono">
                  {sustainableMonthlyNeed > 0 ? `${formatCurrency(sustainableMonthlyNeed)}/mo` : '—'}
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  In today's value terms
                </span>
              </div>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
};
