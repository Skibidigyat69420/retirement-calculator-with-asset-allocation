import { useMemo, useEffect } from 'react';
import { Repeat, Download, ArrowLeftRight, CheckCircle2, AlertTriangle, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { Field, FieldGrid } from '../ui/Field';
import { FormSection } from '../ui/FormSection';
import { formatReportingCurrency } from '../../lib/formatters';
import { calculateRetirementCorpus, calculateSustainableSWP } from '../../lib/calculators';
import { cn } from '../../lib/utils';
import type { IncomeSource, MasterPlanInputs } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

const advanceCell = (
  event: React.KeyboardEvent<HTMLTableSectionElement | HTMLDivElement>,
  onAddRow?: () => void,
) => {
  if (event.key !== 'Enter' || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  if (!target || !target.matches('input, select, textarea, button')) return;

  const container = event.currentTarget;
  const cells = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type="checkbox"]), select:not([disabled]), input[type="checkbox"]:not([disabled])',
    ),
  );
  const currentIndex = cells.indexOf(target);
  if (currentIndex === -1) return;

  event.preventDefault();
  if (event.shiftKey) {
    const previous = cells[currentIndex - 1];
    previous?.focus();
    if (previous instanceof HTMLInputElement && previous.type !== 'checkbox') previous.select?.();
    return;
  }

  const next = cells[currentIndex + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement && next.type !== 'checkbox') next.select?.();
  } else if (onAddRow) {
    onAddRow();
  }
};

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
  const currencyOptions = Object.keys(assumptions.fx).sort((a, b) => (a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b)));
  const toInr = (amount: number, currency: string) =>
    amount * (assumptions.fx[currency || 'INR']?.spotRate ?? (currency === 'INR' ? 1 : 0));
  const sipInr = toInr(inputs.sip.amount, inputs.sip.currency || 'INR');
  const stpLumpsumInr = toInr(inputs.stp.lumpsum, inputs.stp.currency || 'INR');
  const stpTransferInr = toInr(inputs.stp.monthlyTransfer, inputs.stp.currency || 'INR');
  const swpNeedInr = toInr(inputs.swp.monthlyNeedToday, inputs.swp.currency || 'INR');
  const directAnnualIncomeInr = toInr(inputs.annualIncome, inputs.annualIncomeCurrency || 'INR');
  const directLivingSpendInr = toInr(inputs.monthlyLivingExpenses, inputs.monthlyLivingExpensesCurrency || 'INR');
  const monthlyEmiInr = (inputs.liabilities || [])
    .filter((liability) => liability.includeInExpenses)
    .reduce((sum, liability) => {
      const principal = Math.max(0, Number(liability.principal) || 0);
      const rate = Math.max(0, Number(liability.rate) || 0) / 1200;
      const months = Math.max(1, (Number(liability.tenureYears) || 1) * 12);
      const nativeEmi = Number(liability.monthlyPayment) > 0
        ? Number(liability.monthlyPayment)
        : rate === 0 ? principal / months : principal * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
      return sum + toInr(nativeEmi, liability.currency || 'INR');
    }, 0);
  const monthlyHouseholdSpendInr = directLivingSpendInr + monthlyEmiInr;
  const formatOutput = (amountInInr: number) =>
    formatReportingCurrency(amountInInr, inputs.reportingCurrency, assumptions.fx);

  const incomeSources = inputs.client.incomeSources || [];
  const annualIncomeFromSources = (sources: IncomeSource[]) => sources.reduce((total, source) => {
    const spotRate = assumptions?.fx[source.currency || 'INR']?.spotRate || 1.0;
    const baseAmount = source.amount * spotRate;
    return total + Math.max(0, baseAmount) * (source.frequency === 'monthly' ? 12 : 1);
  }, 0);
  const annualIncome = incomeSources.length > 0 ? annualIncomeFromSources(incomeSources) : directAnnualIncomeInr;
  const monthlyIncome = Math.round(annualIncome / 12);
  const monthlySavingsSurplus = monthlyIncome - monthlyHouseholdSpendInr;
  const savingsRate = monthlyIncome > 0 ? (monthlySavingsSurplus / monthlyIncome) * 100 : 0;

  const replaceIncomeSources = (sources: IncomeSource[]) => {
    updateClient({ incomeSources: sources });
    updateInputs({ annualIncome: annualIncomeFromSources(sources) });
  };

  const handleQuickAddIncome = () => {
    replaceIncomeSources([
      ...incomeSources,
      {
        id: `income-${Date.now()}`,
        name: '',
        amount: 0,
        amountInBaseCurrency: 0,
        currency: inputs.reportingCurrency || 'INR',
        frequency: 'monthly',
        notes: '',
      },
    ]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        handleQuickAddIncome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [incomeSources, inputs.reportingCurrency]);

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
    () => swpNeedInr * Math.pow(1 + inputs.inflation / 100, yearsToRetirement),
    [swpNeedInr, inputs.inflation, yearsToRetirement],
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
    if (!swpNeedInr || distributionYears <= 0) return 0;
    return calculateRetirementCorpus(
      inputs.currentAge,
      swpStartAge,
      swpEndAge,
      swpNeedInr,
      inputs.inflation,
      inputs.swp.postRetirementReturn,
    ).requiredCorpus;
  }, [
    inputs.currentAge,
    swpStartAge,
    swpEndAge,
    swpNeedInr,
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
        description="Baseline household burn against earned income. Fill in directly like a spreadsheet."
        meta={
          monthlyIncome > 0
            ? `${formatOutput(monthlyIncome)}/mo · savings rate ${savingsRate.toFixed(1)}%`
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
              currency={inputs.annualIncomeCurrency || 'INR'}
              currencyOptions={currencyOptions}
              onCurrencyChange={(currency) => updateInputs({ annualIncomeCurrency: currency })}
              helper={`Plan value: ${formatOutput(directAnnualIncomeInr)}/yr`}
            />
            <NumberInput
              kind="currency"
              layout="inline"
              label="Monthly living spend"
              value={inputs.monthlyLivingExpenses}
              onChange={(val) => updateInputs({ monthlyLivingExpenses: val })}
              currency={inputs.monthlyLivingExpensesCurrency || 'INR'}
              currencyOptions={currencyOptions}
              onCurrencyChange={(currency) => updateInputs({ monthlyLivingExpensesCurrency: currency })}
              helper={`Plan value: ${formatOutput(directLivingSpendInr)}/mo; total with EMIs ${formatOutput(monthlyHouseholdSpendInr)}/mo`}
            />
          </FieldGrid>
        </Field>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <span className="text-xs font-medium text-ink">Inflow Breakdown</span>
            <button
              type="button"
              onClick={handleQuickAddIncome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add income</span>
              <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+I</kbd>
            </button>
          </div>

          <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Income sources spreadsheet table">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th className="spreadsheet-th w-10 text-center">#</th>
                  <th className="spreadsheet-th min-w-[200px]">Source Name</th>
                  <th className="spreadsheet-th w-24">Currency</th>
                  <th className="spreadsheet-th min-w-[130px] text-right">Amount</th>
                  <th className="spreadsheet-th w-32">Frequency</th>
                  <th className="spreadsheet-th min-w-[130px] text-right">Plan Eq. (Annual)</th>
                  <th className="spreadsheet-th min-w-[160px]">Notes</th>
                  <th className="spreadsheet-th w-12 text-center" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddIncome)}>
                {incomeSources.map((source, index) => {
                  const spotRate = assumptions?.fx?.[source.currency || 'INR']?.spotRate || 1.0;
                  const inrAmount = (Number(source.amount) || 0) * spotRate;
                  const inrAnnual = inrAmount * (source.frequency === 'monthly' ? 12 : 1);

                  return (
                    <tr key={source.id} className="spreadsheet-tr">
                      <td className="spreadsheet-td text-center font-mono text-xs text-muted">
                        {index + 1}
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          className="spreadsheet-control font-medium"
                          value={source.name}
                          onChange={(e) => updateIncomeSource(source.id, { name: e.target.value })}
                          placeholder="e.g. Salary, Consulting, Rental"
                          aria-label={`Income source ${index + 1} name`}
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <select
                          className="spreadsheet-control font-mono font-semibold text-xs"
                          value={source.currency || 'INR'}
                          onChange={(e) => updateIncomeSource(source.id, { currency: e.target.value })}
                          aria-label={`Income source ${index + 1} currency`}
                        >
                          {currencyOptions.map((curr) => (
                            <option key={curr} value={curr} className="bg-raised text-ink">
                              {curr}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="spreadsheet-td text-right">
                        <input
                          type="number"
                          min={0}
                          step={5000}
                          className="spreadsheet-control text-right font-mono tabular-nums"
                          value={source.amount === 0 ? '' : source.amount}
                          onChange={(e) =>
                            updateIncomeSource(source.id, {
                              amount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="0"
                          aria-label={`Income source ${index + 1} amount`}
                        />
                      </td>
                      <td className="spreadsheet-td">
                        <select
                          className="spreadsheet-control text-xs"
                          value={source.frequency}
                          onChange={(e) =>
                            updateIncomeSource(source.id, {
                              frequency: e.target.value as IncomeSource['frequency'],
                            })
                          }
                          aria-label={`Income source ${index + 1} frequency`}
                        >
                          <option value="monthly" className="bg-raised text-ink">Monthly</option>
                          <option value="annual" className="bg-raised text-ink">Annual</option>
                        </select>
                      </td>
                      <td className="spreadsheet-td text-right">
                        <span className="spreadsheet-pill font-mono tabular-nums">
                          {formatOutput(inrAnnual)}/yr
                        </span>
                      </td>
                      <td className="spreadsheet-td">
                        <input
                          type="text"
                          className="spreadsheet-control text-xs"
                          value={source.notes || ''}
                          onChange={(e) => updateIncomeSource(source.id, { notes: e.target.value })}
                          placeholder="Optional details"
                          aria-label={`Income source ${index + 1} notes`}
                        />
                      </td>
                      <td className="spreadsheet-td text-center">
                        <button
                          type="button"
                          onClick={() => replaceIncomeSources(incomeSources.filter((item) => item.id !== source.id))}
                          className="spreadsheet-delete-btn"
                          title="Remove income source"
                          aria-label={`Remove income source ${source.name || index + 1}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {incomeSources.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-muted">
                      No income breakdown added yet.{' '}
                      <button
                        type="button"
                        onClick={handleQuickAddIncome}
                        className="text-accent underline font-medium cursor-pointer"
                      >
                        Add an income source
                      </button>{' '}
                      or press{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-sunken border border-border text-[10px] font-mono">
                        Alt+I
                      </kbd>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="identity-sheet-shortcuts mt-3">
            <span>Fast entry</span>
            <span>
              <kbd>Enter</kbd> next cell <i>·</i> <kbd>Shift</kbd> + <kbd>Enter</kbd> previous <i>·</i>{' '}
              <kbd>Enter</kbd> on last cell auto-adds row <i>·</i> <kbd>Alt</kbd> + <kbd>I</kbd> add income <i>·</i>{' '}
              <kbd>Tab</kbd> navigate <i>·</i> <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> save
            </span>
          </p>
        </div>
      </FormSection>

      <FormSection
        index="02"
        title="Systematic investment"
        description={
          sipInr > 0
            ? `${formatOutput(sipInr)}/mo accumulating during the career phase.`
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
            currency={inputs.sip.currency || 'INR'}
            currencyOptions={currencyOptions}
            onCurrencyChange={(currency) => updateSIP({ currency })}
            helper={`Plan value: ${formatOutput(sipInr)}/mo`}
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
        meta={inputs.stp?.active ? `Active · ${formatOutput(stpTransferInr)}/mo` : 'Inactive'}
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
              currency={inputs.stp.currency || 'INR'} currencyOptions={currencyOptions} onCurrencyChange={(currency) => updateSTP?.({ currency })}
              helper={`Plan value: ${formatOutput(stpLumpsumInr)}`}
            />
            <NumberInput
              kind="currency"
              layout="inline"
              label="Monthly transfer"
              value={inputs.stp.monthlyTransfer}
              onChange={(val) => updateSTP?.({ monthlyTransfer: val })}
              currency={inputs.stp.currency || 'INR'} currencyOptions={currencyOptions} onCurrencyChange={(currency) => updateSTP?.({ currency })}
              helper={`Plan value: ${formatOutput(stpTransferInr)}/mo`}
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
        {monthlyHouseholdSpendInr > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-surface border border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Download size={15} strokeWidth={1.8} className="text-accent shrink-0" aria-hidden="true" />
              <span className="text-xs text-ink font-medium">
                Benchmark retirement SWP from current household expenses ({formatOutput(monthlyHouseholdSpendInr)}/mo):
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: monthlyHouseholdSpendInr, currency: 'INR' })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="100% replacement ratio"
              >
                100% ({formatOutput(monthlyHouseholdSpendInr)})
              </button>
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: Math.round(monthlyHouseholdSpendInr * 0.8), currency: 'INR' })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="80% replacement ratio (standard post-mortgage/work expense drop)"
              >
                80% ({formatOutput(Math.round(monthlyHouseholdSpendInr * 0.8))})
              </button>
              <button
                type="button"
                onClick={() => updateSWP({ monthlyNeedToday: Math.round(monthlyHouseholdSpendInr * 0.7), currency: 'INR' })}
                className="px-2.5 py-1 text-xs rounded-md bg-sunken hover:bg-border text-ink font-medium transition-colors"
                title="70% replacement ratio (frugal lifestyle)"
              >
                70% ({formatOutput(Math.round(monthlyHouseholdSpendInr * 0.7))})
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
            currency={inputs.swp.currency || 'INR'} currencyOptions={currencyOptions} onCurrencyChange={(currency) => updateSWP({ currency })}
            helper={`Plan value: ${formatOutput(swpNeedInr)}/mo`}
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
                      Shortfall of {formatOutput(Math.abs(corpusGap))}
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Monthly Drawdown at Retirement</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatOutput(monthlyNeedAtRetirement)}/mo
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Inflated at {inputs.inflation}% over {yearsToRetirement} yrs
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Gross Annual Outflow</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatOutput(grossAnnualAtRetirement)}/yr
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Pre-tax at {inputs.swp.taxRate}% tax rate
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Required Corpus</span>
                <strong className="text-ink text-sm font-semibold block font-mono">
                  {formatOutput(requiredCorpus)}
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  Projected: {formatOutput(projectedCorpusAtRetirement)}
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-sunken border border-border">
                <span className="text-muted block text-[11px] mb-1">Safe Max Sustainable SWP</span>
                <strong className="text-accent text-sm font-semibold block font-mono">
                  {sustainableMonthlyNeed > 0 ? `${formatOutput(sustainableMonthlyNeed)}/mo` : '—'}
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
