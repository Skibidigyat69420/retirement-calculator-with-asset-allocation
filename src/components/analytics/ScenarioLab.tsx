import { useMemo, useState } from 'react';
import { FlaskConical, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { runScenarioLab, type ScenarioComparisonItem } from '../../lib/scenarioLab';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrencyCompact } from '../../lib/formatters';
import { cn } from '../../lib/utils';

type ScenarioTab = 'base' | 'conservative' | 'optimistic' | 'stress';

export const ScenarioLab = () => {
  const { inputs, wealthResult, updateInputs, showToast } = useCalculator();
  const [activeTab, setActiveTab] = useState<ScenarioTab>('base');

  const labResult = useMemo(() => {
    return runScenarioLab(inputs, wealthResult);
  }, [inputs, wealthResult]);

  const handleApplyScenario = (scenario: ScenarioComparisonItem) => {
    updateInputs(scenario.modifiedInputs);
    showToast(`Applied "${scenario.name}" to Master Plan.`, 'success');
  };

  const getScenarioData = (tab: ScenarioTab) => {
    if (tab === 'base') return labResult.basePlan;
    // Map tabs to scenarios from labResult
    const map: Record<string, string> = {
      'conservative': 'market_crash', // Using market crash as conservative/stress proxy based on scenarioLab.ts
      'optimistic': 'retire_later', 
      'stress': 'high_inflation'
    };
    const sc = labResult.scenarios.find(s => s.id === map[tab]) || labResult.scenarios[0];
    return sc;
  };

  const activeScenario = getScenarioData(activeTab);

  // Compare 3 main scenarios
  const compareBase = labResult.basePlan;
  const compareCons = labResult.scenarios.find(s => s.id === 'market_crash') || labResult.scenarios[0];
  const compareOpt = labResult.scenarios.find(s => s.id === 'retire_later') || labResult.scenarios[1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-ink/5 rounded-lg text-ink">
          <FlaskConical size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">Scenario Lab</h3>
          <p className="text-sm text-muted">Stress test your plan against macro-shocks and lifestyle changes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { id: 'base', label: 'Base Plan', data: compareBase },
          { id: 'conservative', label: 'Conservative (Crash)', data: compareCons },
          { id: 'optimistic', label: 'Optimistic (+2 Yrs)', data: compareOpt }
        ].map(sc => (
          <div key={sc.id} className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer",
            activeTab === sc.id ? "bg-ink text-surface border-ink shadow-lg" : "bg-surface border-border hover:border-ink/30"
          )} onClick={() => setActiveTab(sc.id as ScenarioTab)}>
            <div className="flex justify-between items-start mb-4">
              <div className="font-bold">{sc.label}</div>
              {activeTab === sc.id && <CheckCircle2 size={16} className="text-surface" />}
            </div>
            <div className="space-y-3">
              <div>
                <div className={cn("text-xs opacity-70 mb-1", activeTab === sc.id ? "text-surface" : "text-muted")}>Corpus</div>
                <div className="text-xl font-black font-mono">{formatCurrencyCompact((sc.data as any).terminalCorpus)}</div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className={cn("text-xs opacity-70 mb-1", activeTab === sc.id ? "text-surface" : "text-muted")}>Probability</div>
                  <div className={cn(
                    "font-bold font-mono",
                    activeTab === sc.id ? "text-surface" : ((sc.data as any).successProbability >= 80 ? "text-positive" : "text-negative")
                  )}>
                    {(sc.data as any).successProbability}%
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-xs opacity-70 mb-1", activeTab === sc.id ? "text-surface" : "text-muted")}>Depletion Age</div>
                  <div className="font-bold font-mono">
                    {(sc.data as any).verdict.match(/\d+/) ? (sc.data as any).verdict.match(/\d+/)[0] : '>90'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="p-6 bg-sunken border-border">
        <h4 className="font-bold text-ink mb-4">Detailed Comparison</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-muted uppercase tracking-wider text-xs">
                <th className="pb-3 font-semibold">Metric</th>
                <th className="pb-3 font-semibold">Base Plan</th>
                <th className="pb-3 font-semibold">Conservative</th>
                <th className="pb-3 font-semibold">Optimistic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="py-3 font-medium text-ink">Corpus</td>
                <td className="py-3 font-mono font-bold text-ink">{formatCurrencyCompact(compareBase.terminalCorpus)}</td>
                <td className="py-3 font-mono font-bold text-ink">{formatCurrencyCompact(compareCons.terminalCorpus)}</td>
                <td className="py-3 font-mono font-bold text-ink">{formatCurrencyCompact(compareOpt.terminalCorpus)}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-ink">Probability</td>
                <td className="py-3 font-mono text-ink">{compareBase.successProbability}%</td>
                <td className="py-3 font-mono text-ink">{compareCons.successProbability}%</td>
                <td className="py-3 font-mono text-ink">{compareOpt.successProbability}%</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-ink">Depletion Age</td>
                <td className="py-3 font-mono text-ink">{compareBase.verdict.match(/\d+/) ? compareBase.verdict.match(/\d+/)?.[0] : '>90'}</td>
                <td className="py-3 font-mono text-ink">{compareCons.verdict.match(/\d+/) ? compareCons.verdict.match(/\d+/)?.[0] : '>90'}</td>
                <td className="py-3 font-mono text-ink">{compareOpt.verdict.match(/\d+/) ? compareOpt.verdict.match(/\d+/)?.[0] : '>90'}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-ink">Funding Status</td>
                <td className="py-3 text-xs"><Badge variant="outline">{compareBase.successProbability >= 80 ? 'Funded' : 'At Risk'}</Badge></td>
                <td className="py-3 text-xs"><Badge variant="outline">{compareCons.successProbability >= 80 ? 'Funded' : 'At Risk'}</Badge></td>
                <td className="py-3 text-xs"><Badge variant="outline">{compareOpt.successProbability >= 80 ? 'Funded' : 'At Risk'}</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {activeTab !== 'base' && (
        <div className="flex justify-end">
          <Button 
            onClick={() => handleApplyScenario(activeScenario as any)}
            className="bg-ink text-surface hover:opacity-90 rounded-xl"
          >
            Apply {activeTab} Scenario
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
