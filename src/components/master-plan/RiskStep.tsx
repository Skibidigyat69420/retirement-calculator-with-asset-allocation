import { AlertTriangle, ArrowRight, Activity, Zap } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { SectionTitle } from '../ui/SectionTitle';
import { formatPercent } from '../../lib/formatters';

export const RiskStep = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
  const { riskProfile, riskScore, applyRiskProfileToPlan } = useCalculator();

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Risk Profile & Allocation"
        subtitle="Review your risk capacity and align asset allocation targets."
        badge="Step 5"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
            <Activity className="text-ink" size={20} />
            <h3 className="text-lg font-bold text-ink">Risk Assessment Result</h3>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-sunken" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  className="text-ink"
                  strokeWidth="10"
                  strokeDasharray={`${(riskScore / 100) * 283} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-ink">{riskScore}</span>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Score</span>
              </div>
            </div>
            
            <h4 className="text-xl font-bold text-ink text-center">{riskProfile.label}</h4>
            <p className="text-sm text-muted text-center mt-2 max-w-xs">{riskProfile.description}</p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
              <Zap className="text-ink" size={20} />
              <h3 className="text-lg font-bold text-ink">Suggested Allocation Target</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <MetricCard label="Equity Focus" value={formatPercent(riskProfile.targets.equity)} />
              <MetricCard label="Debt Focus" value={formatPercent(riskProfile.targets.debt)} />
            </div>

            <button
              type="button"
              onClick={() => {
                applyRiskProfileToPlan();
              }}
              className="w-full py-3 bg-ink text-surface rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Apply Allocation to Plan
            </button>
          </Card>
          
          <div className="p-4 bg-sunken rounded-xl border border-border flex items-start gap-3">
            <AlertTriangle size={18} className="text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-muted">
              Applying the target allocation will override your manual assumptions for equity and debt splits in SIPs and STPs.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 py-2.5 px-6 bg-sunken text-ink rounded-xl text-sm font-semibold hover:bg-raised transition-colors">
          Back
        </button>
        <button type="button" onClick={onNext} className="flex items-center gap-2 py-2.5 px-6 bg-ink text-surface rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <span>Save & Continue to Results</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
