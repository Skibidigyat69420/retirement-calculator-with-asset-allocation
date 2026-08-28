import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { calculateMasterPlan } from '../lib/calculations';
import { formatCurrency } from '../lib/formatters';

export const Retirement = () => {
  const [currentAge, setCurrentAge] = useState(34);
  const [retirementAge, setRetirementAge] = useState(45);
  const [monthlyExpense, setMonthlyExpense] = useState(150000);
  const [currentCorpus, setCurrentCorpus] = useState(23300000);
  const [monthlySIP, setMonthlySIP] = useState(90000);
  const [returnRate, setReturnRate] = useState(10);
  const [inflation, setInflation] = useState(5);

  const result = useMemo(() => {
    return calculateMasterPlan({
      currentAge,
      retirementAge,
      lifeExpectancy: 90,
      inflation,
      assets: [{ id: 'corpus', name: 'Current Corpus', value: currentCorpus, returnRate, category: 'equity', liquidateAtRetirement: true }],
      sip: { amount: monthlySIP, equitySplit: 100, debtSplit: 0, stepUp: 0, equityReturn: returnRate, debtReturn: returnRate },
      stp: { active: false, source: 'custom', lumpsum: 0, monthlyTransfer: 0, liquidReturn: 7, equitySplit: 100, debtSplit: 0, liquidCap: 0 },
      swp: { monthlyNeedToday: monthlyExpense, postRetirementReturn: returnRate - 1, taxRate: 10, startAge: retirementAge, endAge: 90 },
    });
  }, [currentAge, retirementAge, monthlyExpense, currentCorpus, monthlySIP, returnRate, inflation]);

  const requiredCorpus = useMemo(() => {
    const monthlyNeedAtRetirement = monthlyExpense * Math.pow(1 + inflation / 100, retirementAge - currentAge);
    const annualNeed = monthlyNeedAtRetirement * 12;
    const realReturn = (returnRate - 1 - inflation) / 100;
    if (realReturn <= 0) return annualNeed * 30;
    return annualNeed / realReturn;
  }, [monthlyExpense, inflation, retirementAge, currentAge, returnRate]);

  const gap = result.terminalCorpusNominal - requiredCorpus;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Retirement Readiness"
        subtitle="A simplified FIRE-style check: how does your projected corpus compare to what you actually need?"
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Calculator size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Current Age" value={currentAge} onChange={setCurrentAge} />
            <NumberInput label="Retirement Age" value={retirementAge} onChange={setRetirementAge} />
            <NumberInput label="Monthly Expense Today" value={monthlyExpense} onChange={setMonthlyExpense} />
            <NumberInput label="Current Corpus" value={currentCorpus} onChange={setCurrentCorpus} />
            <NumberInput label="Monthly SIP" value={monthlySIP} onChange={setMonthlySIP} />
            <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
            <NumberInput label="Inflation" value={inflation} onChange={setInflation} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Projected Corpus" value={formatCurrency(result.terminalCorpusNominal)} variant="navy" />
            <MetricCard label="Required Corpus" value={formatCurrency(requiredCorpus)} variant="gold" />
            <MetricCard
              label="Gap"
              value={formatCurrency(gap)}
              subtext={gap >= 0 ? 'Surplus' : 'Shortfall'}
              variant={gap >= 0 ? 'success' : 'danger'}
            />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Readiness Verdict</h3>
            <p className="text-stone-600 leading-relaxed">
              By age <strong>{retirementAge}</strong>, your monthly expense of{' '}
              <strong>{formatCurrency(monthlyExpense)}</strong> today will inflate to{' '}
              <strong>{formatCurrency(result.monthlyNeedAtRetirement)}</strong>. Your projected corpus is{' '}
              <strong className={gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(result.terminalCorpusNominal)}
              </strong>{' '}
              against a rule-of-thumb required corpus of <strong>{formatCurrency(requiredCorpus)}</strong>.
            </p>
            <div className="mt-4 p-4 bg-stone-50 rounded-xl text-sm text-stone-600">
              <strong>Note:</strong> The "required corpus" uses a perpetual real-return approximation. For precise
              drawdown modelling, use the Master Plan or SWP calculators.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
