import { useMemo, useState } from 'react';
import {
  Target,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { evaluateGoalConflicts } from '../../lib/goalConflictEngine';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';

export const GoalConflictMatrix = () => {
  const { inputs, wealthResult } = useCalculator();
  const [customPriorities, setCustomPriorities] = useState<Record<string, number>>({});

  const conflictResult = useMemo(() => {
    return evaluateGoalConflicts(inputs, wealthResult, customPriorities);
  }, [inputs, wealthResult, customPriorities]);

  const handlePriorityChange = (goalId: string, newRank: number) => {
    setCustomPriorities((prev) => ({
      ...prev,
      [goalId]: newRank,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Overview Topline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Goals Demand
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrencyCompact(conflictResult.totalGoalsDemand)}
          </div>
          <p className="text-xs text-slate-500">{conflictResult.evaluatedGoals.length} discrete targets</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Retirement Corpus Demand
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-950">
            {formatCurrencyCompact(conflictResult.retirementDemand)}
          </div>
          <p className="text-xs text-slate-500">At Age {inputs.retirementAge} to {inputs.lifeExpectancy}</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Household Capital Demand
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrencyCompact(conflictResult.totalHouseholdDemand)}
          </div>
          <p className="text-xs text-slate-500">Retirement + All Goals combined</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Simultaneous Affordability
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                conflictResult.isFullyFunded ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {conflictResult.netSurplusOrDeficit >= 0 ? '+' : ''}
              {formatCurrencyCompact(conflictResult.netSurplusOrDeficit)}
            </span>
            <Badge variant={conflictResult.isFullyFunded ? 'success' : 'danger'} className="text-[9px]">
              {conflictResult.isFullyFunded ? '100% FUNDED' : 'DEFICIT'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">Against projected net wealth</p>
        </div>
      </div>

      {/* Main Conflict Table */}
      <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target size={18} className="text-indigo-600" />
              Simultaneous Goals Affordability & Priority Trade-Offs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{conflictResult.tradeOffSummary}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2 w-14 text-center">Rank</th>
                <th className="pb-2">Goal / Milestone</th>
                <th className="pb-2 w-24 text-right">Target Year</th>
                <th className="pb-2 w-28 text-right">Cost Today</th>
                <th className="pb-2 w-28 text-right">Future Cost</th>
                <th className="pb-2 w-32 text-right">Allocated Wealth</th>
                <th className="pb-2 w-24 text-right">Coverage</th>
                <th className="pb-2 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Retirement Anchor Row */}
              <tr className="bg-indigo-50/40 font-semibold">
                <td className="py-2.5 text-center font-mono font-bold text-indigo-700">0</td>
                <td className="py-2.5 font-bold text-slate-900">
                  Core Retirement Corpus Anchor
                  <span className="text-[10px] text-indigo-600 font-normal block">Primary non-negotiable household anchor</span>
                </td>
                <td className="py-2.5 text-right font-mono text-slate-700">
                  {new Date().getFullYear() + Math.max(1, inputs.retirementAge - inputs.currentAge)}
                </td>
                <td className="py-2.5 text-right font-mono text-slate-700">
                  {formatCurrencyCompact(inputs.swp.monthlyNeedToday * 12 * Math.max(1, inputs.lifeExpectancy - inputs.retirementAge))}
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                  {formatCurrencyCompact(conflictResult.retirementDemand)}
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                  {formatCurrencyCompact(conflictResult.retirementDemand)}
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-emerald-700">100%</td>
                <td className="py-2.5 text-center">
                  <Badge variant="success">Secured</Badge>
                </td>
              </tr>

              {/* Evaluated Goals Rows */}
              {conflictResult.evaluatedGoals.map((g) => {
                let badge = <Badge variant="success">Fully Funded</Badge>;
                if (g.fundedStatus === 'Partially Funded') {
                  badge = <Badge variant="warning">{g.coveragePercent}% Funded</Badge>;
                } else if (g.fundedStatus === 'Unfunded / At Risk') {
                  badge = <Badge variant="danger">At Risk</Badge>;
                }

                return (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 text-center">
                      <select
                        value={g.priorityRank}
                        onChange={(e) => handlePriorityChange(g.id, parseInt(e.target.value))}
                        aria-label={`Priority rank for ${g.name}`}
                        className="text-xs font-mono font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800"
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <option key={r} value={r}>
                            #{r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {g.name}
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider">{g.category}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-700">
                      {g.targetYear} ({g.yearsAway}y)
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">
                      {formatCurrencyCompact(g.costToday)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrencyCompact(g.futureCost)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-slate-800">
                      {formatCurrencyCompact(g.allocatedWealth)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {g.coveragePercent}%
                    </td>
                    <td className="py-2.5 text-center">{badge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Household Surplus Funding Waterfall */}
      <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Household Monthly Cash Surplus Funding Waterfall
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              How net household cash flow surplus cascades through emergency reserves, priority goals, and core retirement.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {conflictResult.fundingWaterfall.map((step, idx) => (
            <div
              key={step.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-slate-400">STAGE 0{idx + 1}</span>
                <span className="text-xs font-mono font-bold text-slate-700">{step.percentageOfSurplus}% of Surplus</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{step.name}</h4>
              <div className="text-xl font-bold font-mono text-slate-900">
                {formatCurrency(step.monthlyAmount)}
                <span className="text-xs font-sans text-slate-500 font-normal">/mo</span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">{step.reason}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
