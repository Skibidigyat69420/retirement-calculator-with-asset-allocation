import { useMemo, useState } from 'react';
import { Banknote, PieChart, Landmark, Wallet, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCalculator } from '../../context/CalculatorContext';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { Badge } from '../ui/Badge';
import { SectionTitle } from '../ui/SectionTitle';
import { formatCurrency, formatPercent } from '../../lib/formatters';
import { PlanningAssumptionsModal } from '../analytics/PlanningAssumptionsModal';
import { calculateEMI } from '../../lib/calculators';

export const CashflowsStep = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
  const {
    inputs,
    updateInputs,
    updateSIP,
    updateSTP,
    updateSWP,
    wealthResult,
    assumptionMode,
    activeAssumptionSourceLabel,
  } = useCalculator();

  const [isAssumptionsModalOpen, setIsAssumptionsModalOpen] = useState(false);

  const loans = inputs.loans || [];
  
  const activeLoansWithEMI = useMemo(() => {
    return loans.map((loan) => {
      const p = Math.max(0, Number(loan.principal) || 0);
      const r = Math.max(0, Number(loan.rate) || 0);
      const t = Math.max(1, Number(loan.tenureYears) || 1);
      const res = p > 0 ? calculateEMI(p, r, t) : { emi: 0 };
      return { ...loan, emi: res.emi };
    });
  }, [loans]);

  const totalMonthlyLoanEMI = useMemo(() => {
    return activeLoansWithEMI
      .filter((l) => l.includeInExpenses)
      .reduce((sum, l) => sum + l.emi, 0);
  }, [activeLoansWithEMI]);

  const baseLivingSpend = useMemo(() => {
    return Math.max(0, inputs.monthlyExpenditure - Math.round(totalMonthlyLoanEMI));
  }, [inputs.monthlyExpenditure, totalMonthlyLoanEMI]);

  const monthlyNeedAtRetirement = useMemo(() => {
    const years = Math.max(0, inputs.retirementAge - inputs.currentAge);
    return inputs.swp.monthlyNeedToday * Math.pow(1 + inputs.inflation / 100, years);
  }, [inputs.swp.monthlyNeedToday, inputs.inflation, inputs.retirementAge, inputs.currentAge]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Cashflows & Savings"
        subtitle="Household operating cashflows and deployment strategies."
        badge="Step 3"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-sunken text-ink rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-faint font-bold">Return Assumptions Engine</div>
            <div className="text-sm font-semibold text-ink flex items-center gap-2">
              <span>{activeAssumptionSourceLabel}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-ink/10 text-ink-soft font-mono uppercase font-semibold">
                {assumptionMode} mode
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAssumptionsModalOpen(true)}
          className="px-3.5 py-1.5 bg-ink/10 hover:bg-ink/20 text-ink rounded-xl text-xs font-semibold transition-colors border border-ink/20 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Calibrate Assumptions</span>
          <span>→</span>
        </button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
          <div className="flex items-center space-x-2">
            <Banknote size={18} className="text-ink" />
            <h3 className="text-lg font-bold text-ink tracking-tight">Household Operating Cashflows</h3>
          </div>
          <Badge variant={wealthResult.savingsRate >= 0 ? 'success' : 'danger'}>
            {formatPercent(wealthResult.savingsRate)} savings rate
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <CurrencyInput
            label="Annual Pre-Tax Income"
            value={inputs.annualIncome}
            onChange={(v) => updateInputs({ annualIncome: v })}
            helper="Gross household income"
          />
          <CurrencyInput
            label="Monthly Living Spend"
            value={baseLivingSpend}
            onChange={(v) => updateInputs({ monthlyExpenditure: v + Math.round(totalMonthlyLoanEMI) })}
            helper="Household operating expenses"
          />
          <div className="flex flex-col justify-between p-3.5 bg-sunken border border-border rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Monthly Loan EMI</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${totalMonthlyLoanEMI > 0 ? 'text-negative bg-rose-50 border-negative/40' : 'text-muted bg-sunken border-border'}`}>
                {activeLoansWithEMI.filter((l) => l.includeInExpenses).length} Active
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-negative mt-1">
              {formatCurrency(totalMonthlyLoanEMI)}<span className="text-xs font-normal text-muted font-sans ml-1">/mo</span>
            </div>
          </div>
          <CurrencyInput
            label="Total Monthly Outflow"
            value={inputs.monthlyExpenditure}
            onChange={(v) => updateInputs({ monthlyExpenditure: v })}
            helper="Living spend + active loan EMI"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Annual Income" value={formatCurrency(wealthResult.annualIncome)} />
          <MetricCard label="Annual Expenses" value={formatCurrency(wealthResult.annualExpenses)} />
          <MetricCard
            label="Net Annual Savings"
            value={formatCurrency(wealthResult.annualSavings)}
            subtext={`${formatPercent(wealthResult.savingsRate)} of income`}
            variant={wealthResult.annualSavings >= 0 ? 'success' : 'danger'}
          />
          <MetricCard
            label="Invested / Deployed"
            value={formatCurrency(wealthResult.annualInvested)}
            subtext={`${formatPercent(wealthResult.investmentRate)} of income`}
          />
        </div>

        {wealthResult.annualSavings > 0 ? (
          <div className="mt-6 p-4 bg-sunken rounded-xl border border-border">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted font-medium">Net savings deployment</span>
              <span className="font-semibold text-ink font-mono">
                {formatPercent((wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)} deployed
              </span>
            </div>
            <div className="h-2 bg-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-sunken rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (wealthResult.annualInvested / Math.max(wealthResult.annualSavings, 1)) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-rose-50 border border-negative/40 rounded-xl flex items-start gap-3 text-negative">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-negative" />
            <div className="text-xs sm:text-sm">
              <strong>Cashflow Deficit Detected:</strong> Annual expenses exceed household income. Reduce lifestyle expenditure or restructure loan liabilities to eliminate deficits.
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-4 border-b border-border pb-3">
            <PieChart size={18} className="text-ink" />
            <h3 className="text-base font-bold text-ink tracking-tight">SIP Accumulation</h3>
          </div>
          <div className="space-y-4">
            <CurrencyInput label="Monthly SIP Amount" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
            <Slider label="Equity Split" value={inputs.sip.equitySplit} onChange={(v) => updateSIP({ equitySplit: v, debtSplit: 100 - v })} />
            <Slider label="Debt Split" value={inputs.sip.debtSplit} onChange={(v) => updateSIP({ debtSplit: v, equitySplit: 100 - v })} />
            <NumberInput label="Annual Step-Up" value={inputs.sip.stepUp} onChange={(v) => updateSIP({ stepUp: v })} suffix="%" helper="Yearly contribution increase" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-2 mb-4 border-b border-border pb-3">
            <Landmark size={18} className="text-ink" />
            <h3 className="text-base font-bold text-ink tracking-tight">STP Phased Deployment</h3>
          </div>
          <label className="flex items-center space-x-2 text-sm font-semibold text-ink mb-4 cursor-pointer">
            <input type="checkbox" checked={inputs.stp.active} onChange={(e) => updateSTP({ active: e.currentTarget.checked })} className="w-4 h-4 rounded border-border-strong text-ink focus:ring-focus-ring" />
            <span>Enable Systematic Transfer Plan</span>
          </label>
          {inputs.stp.active ? (
            <div className="space-y-4">
              <CurrencyInput label="Liquid Lumpsum" value={inputs.stp.lumpsum} onChange={(v) => updateSTP({ lumpsum: v })} />
              <CurrencyInput label="Monthly Transfer" value={inputs.stp.monthlyTransfer} onChange={(v) => updateSTP({ monthlyTransfer: v })} />
              <Slider label="Equity Target Split" value={inputs.stp.equitySplit} onChange={(v) => updateSTP({ equitySplit: v, debtSplit: 100 - v })} />
              <Slider label="Debt Target Split" value={inputs.stp.debtSplit} onChange={(v) => updateSTP({ debtSplit: v, equitySplit: 100 - v })} />
            </div>
          ) : (
            <p className="text-xs text-muted bg-sunken border border-border rounded-xl p-3">STP transfers idle cash or windfall liquidity gradually into target equities and debt to mitigate timing risk.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center space-x-2 mb-4 border-b border-border pb-3">
            <Wallet size={18} className="text-ink" />
            <h3 className="text-base font-bold text-ink tracking-tight">SWP Post-Retirement</h3>
          </div>
          <div className="space-y-4">
            <CurrencyInput label="Target Monthly Income (Today's ₹)" value={inputs.swp.monthlyNeedToday} onChange={(v) => updateSWP({ monthlyNeedToday: v })} />
            <div className="p-3.5 bg-sunken border border-border rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Need at Retirement:</span>
                <span className="font-mono font-bold text-ink">{formatCurrency(monthlyNeedAtRetirement)}/mo</span>
              </div>
            </div>
            <div className="pt-2">
              <Link to="/retirement" className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sunken hover:bg-raised text-ink rounded-xl text-xs font-semibold transition-colors border border-border">
                <span>Open Retirement & SWP Lab</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 py-2.5 px-6 bg-sunken text-ink rounded-xl text-sm font-semibold hover:bg-raised transition-colors">
          Back
        </button>
        <button type="button" onClick={onNext} className="flex items-center gap-2 py-2.5 px-6 bg-ink text-surface rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <span>Save & Continue to Goals</span>
          <ArrowRight size={16} />
        </button>
      </div>
      
      <PlanningAssumptionsModal isOpen={isAssumptionsModalOpen} onClose={() => setIsAssumptionsModalOpen(false)} />
    </div>
  );
};
