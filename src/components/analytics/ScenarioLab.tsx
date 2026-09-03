import { useMemo } from 'react';
import {
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { runScenarioLab, type ScenarioComparisonItem } from '../../lib/scenarioLab';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';

export const ScenarioLab = () => {
  const { inputs, wealthResult, updateInputs, showToast } = useCalculator();

  const labResult = useMemo(() => {
    return runScenarioLab(inputs, wealthResult);
  }, [inputs, wealthResult]);

  const handleApplyScenario = (scenario: ScenarioComparisonItem) => {
    updateInputs(scenario.modifiedInputs);
    showToast(`Applied "${scenario.name}" to Master Plan.`, 'success');
  };

  return (
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Scenario Laboratory & What-If Matrix
            </h3>
            <Badge variant="navy" className="text-[10px] tracking-wider uppercase font-semibold">
              Trade-off Solver
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare early retirement, savings acceleration, tail-risk equity crashes, and inflation shocks against the active baseline plan.
          </p>
        </div>
      </div>

      {/* Synthesis Advice Alert */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-slate-50 border border-indigo-100/90 flex items-start gap-3">
        <Sparkles size={18} className="text-indigo-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-900 block">
            Institutional Synthesis Recommendation
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {labResult.synthesisAdvice}
          </p>
        </div>
      </div>

      {/* Scenario Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="pb-2">Scenario Hypothesis</th>
              <th className="pb-2 text-right">Success Rate</th>
              <th className="pb-2 text-right">Terminal Corpus</th>
              <th className="pb-2 text-right">Longevity Verdict</th>
              <th className="pb-2 text-right">Delta vs Current</th>
              <th className="pb-2 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Base Plan Row */}
            <tr className="bg-slate-50/80 font-semibold">
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <Badge variant="navy" className="text-[9px]">ACTIVE</Badge>
                  <span className="text-slate-900 font-bold">{labResult.basePlan.name}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  {labResult.basePlan.description}
                </p>
              </td>
              <td className="py-3 text-right font-mono font-bold text-slate-900">
                {labResult.basePlan.successProbability}%
              </td>
              <td className="py-3 text-right font-mono font-bold text-slate-900">
                {formatCurrencyCompact(labResult.basePlan.terminalCorpus)}
              </td>
              <td className="py-3 text-right text-emerald-700 font-medium">
                {labResult.basePlan.verdict}
              </td>
              <td className="py-3 text-right text-slate-400 font-mono">-</td>
              <td className="py-3 text-center">
                <span className="text-[11px] text-slate-400 italic">Baseline</span>
              </td>
            </tr>

            {/* Alternative Scenarios */}
            {labResult.scenarios.map((sc) => {
              let probColor = 'text-emerald-700';
              if (sc.successProbability < 70) probColor = 'text-rose-700';
              else if (sc.successProbability < 85) probColor = 'text-amber-700';

              let tagBadge = <Badge variant="navy">{sc.tag}</Badge>;
              if (sc.tag === 'Savings') tagBadge = <Badge variant="success">SIP Boost</Badge>;
              else if (sc.tag === 'Market') tagBadge = <Badge variant="danger">Crash</Badge>;
              else if (sc.tag === 'Inflation') tagBadge = <Badge variant="warning">Inflation</Badge>;
              else if (sc.tag === 'Expense') tagBadge = <Badge variant="gold">Real Estate</Badge>;

              return (
                <tr
                  key={sc.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {tagBadge}
                      <span className="font-bold text-slate-900">{sc.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sc.description}</p>
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${probColor}`}>
                    {sc.successProbability}%
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrencyCompact(sc.terminalCorpus)}
                  </td>
                  <td className="py-3 text-right text-slate-700 text-[11px]">
                    {sc.verdict}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px]">
                    <span className={sc.deltaCorpus >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {sc.deltaCorpus >= 0 ? `+${formatCurrencyCompact(sc.deltaCorpus)}` : formatCurrencyCompact(sc.deltaCorpus)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {sc.deltaProb >= 0 ? `+${sc.deltaProb}% prob` : `${sc.deltaProb}% prob`}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyScenario(sc)}
                      className="text-[11px] h-7 px-2.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                    >
                      Apply Plan
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
