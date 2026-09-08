import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { SectionTitle } from '../ui/SectionTitle';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { ScenarioLab } from '../analytics/ScenarioLab';

export const ResultsStep = ({ onBack }: { onBack: () => void }) => {
  const { inputs, wealthResult, riskProfile } = useCalculator();

  const monthlyNeedAtRetirement = inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, Math.max(0, inputs.retirementAge - inputs.currentAge));

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Projections & Solvency"
        subtitle="Review terminal wealth, goal funding, and plan sustainability."
        badge="Step 6"
      />

      <div className="space-y-6">
        {/* Plan Feasibility Alerts */}
        {!wealthResult.sustainable ? (
          <div className="bg-rose-50 border border-negative/40 rounded-xl p-4 flex items-start gap-3 text-negative">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-negative" />
            <div className="text-sm">
              <strong className="font-semibold text-rose-900">Plan Depletion Alert:</strong> Corpus is projected to exhaust at age{' '}
              <span className="font-bold font-mono">{wealthResult.depletionAge}</span>. Increase monthly savings, delay retirement, or reduce post-retirement withdrawal expectations.
            </div>
          </div>
        ) : wealthResult.goalsAtRisk.length > 0 ? (
          <div className="bg-sunken border border-border-strong rounded-xl p-4 flex items-start gap-3 text-ink-soft">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-ink" />
            <div className="text-sm">
              <strong className="font-semibold text-ink">Goals Requiring Calibration:</strong>{' '}
              {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}. Review required SIP contributions in the Goal Planner.
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-positive/40 rounded-xl p-4 flex items-start gap-3 text-positive">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-positive" />
            <div className="text-sm">
              <strong className="font-semibold text-emerald-950">Plan Fully Solvent & Sustainable:</strong> Lifetime SWP and all essential milestone goals are projected to be funded through age{' '}
              <span className="font-mono font-bold">{inputs.lifeExpectancy}</span>.
            </div>
          </div>
        )}

        {/* Core Outcome Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Terminal Corpus (Nominal)"
            value={formatCurrency(wealthResult.terminalValue)}
            subtext={`At Age ${inputs.lifeExpectancy}`}
          />
          <MetricCard
            label="Terminal Corpus (Real)"
            value={formatCurrency(wealthResult.terminalRealValue)}
            subtext="Inflation-adjusted"
          />
          <MetricCard
            label="Nominal CAGR"
            value={formatPercent(wealthResult.cagrNominal)}
            subtext="Annual portfolio growth"
          />
          <MetricCard
            label="Monthly Need at Retirement"
            value={formatCurrency(monthlyNeedAtRetirement)}
            subtext={`From ${formatCurrency(inputs.swp.monthlyNeedToday)} today`}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Plan Success Rate"
            value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
            subtext="Correlated simulation paths"
            variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
          />
          <MetricCard
            label="Essential Goal Success"
            value={formatPercent(wealthResult.essentialSuccessRate * 100)}
            subtext="Non-negotiable milestones"
            variant={wealthResult.essentialSuccessRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
          />
          <MetricCard
            label="Surplus Capital Generated"
            value={formatCurrency(wealthResult.terminalValue)}
            subtext="Unutilized legacy wealth"
          />
          <MetricCard
            label="Max Drawdown Risk"
            value={formatPercent(wealthResult.maxDrawdownProbability * 100)}
            subtext="Probability of breaching max drawdown"
            variant={wealthResult.maxDrawdownProbability > 0.1 ? 'danger' : 'default'}
          />
        </div>

        {/* Detailed Breakdown Card */}
        <Card className="mt-8">
          <h3 className="text-lg font-bold text-ink mb-4 border-b border-border pb-3">Projection Assumptions Applied</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
             <div>
               <p className="text-muted">Inflation Rate</p>
               <p className="font-semibold text-ink font-mono">{inputs.inflation}%</p>
             </div>
             <div>
               <p className="text-muted">Retirement Age</p>
               <p className="font-semibold text-ink font-mono">{inputs.retirementAge}</p>
             </div>
             <div>
               <p className="text-muted">Life Expectancy</p>
               <p className="font-semibold text-ink font-mono">{inputs.lifeExpectancy}</p>
             </div>
             <div>
               <p className="text-muted">Current Age</p>
               <p className="font-semibold text-ink font-mono">{inputs.currentAge}</p>
             </div>
          </div>
        </Card>

        {/* Scenario Lab */}
        <div className="mt-8">
          <ScenarioLab />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 py-2.5 px-6 bg-sunken text-ink rounded-xl text-sm font-semibold hover:bg-raised transition-colors">
          Back
        </button>
      </div>
    </div>
  );
};
