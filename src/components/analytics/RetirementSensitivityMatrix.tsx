import { useMemo, useState } from 'react';
import { Grid, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';

interface MatrixCell {
  retAge: number;
  monthlyExpense: number;
  expenseMultiplier: number;
  projectedCorpus: number;
  requiredCorpus: number;
  surplus: number;
  surplusPercent: number;
  sustainable: boolean;
}

export const RetirementSensitivityMatrix = () => {
  const { inputs, wealthResult, updateInputs, showToast } = useCalculator();

  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);

  // Generate 5 retirement ages around target retirement age
  const ageOffsets = [-3, -1, 0, 2, 5];
  const expenseMultipliers = [0.75, 0.9, 1.0, 1.15, 1.3];

  const retirementAges = useMemo(() => {
    return ageOffsets
      .map((offset) => inputs.retirementAge + offset)
      .filter((age) => age > inputs.currentAge && age < inputs.lifeExpectancy);
  }, [inputs.retirementAge, inputs.currentAge, inputs.lifeExpectancy]);

  const matrix: MatrixCell[][] = useMemo(() => {
    const postRetReturn = inputs.swp.postRetirementReturn / 100;
    const infl = inputs.inflation / 100;
    const realReturn = (1 + postRetReturn) / (1 + infl) - 1;
    const taxFactor = 1 - inputs.swp.taxRate / 100;

    return retirementAges.map((retAge) => {
      const yearsToRet = Math.max(0, retAge - inputs.currentAge);
      const distYears = Math.max(1, inputs.lifeExpectancy - retAge);

      // Estimate projected corpus at this retirement age from snapshot trajectory
      const snap = wealthResult.snapshots.find((s) => s.age === retAge);
      const projected =
        snap?.total ??
        (wealthResult.netWorth * Math.pow(1.08, yearsToRet) +
          (inputs.sip.amount * 12 * (Math.pow(1.08, yearsToRet) - 1)) / 0.08);

      return expenseMultipliers.map((mult) => {
        const monthlyToday = inputs.swp.monthlyNeedToday * mult;
        const monthlyAtRet = monthlyToday * Math.pow(1 + infl, yearsToRet);
        const annualGross = (monthlyAtRet * 12) / taxFactor;

        let required = annualGross * distYears;
        if (realReturn > 0) {
          required = (annualGross * (1 - Math.pow(1 + realReturn, -distYears))) / realReturn;
        }

        const surplus = projected - required;
        const surplusPercent = required > 0 ? (surplus / required) * 100 : 0;
        const sustainable = surplus >= 0;

        return {
          retAge,
          monthlyExpense: Math.round(monthlyToday),
          expenseMultiplier: mult,
          projectedCorpus: Math.round(projected),
          requiredCorpus: Math.round(required),
          surplus: Math.round(surplus),
          surplusPercent,
          sustainable,
        };
      });
    });
  }, [retirementAges, expenseMultipliers, inputs, wealthResult]);

  const handleApplyScenario = (cell: MatrixCell) => {
    updateInputs({
      retirementAge: cell.retAge,
      swp: {
        ...inputs.swp,
        monthlyNeedToday: cell.monthlyExpense,
      },
    });
    showToast(
      `Updated plan: Target retirement age ${cell.retAge} with ₹${(cell.monthlyExpense / 1000).toFixed(0)}K monthly living budget.`,
    );
  };

  return (
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Grid size={18} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Retirement Age vs Lifestyle Expense Sensitivity Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate portfolio sustainability across 25 combinations of early/delayed retirement and living expenditures.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 self-start sm:self-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Comfortable Surplus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            Borderline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            Depletion Risk
          </span>
        </div>
      </div>

      {/* 2D Heatmap Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2.5 text-left font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80 border border-slate-200">
                Retirement Age
              </th>
              {expenseMultipliers.map((m) => (
                <th
                  key={m}
                  className="p-2.5 font-bold text-slate-700 bg-slate-50/80 border border-slate-200"
                >
                  <div>
                    {m === 1.0 ? 'Current Budget' : m > 1.0 ? `+${Math.round((m - 1) * 100)}%` : `-${Math.round((1 - m) * 100)}%`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 font-normal">
                    {formatCurrencyCompact(inputs.swp.monthlyNeedToday * m)}/mo
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => {
              const retAge = retirementAges[rIdx];
              const isBaseAge = retAge === inputs.retirementAge;

              return (
                <tr key={retAge}>
                  <td
                    className={`p-2.5 text-left font-bold border border-slate-200 ${
                      isBaseAge ? 'bg-indigo-50 text-indigo-900' : 'bg-slate-50/50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>Age {retAge}</span>
                      {isBaseAge && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-800">
                          Target
                        </span>
                      )}
                    </div>
                  </td>

                  {row.map((cell) => {
                    const isSelected =
                      selectedCell?.retAge === cell.retAge &&
                      selectedCell?.expenseMultiplier === cell.expenseMultiplier;

                    // Color code cell
                    let bgClass = 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100/80';
                    if (cell.surplusPercent >= 15) {
                      bgClass = 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100/80';
                    } else if (cell.surplusPercent >= 0) {
                      bgClass = 'bg-sky-50 text-sky-950 border-sky-200 hover:bg-sky-100/80';
                    } else if (cell.surplusPercent >= -15) {
                      bgClass = 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100/80';
                    }

                    if (isSelected) {
                      bgClass += ' ring-2 ring-indigo-600 ring-offset-1';
                    }

                    return (
                      <td
                        key={cell.expenseMultiplier}
                        onClick={() => setSelectedCell(cell)}
                        className={`p-2 border transition-all cursor-pointer ${bgClass}`}
                      >
                        <div className="font-mono font-bold text-xs">
                          {cell.surplus >= 0 ? '+' : ''}
                          {formatCurrencyCompact(cell.surplus)}
                        </div>
                        <div className="text-[10px] opacity-80 font-mono mt-0.5">
                          Req: {formatCurrencyCompact(cell.requiredCorpus)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Snapshot Callout */}
      {selectedCell && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-indigo-950">
                Scenario: Retire at Age {selectedCell.retAge} with{' '}
                {formatCurrencyCompact(selectedCell.monthlyExpense)}/mo
              </span>
              <Badge
                variant={selectedCell.sustainable ? 'success' : 'danger'}
                className="text-[10px]"
              >
                {selectedCell.sustainable ? 'Fully Funded' : 'Requires Extra Capital'}
              </Badge>
            </div>
            <p className="text-xs text-slate-600">
              Projected Corpus: <span className="font-bold text-slate-800 font-mono">{formatCurrencyCompact(selectedCell.projectedCorpus)}</span> | Required Corpus: <span className="font-bold text-slate-800 font-mono">{formatCurrencyCompact(selectedCell.requiredCorpus)}</span> ({selectedCell.surplus >= 0 ? 'Surplus' : 'Shortfall'}: {formatCurrencyCompact(Math.abs(selectedCell.surplus))})
            </p>
          </div>

          <button
            onClick={() => handleApplyScenario(selectedCell)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs flex items-center gap-1 self-start sm:self-center shrink-0"
          >
            Apply to Active Plan
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </Card>
  );
};
