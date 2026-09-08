import { Target, ArrowRight } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { GoalConflictResolver } from './GoalConflictResolver';

export const GoalsStep = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
  // const { inputs, wealthResult } = useCalculator();

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Life Goals & Milestones"
        subtitle="Define financial objectives and resolve capital allocation conflicts."
        badge="Step 4"
      />

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <Target className="text-ink" size={20} />
            <h3 className="text-lg font-bold text-ink">Goal Conflict Resolution</h3>
          </div>
          
          <GoalConflictResolver />
          
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 py-2.5 px-6 bg-sunken text-ink rounded-xl text-sm font-semibold hover:bg-raised transition-colors">
          Back
        </button>
        <button type="button" onClick={onNext} className="flex items-center gap-2 py-2.5 px-6 bg-ink text-surface rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <span>Save & Continue to Risk</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
