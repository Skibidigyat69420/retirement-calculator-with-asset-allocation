import { useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
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
    <Card className="p-6 border border-zinc-200/90 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-zinc-900" />
            <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
              Scenario Analysis
            </h3>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-semibold">
              Model Comparison
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Compare the financial impact of retirement timing, savings changes, market declines, and inflation against your current plan.
          </p>
        </div>
      </div>

      {/* Key Finding Alert */}
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-3">
        <div className="space-y-0.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-950 block">
            Key Finding
          </span>
          <p className="text-xs text-zinc-600 leading-relaxed font-medium">
            {labResult.synthesisAdvice}
          </p>
        </div>
      </div>

      {/* Scenario Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="pb-2">Scenario</th>
              <th className="pb-2 text-right">Success Rate</th>
              <th className="pb-2 text-right">Terminal Corpus</th>
              <th className="pb-2 text-right">Portfolio Longevity</th>
              <th className="pb-2 text-right">Difference vs Current</th>
              <th className="pb-2 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {/* Base Plan Row */}
            <tr className="bg-zinc-50/80 font-semibold">
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <Badge variant="navy" className="text-[9px]">Current</Badge>
                  <span className="text-zinc-950 font-bold">{labResult.basePlan.name}</span>
                </div>
                <p className="text-[11px] text-zinc-500 font-normal mt-0.5">
                  {labResult.basePlan.description}
                </p>
              </td>
              <td className="py-3 text-right font-mono font-bold text-zinc-950">
                {labResult.basePlan.successProbability}%
              </td>
              <td className="py-3 text-right font-mono font-bold text-zinc-950">
                {formatCurrencyCompact(labResult.basePlan.terminalCorpus)}
              </td>
              <td className="py-3 text-right text-emerald-700 font-medium">
                {labResult.basePlan.verdict}
              </td>
              <td className="py-3 text-right text-zinc-400 font-mono">-</td>
              <td className="py-3 text-center">
                <span className="text-[11px] text-zinc-400 font-medium">Baseline</span>
              </td>
            </tr>

            {/* Alternative Scenarios */}
            {labResult.scenarios.map((sc) => {
              let probColor = 'text-emerald-700';
              if (sc.successProbability < 70) probColor = 'text-rose-700';
              else if (sc.successProbability < 85) probColor = 'text-zinc-700';

              return (
                <tr
                  key={sc.id}
                  className="hover:bg-zinc-50/60 transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{sc.tag}</Badge>
                      <span className="font-bold text-zinc-950">{sc.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{sc.description}</p>
                  </td>
                  <td className={`py-3 text-right font-mono font-bold ${probColor}`}>
                    {sc.successProbability}%
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-zinc-950">
                    {formatCurrencyCompact(sc.terminalCorpus)}
                  </td>
                  <td className="py-3 text-right text-zinc-700 text-[11px]">
                    {sc.verdict}
                  </td>
                  <td className="py-3 text-right font-mono text-[11px]">
                    <span className={sc.deltaCorpus >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {sc.deltaCorpus >= 0 ? `+${formatCurrencyCompact(sc.deltaCorpus)}` : formatCurrencyCompact(sc.deltaCorpus)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {sc.deltaProb >= 0 ? `+${sc.deltaProb}% prob` : `${sc.deltaProb}% prob`}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyScenario(sc)}
                      className="text-[11px] h-7 px-2.5 text-zinc-900 border-zinc-300 hover:bg-zinc-100"
                    >
                      Apply Scenario
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
