import { useMemo, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FormSection } from '../ui/FormSection';
import { calculateEMI } from '../../lib/calculators';
import { guardNumber, formatOrDash } from '../../lib/planState';
import { formatReportingCurrency } from '../../lib/formatters';
import { ASSET_LABELS, ASSET_COLORS } from '../../lib/constants';
import type { MasterPlanInputs, Asset, AssetCategory, Liability } from '../../types';
import { useCalculator } from '../../context/CalculatorContext';

interface FinancialsStepProps {
  inputs: MasterPlanInputs;
  liabilities: Liability[];
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  updateLiability: (id: string, patch: Partial<Liability>) => void;
  onAddLiability: (liability?: Partial<Liability>) => void;
  onRemoveLiability: (id: string) => void;
  onAddAsset: (asset: Omit<Asset, 'id'>) => void;
  onRemoveAsset: (id: string) => void;
}

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = (
  ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as AssetCategory[]
).map((cat) => ({ value: cat, label: ASSET_LABELS[cat] }));

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

export const FinancialsStep = ({
  inputs,
  liabilities,
  updateAsset,
  updateLiability,
  onAddLiability,
  onRemoveLiability,
  onAddAsset,
  onRemoveAsset,
}: FinancialsStepProps) => {
  const { assumptions } = useCalculator();
  const currencyOptions = useMemo(
    () =>
      Object.keys(assumptions.fx || {}).sort((a, b) =>
        a === 'INR' ? -1 : b === 'INR' ? 1 : a.localeCompare(b),
      ),
    [assumptions.fx],
  );
  const formatOutput = (amountInInr: number, compact = false) =>
    formatReportingCurrency(amountInInr, inputs.reportingCurrency, assumptions.fx, compact);

  const fx = assumptions?.fx;

  const totalAssets = useMemo(() => {
    return inputs.assets.reduce((sum, a) => {
      const spotRate = fx?.[a.currency || 'INR']?.spotRate || 1.0;
      return sum + (Number(a.value) * spotRate || 0);
    }, 0);
  }, [inputs.assets, fx]);

  const activeLoansWithEMI = useMemo(() => {
    return liabilities.map((loan) => {
      const p = Math.max(0, Number(loan.principal) || 0);
      const r = Math.max(0, Number(loan.rate) || 0);
      const t = Math.max(1, Number(loan.tenureYears) || 1);
      const spotRate = fx?.[loan.currency || 'INR']?.spotRate || 1.0;

      const res =
        p > 0
          ? calculateEMI(p * spotRate, r, t)
          : { emi: 0, totalPayment: 0, totalInterest: 0, principal: 0, yearlyData: [] };
      return {
        ...loan,
        emi: res.emi,
        totalPayment: res.totalPayment,
        totalInterest: res.totalInterest,
      };
    });
  }, [liabilities, fx]);

  const totalLiabilities = useMemo(() => {
    return liabilities.reduce((sum, l) => {
      const spotRate = fx?.[l.currency || 'INR']?.spotRate || 1.0;
      return sum + (Number(l.principal) * spotRate || 0);
    }, 0);
  }, [liabilities, fx]);

  const totalMonthlyEMI = useMemo(() => {
    return activeLoansWithEMI
      .filter((l) => l.includeInExpenses)
      .reduce((sum, l) => sum + l.emi, 0);
  }, [activeLoansWithEMI]);

  const netBalanceSheet = totalAssets - totalLiabilities;
  const debtToAsset = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const handleQuickAddAsset = () => {
    onAddAsset({
      name: '',
      category: 'equity',
      value: 0,
      returnRate: 12,
      currency: inputs.reportingCurrency || 'INR',
      liquidateAtRetirement: true,
    });
  };

  const handleQuickAddLoan = () => {
    onAddLiability({
      id: `loan-${Date.now()}`,
      name: '',
      principal: 0,
      rate: 8.5,
      tenureYears: 10,
      includeInExpenses: true,
      currency: inputs.reportingCurrency || 'INR',
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleQuickAddAsset();
      } else if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleQuickAddLoan();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputs.reportingCurrency]);

  const summaryRows = [
    {
      label: 'Gross assets',
      value: formatOrDash(totalAssets > 0 ? totalAssets : null, formatOutput),
      note: `${inputs.assets.length} item${inputs.assets.length === 1 ? '' : 's'} recorded`,
    },
    {
      label: 'Liabilities',
      value: formatOrDash(totalLiabilities > 0 ? totalLiabilities : null, formatOutput),
      note: `${liabilities.length} active loan${liabilities.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Net balance sheet',
      value: formatOrDash(
        totalAssets > 0 || totalLiabilities > 0 ? guardNumber(netBalanceSheet) : null,
        formatOutput,
      ),
      note: 'Net household equity',
    },
    {
      label: 'Monthly EMI',
      value: formatOrDash(totalMonthlyEMI > 0 ? totalMonthlyEMI : null, (v) => `${formatOutput(v)}/mo`),
      note: totalAssets > 0 ? `Debt-to-asset ${debtToAsset.toFixed(1)}%` : undefined,
    },
  ];

  return (
    <div>
      <div className="py-2.5 pb-4 flex items-center justify-between gap-4 flex-wrap border-b border-border/60 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Household Balance Sheet & Net Worth</h2>
          <p className="text-xs text-muted max-w-prose mt-0.5">
            Investable assets, properties, and outstanding liabilities. EMIs amortize automatically into household cashflow.
          </p>
        </div>
      </div>

      {/* Balance sheet summary — horizontal metric strip */}
      <div className="metric-strip rounded-xl px-4 py-4 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {summaryRows.map((row) => (
          <div key={row.label} className="min-w-0">
            <span className="text-xs font-medium text-muted block truncate">{row.label}</span>
            <span className="block mt-1 font-mono text-sm tabular-nums text-ink truncate">{row.value}</span>
            {row.note && <span className="block mt-0.5 text-[11px] text-faint">{row.note}</span>}
          </div>
        ))}
      </div>

      {/* Section 01: Assets Spreadsheet Table */}
      <FormSection
        index="01"
        title="Assets"
        description="Holdings that compound toward net worth. Fill in directly like a spreadsheet."
        meta={`${inputs.assets.length} recorded`}
        className="mt-8"
      >
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-xs text-muted">
            Enter values in any currency. The plan equivalent calculates live using normalized reference rates.
          </p>
          <button
            type="button"
            onClick={handleQuickAddAsset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add asset</span>
            <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+A</kbd>
          </button>
        </div>

        <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Assets spreadsheet table">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th className="spreadsheet-th w-10 text-center">#</th>
                <th className="spreadsheet-th min-w-[200px]">Asset Name</th>
                <th className="spreadsheet-th min-w-[140px]">Category</th>
                <th className="spreadsheet-th w-24">Currency</th>
                <th className="spreadsheet-th min-w-[140px] text-right">Current Value</th>
                <th className="spreadsheet-th min-w-[130px] text-right">Plan Eq.</th>
                <th className="spreadsheet-th w-28 text-right">Return (%)</th>
                <th className="spreadsheet-th w-32 text-center">Liquidate @ Ret.</th>
                <th className="spreadsheet-th w-12 text-center" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddAsset)}>
              {inputs.assets.map((asset, index) => {
                const spotRate = fx?.[asset.currency || 'INR']?.spotRate || 1.0;
                const inrValue = (Number(asset.value) || 0) * spotRate;
                return (
                  <tr key={asset.id} className="spreadsheet-tr">
                    <td className="spreadsheet-td text-center font-mono text-xs text-muted">
                      {index + 1}
                    </td>
                    <td className="spreadsheet-td">
                      <input
                        id={index === 0 ? 'mp-asset-name' : undefined}
                        type="text"
                        className="spreadsheet-control font-medium"
                        value={asset.name}
                        onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                        placeholder="e.g. Parag Parikh Flexi Cap"
                        aria-label={`Asset ${index + 1} name`}
                      />
                    </td>
                    <td className="spreadsheet-td">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ASSET_COLORS[asset.category] }}
                          aria-hidden="true"
                        />
                        <select
                          className="spreadsheet-control"
                          value={asset.category}
                          onChange={(e) =>
                            updateAsset(asset.id, { category: e.target.value as AssetCategory })
                          }
                          aria-label={`Asset ${index + 1} category`}
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-raised text-ink">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="spreadsheet-td">
                      <select
                        className="spreadsheet-control font-mono font-semibold text-xs"
                        value={asset.currency || 'INR'}
                        onChange={(e) => updateAsset(asset.id, { currency: e.target.value })}
                        aria-label={`Asset ${index + 1} currency`}
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
                        step={1000}
                        className="spreadsheet-control text-right font-mono tabular-nums"
                        value={asset.value === 0 ? '' : asset.value}
                        onChange={(e) =>
                          updateAsset(asset.id, {
                            value: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="0"
                        aria-label={`Asset ${index + 1} value`}
                      />
                    </td>
                    <td className="spreadsheet-td text-right">
                      <span className="spreadsheet-pill font-mono tabular-nums">
                        {formatOutput(inrValue)}
                      </span>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.5}
                          className="spreadsheet-control text-right font-mono tabular-nums w-16"
                          value={asset.returnRate}
                          onChange={(e) =>
                            updateAsset(asset.id, { returnRate: Number(e.target.value) || 0 })
                          }
                          aria-label={`Asset ${index + 1} return rate`}
                        />
                        <span className="text-xs text-muted font-mono">%</span>
                      </div>
                    </td>
                    <td className="spreadsheet-td text-center">
                      <input
                        type="checkbox"
                        className="accent-accent cursor-pointer w-4 h-4"
                        checked={asset.liquidateAtRetirement}
                        onChange={(e) =>
                          updateAsset(asset.id, { liquidateAtRetirement: e.target.checked })
                        }
                        aria-label={`Liquidate asset ${index + 1} at retirement`}
                      />
                    </td>
                    <td className="spreadsheet-td text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveAsset(asset.id)}
                        className="spreadsheet-delete-btn"
                        title="Remove asset"
                        aria-label={`Remove asset ${asset.name || index + 1}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {inputs.assets.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted">
                    No assets recorded yet.{' '}
                    <button
                      type="button"
                      onClick={handleQuickAddAsset}
                      className="text-accent underline font-medium cursor-pointer"
                    >
                      Add the first asset
                    </button>{' '}
                    or press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-sunken border border-border text-[10px] font-mono">
                      Alt+A
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
            <kbd>Enter</kbd> on last cell auto-adds row <i>·</i> <kbd>Alt</kbd> + <kbd>A</kbd> add asset <i>·</i>{' '}
            <kbd>Tab</kbd> navigate <i>·</i> <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> save
          </span>
        </p>
      </FormSection>

      {/* Section 02: Liabilities Spreadsheet Table */}
      <FormSection
        index="02"
        title="Loans & liabilities"
        description="Amortized obligations with recurring EMI. Fill in directly like a spreadsheet."
        meta={`${liabilities.length} recorded · ${formatOutput(totalMonthlyEMI)}/mo EMI`}
        className="mt-8"
      >
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-xs text-muted">
            Enter debt in any currency. EMIs automatically amortize into monthly household expenditure.
          </p>
          <button
            type="button"
            onClick={handleQuickAddLoan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-on-inkfill hover:bg-accent-strong transition-colors cursor-pointer"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add loan</span>
            <kbd className="ml-1 text-[10px] font-mono opacity-80">Alt+L</kbd>
          </button>
        </div>

        <div className="spreadsheet-wrap" tabIndex={0} role="region" aria-label="Liabilities spreadsheet table">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th className="spreadsheet-th w-10 text-center">#</th>
                <th className="spreadsheet-th min-w-[200px]">Loan / Liability Name</th>
                <th className="spreadsheet-th w-24">Currency</th>
                <th className="spreadsheet-th min-w-[140px] text-right">Principal Outstanding</th>
                <th className="spreadsheet-th w-28 text-right">Rate (%)</th>
                <th className="spreadsheet-th w-28 text-right">Tenure (Yrs)</th>
                <th className="spreadsheet-th w-28 text-center">In Expenses?</th>
                <th className="spreadsheet-th min-w-[130px] text-right">Est. Monthly EMI</th>
                <th className="spreadsheet-th w-12 text-center" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody onKeyDown={(e) => advanceCell(e, handleQuickAddLoan)}>
              {activeLoansWithEMI.map((loan, index) => {
                return (
                  <tr key={loan.id} className="spreadsheet-tr">
                    <td className="spreadsheet-td text-center font-mono text-xs text-muted">
                      {index + 1}
                    </td>
                    <td className="spreadsheet-td">
                      <input
                        type="text"
                        className="spreadsheet-control font-medium"
                        value={loan.name}
                        onChange={(e) => updateLiability(loan.id, { name: e.target.value })}
                        placeholder="e.g. HDFC Home Loan, Auto Loan"
                        aria-label={`Loan ${index + 1} name`}
                      />
                    </td>
                    <td className="spreadsheet-td">
                      <select
                        className="spreadsheet-control font-mono font-semibold text-xs"
                        value={loan.currency || 'INR'}
                        onChange={(e) => updateLiability(loan.id, { currency: e.target.value })}
                        aria-label={`Loan ${index + 1} currency`}
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
                        step={10000}
                        className="spreadsheet-control text-right font-mono tabular-nums"
                        value={loan.principal === 0 ? '' : loan.principal}
                        onChange={(e) =>
                          updateLiability(loan.id, {
                            principal: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="0"
                        aria-label={`Loan ${index + 1} principal`}
                      />
                    </td>
                    <td className="spreadsheet-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          step={0.25}
                          className="spreadsheet-control text-right font-mono tabular-nums w-16"
                          value={loan.rate}
                          onChange={(e) =>
                            updateLiability(loan.id, { rate: Number(e.target.value) || 0 })
                          }
                          aria-label={`Loan ${index + 1} interest rate`}
                        />
                        <span className="text-xs text-muted font-mono">%</span>
                      </div>
                    </td>
                    <td className="spreadsheet-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          step={1}
                          className="spreadsheet-control text-right font-mono tabular-nums w-14"
                          value={loan.tenureYears}
                          onChange={(e) =>
                            updateLiability(loan.id, {
                              tenureYears: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          aria-label={`Loan ${index + 1} tenure`}
                        />
                        <span className="text-xs text-muted font-mono">y</span>
                      </div>
                    </td>
                    <td className="spreadsheet-td text-center">
                      <input
                        type="checkbox"
                        className="accent-accent cursor-pointer w-4 h-4"
                        checked={loan.includeInExpenses}
                        onChange={(e) =>
                          updateLiability(loan.id, { includeInExpenses: e.target.checked })
                        }
                        aria-label={`Include loan ${index + 1} in expenses`}
                      />
                    </td>
                    <td className="spreadsheet-td text-right">
                      <span className="spreadsheet-pill font-mono tabular-nums font-semibold text-ink">
                        {loan.emi > 0 ? `${formatOutput(loan.emi)}/mo` : '—'}
                      </span>
                    </td>
                    <td className="spreadsheet-td text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveLiability(loan.id)}
                        className="spreadsheet-delete-btn"
                        title="Remove loan"
                        aria-label={`Remove loan ${loan.name || index + 1}`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {liabilities.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted">
                    No loans or liabilities recorded.{' '}
                    <button
                      type="button"
                      onClick={handleQuickAddLoan}
                      className="text-accent underline font-medium cursor-pointer"
                    >
                      Add a loan
                    </button>{' '}
                    or press{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-sunken border border-border text-[10px] font-mono">
                      Alt+L
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
            <kbd>Enter</kbd> on last cell auto-adds loan <i>·</i> <kbd>Alt</kbd> + <kbd>L</kbd> add loan <i>·</i>{' '}
            <kbd>Tab</kbd> navigate <i>·</i> <kbd>Ctrl/⌘</kbd> + <kbd>S</kbd> save
          </span>
        </p>
      </FormSection>
    </div>
  );
};
