import { User, Calendar, ArrowRight } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { NumberInput } from '../ui/NumberInput';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SectionTitle } from '../ui/SectionTitle';

export const ProfileStep = ({ onNext }: { onNext: () => void }) => {
  const { inputs, updateClient, updateInputs } = useCalculator();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Client Profile"
        subtitle="Foundational identity, mandate details, and economic drivers."
        badge="Step 1"
      />

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="flex items-center space-x-2.5 mb-6 border-b border-border pb-4">
            <User size={18} className="text-ink" />
            <h3 className="text-lg font-bold text-ink tracking-tight">Client & Mandate Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Input
              label="Client Name"
              value={inputs.client?.name || ''}
              onChange={(e) => updateClient({ name: e.target.value })}
              placeholder="e.g. Vikram & Ananya Sharma"
            />
            <Input
              label="Client Email"
              type="email"
              value={inputs.client?.email || ''}
              onChange={(e) => updateClient({ email: e.target.value })}
              placeholder="e.g. client@example.com"
            />
            <Input
              label="Wealth Advisor / Firm"
              value={inputs.client?.advisor || ''}
              onChange={(e) => updateClient({ advisor: e.target.value })}
              placeholder="e.g. Sound Thesis Advisory"
            />
            <Input
              label="Mandate Review Date"
              type="date"
              value={inputs.client?.reviewDate || ''}
              onChange={(e) => updateClient({ reviewDate: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Primary Planning Mandate"
                value={inputs.client?.notes || ''}
                onChange={(e) => updateClient({ notes: e.target.value })}
                placeholder="Key priorities, time horizons, and family objectives"
              />
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar size={16} className="text-ink" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Life Horizon & Economic Drivers</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NumberInput
                label="Current Age"
                value={inputs.currentAge}
                onChange={(v) => updateInputs({ currentAge: v })}
              />
              <NumberInput
                label="Retirement Age"
                value={inputs.retirementAge}
                onChange={(v) => updateInputs({ retirementAge: v })}
              />
              <NumberInput
                label="Life Expectancy"
                value={inputs.lifeExpectancy}
                onChange={(v) => updateInputs({ lifeExpectancy: v })}
              />
              <CurrencyInput
                label="Annual Household Income"
                value={inputs.annualIncome}
                onChange={(v) => updateInputs({ annualIncome: v })}
                helper="Gross pre-tax income"
              />
              <NumberInput
                label="Inflation Assumption"
                value={inputs.inflation}
                onChange={(v) => updateInputs({ inflation: v })}
                suffix="%"
                helper="Long-term hurdle rate"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 py-2.5 px-6 bg-ink text-surface rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span>Save & Continue to Financials</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
