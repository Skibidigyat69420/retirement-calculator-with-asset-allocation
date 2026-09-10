import { useMemo, useState } from 'react';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Scale,
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

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    labResult.scenarios[0]?.id || 'early-retirement',
  );

  const [tagFilter, setTagFilter] = useState<string>('All');

  const selectedScenario = useMemo(() => {
    return labResult.scenarios.find((s) => s.id === selectedScenarioId) || labResult.scenarios[0];
  }, [labResult.scenarios, selectedScenarioId]);

  const filteredScenarios = useMemo(() => {
    if (tagFilter === 'All') return labResult.scenarios;
    return labResult.scenarios.filter((s) => s.tag === tagFilter);
  }, [labResult.scenarios, tagFilter]);

  const handleApplyScenario = (scenario: ScenarioComparisonItem) => {
    updateInputs(scenario.modifiedInputs);
    showToast(`Applied "${scenario.name}" to Master Plan.`, 'success');
  };

  const deltaCorpus = selectedScenario.deltaCorpus;
  const deltaProb = selectedScenario.deltaProb;

  return (
    <Card className="border border-border space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical size={20} className="text-accent" />
            <h3 className="text-lg font-bold text-ink tracking-tight">
              Scenario Comparative Simulation Lab
            </h3>
            <Badge variant="outline" className="text-[10px] tracking-wider uppercase font-semibold">
              Live Stress & What-If
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Evaluate sensitivity across macroeconomic shocks, sequence-of-returns risk, inflation surges, and retirement timing alongside your baseline.
          </p>
        </div>

        {/* Tag Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-sunken p-1 rounded-xl border border-border">
          {['All', 'Retirement', 'Savings', 'Market', 'Inflation', 'Expense'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                tagFilter === tag
                  ? 'bg-accent text-white shadow-2xs'
                  : 'text-muted hover:text-ink hover:bg-surface'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis Insight Banner */}
      <div className="p-4 rounded-xl bg-accent-soft border border-accent/30 flex items-start gap-3.5">
        <Sparkles size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-accent block">
            Practitioner Synthesis
          </span>
          <p className="text-xs text-ink leading-relaxed font-medium">
            {labResult.synthesisAdvice}
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Baseline Current Plan */}
        <div className="p-5 rounded-2xl bg-surface border-2 border-border space-y-4 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-muted px-2 py-0.5 rounded bg-sunken border border-border">
              Control / Baseline
            </span>
            <Badge variant="navy" className="text-[10px]">Active Plan</Badge>
          </div>

          <div>
            <h4 className="text-base font-bold text-ink">{labResult.basePlan.name}</h4>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {labResult.basePlan.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Solvency</span>
              <span className="font-mono font-bold text-lg text-ink">
                {labResult.basePlan.successProbability}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Terminal ₹</span>
              <span className="font-mono font-bold text-lg text-ink truncate">
                {formatCurrencyCompact(labResult.basePlan.terminalCorpus)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Longevity</span>
              <span className="font-mono font-bold text-lg text-ink">
                Age {labResult.basePlan.depletionAge}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sunken border border-border flex items-center justify-between text-xs">
            <span className="text-muted">Portfolio Status</span>
            <span className="font-semibold text-positive flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              {labResult.basePlan.verdict}
            </span>
          </div>
        </div>

        {/* Right Column: Selected Scenario Variant */}
        <div className="p-5 rounded-2xl bg-surface border-2 border-accent/40 space-y-4 shadow-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-accent px-2 py-0.5 rounded bg-accent-soft border border-accent/30">
              Scenario Under Test
            </span>
            <span className="text-[10px] uppercase font-bold text-muted bg-sunken px-2 py-0.5 rounded">
              {selectedScenario.tag}
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-ink">{selectedScenario.name}</h4>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              {selectedScenario.description}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Solvency</span>
              <span className="font-mono font-bold text-lg text-ink">
                {selectedScenario.successProbability}%
              </span>
              <span className={`text-[10px] font-bold block ${deltaProb >= 0 ? 'text-positive' : 'text-negative'}`}>
                {deltaProb >= 0 ? `+${deltaProb}%` : `${deltaProb}%`}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Terminal ₹</span>
              <span className="font-mono font-bold text-lg text-ink truncate">
                {formatCurrencyCompact(selectedScenario.terminalCorpus)}
              </span>
              <span className={`text-[10px] font-bold block ${deltaCorpus >= 0 ? 'text-positive' : 'text-negative'}`}>
                {deltaCorpus >= 0 ? `+${formatCurrencyCompact(deltaCorpus)}` : formatCurrencyCompact(deltaCorpus)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sunken border border-border text-center">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">Longevity</span>
              <span className="font-mono font-bold text-lg text-ink">
                Age {selectedScenario.depletionAge}
              </span>
              <span className="text-[10px] font-medium text-muted block">
                {selectedScenario.depletionAge >= inputs.lifeExpectancy ? 'Full horizon' : `Early ${selectedScenario.depletionAge}y`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted truncate">
              {selectedScenario.verdict}
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleApplyScenario(selectedScenario)}
              className="shrink-0 flex items-center gap-1.5"
            >
              <span>Apply to Plan</span>
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="space-y-3 pt-2 border-t border-border">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <Scale size={14} className="text-accent" />
          Select a Stress Test or Strategic Model to Compare
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredScenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            const isPositive = sc.deltaCorpus >= 0;

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-surface border-accent shadow-sm ring-1 ring-accent/30'
                    : 'bg-sunken border-border hover:border-border-strong hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-ink truncate">{sc.name}</span>
                  <Badge variant={isSelected ? 'navy' : 'outline'} className="text-[9px]">
                    {sc.tag}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-border text-xs font-mono">
                  <span className="text-muted">
                    Solvency: <strong className="text-ink">{sc.successProbability}%</strong>
                  </span>
                  <span className={`font-bold flex items-center gap-0.5 ${isPositive ? 'text-positive' : 'text-negative'}`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? `+${formatCurrencyCompact(sc.deltaCorpus)}` : formatCurrencyCompact(sc.deltaCorpus)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
