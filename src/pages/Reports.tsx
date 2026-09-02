import { FileText, TrendingUp, Target, PieChart, ShieldCheck, AlertTriangle, CheckCircle2, Globe, Wallet, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { useCalculator } from '../context/CalculatorContext';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Reports = () => {
  const { inputs, riskProfile, wealthResult, manualTargets } = useCalculator();

  const handlePrint = () => {
    window.print();
  };

  const targets = manualTargets || riskProfile.targets;

  const currentAllocationData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: wealthResult.currentAllocation[cat] * wealthResult.netWorth,
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [wealthResult.currentAllocation, wealthResult.netWorth],
  );

  const targetAllocationData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        name: ASSET_LABELS[cat],
        value: wealthResult.netWorth * (targets[cat] / 100),
        color: ASSET_COLORS[cat],
      })).filter((d) => d.value > 0),
    [wealthResult.netWorth, targets],
  );

  const essentialGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'essential');
  const importantGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'important');
  const aspirationalGoals = wealthResult.goalResults.filter((g) => g.goal.priority === 'aspirational');

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Hide app chrome (sidebar, top bar, footer) when printing the report */}
      <style>{`@media print { aside, header, footer { display: none !important; } }`}</style>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <SectionTitle
          title="Plan Reports"
          subtitle="A consolidated view of your financial plan: net worth, allocation, goals, Monte Carlo outcomes, tax, and currency exposure."
          badge="Comprehensive"
        />
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer size={16} />
          Print Report
        </Button>
      </div>

      {/* Executive Client Header Banner */}
      <Card className="bg-paper border-stone-200 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Institutional Wealth Plan</div>
            <h2 className="text-xl sm:text-2xl font-serif text-navy font-bold mt-0.5">{inputs.client?.name || 'Private Client Plan'}</h2>
            <p className="text-xs text-stone-700 mt-1">
              Advisor: <strong className="text-stone-700">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</strong> · Review Date: <strong className="text-stone-700">{inputs.client?.reviewDate || new Date().toISOString().split('T')[0]}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="navy" className="text-xs px-3 py-1">
              Risk: {riskProfile.label}
            </Badge>
            <Badge variant={wealthResult.sustainable ? 'success' : 'danger'} className="text-xs px-3 py-1">
              {wealthResult.sustainable ? 'Sustainable' : `Depletes Age ${wealthResult.depletionAge}`}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Net Worth" value={formatCurrency(wealthResult.netWorth)} subtext="Current assets" variant="navy" />
        <MetricCard label="Net Annual Savings" value={formatCurrency(wealthResult.annualSavings)} subtext={`${formatPercent(wealthResult.savingsRate)} of income`} variant="gold" />
        <MetricCard label="Terminal Corpus" value={formatCurrency(wealthResult.terminalValue)} subtext={`At age ${inputs.lifeExpectancy}`} />
        <MetricCard label="Plan Success Rate" value={formatPercent(wealthResult.monteCarlo.successRate * 100)} subtext="All goals + SWP sustainable" variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><FileText size={18} className="text-gold" /> Plan Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Client age</span><span className="font-medium text-navy">{inputs.currentAge}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Retirement age</span><span className="font-medium text-navy">{inputs.retirementAge}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Life expectancy</span><span className="font-medium text-navy">{inputs.lifeExpectancy}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Annual income</span><span className="font-medium text-navy">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Monthly expenditure</span><span className="font-medium text-navy">{formatCurrency(inputs.monthlyExpenditure)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Annual expenses (today)</span><span className="font-medium text-navy">{formatCurrency(wealthResult.annualExpenses)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Net annual savings</span><span className="font-medium text-navy">{formatCurrency(wealthResult.annualSavings)} ({formatPercent(wealthResult.savingsRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Invested / deployed</span><span className="font-medium text-navy">{formatCurrency(wealthResult.annualInvested)} ({formatPercent(wealthResult.investmentRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Monthly SIP</span><span className="font-medium text-navy">{formatCurrency(wealthResult.monthlySIP)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Total invested (projected)</span><span className="font-medium text-navy">{formatCurrency(wealthResult.totalInvested)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">CAGR nominal</span><span className="font-medium text-navy">{formatPercent(wealthResult.cagrNominal)}</span></div>
            <div className="flex justify-between py-2"><span className="text-stone-700">CAGR real</span><span className="font-medium text-navy">{formatPercent(wealthResult.cagrReal)}</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-gold" /> Risk Profile</h3>
          <div className="p-4 bg-navy text-white rounded-xl mb-4">
            <div className="text-2xl font-serif">{riskProfile.label}</div>
            <p className="text-sm text-stone-200 mt-1">{riskProfile.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-stone-50 rounded-xl"><div className="text-xs text-stone-700">Max drawdown</div><div className="font-medium text-navy">{formatPercent(riskProfile.maxDrawdown)}</div></div>
            <div className="p-3 bg-stone-50 rounded-xl"><div className="text-xs text-stone-700">Volatility target</div><div className="font-medium text-navy">{formatPercent(riskProfile.targetVolatility)}</div></div>
            <div className="p-3 bg-stone-50 rounded-xl"><div className="text-xs text-stone-700">Goal threshold</div><div className="font-medium text-navy">{formatPercent(riskProfile.goalSuccessThreshold)}</div></div>
            <div className="p-3 bg-stone-50 rounded-xl"><div className="text-xs text-stone-700">Max drawdown prob</div><div className="font-medium text-navy">{formatPercent(wealthResult.maxDrawdownProbability * 100)}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><PieChart size={18} className="text-gold" /> Current vs Target Allocation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-stone-700 mb-2 text-center">Current</div>
              <DonutChart data={currentAllocationData} innerRadius={40} outerRadius={70} />
            </div>
            <div>
              <div className="text-xs text-stone-700 mb-2 text-center">Target</div>
              <DonutChart data={targetAllocationData} innerRadius={40} outerRadius={70} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-gold" /> Monte Carlo Fan Chart</h3>
          <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><Target size={18} className="text-gold" /> Goal Probability Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="text-xs text-stone-700">Essential goals</div>
            <div className="text-xl font-serif text-navy mt-1">{formatPercent(wealthResult.essentialSuccessRate * 100)}</div>
            <div className="text-xs text-stone-600 mt-1">{essentialGoals.length} goals</div>
          </div>
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="text-xs text-stone-700">Important goals</div>
            <div className="text-xl font-serif text-navy mt-1">
              {importantGoals.length > 0 ? formatPercent((importantGoals.reduce((s, g) => s + g.successRate, 0) / importantGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-stone-600 mt-1">{importantGoals.length} goals</div>
          </div>
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="text-xs text-stone-700">Aspirational goals</div>
            <div className="text-xl font-serif text-navy mt-1">
              {aspirationalGoals.length > 0 ? formatPercent((aspirationalGoals.reduce((s, g) => s + g.successRate, 0) / aspirationalGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-stone-600 mt-1">{aspirationalGoals.length} goals</div>
          </div>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-700">
                <th className="py-2 pr-4">Goal</th>
                <th className="py-2 pr-4">Priority</th>
                <th className="py-2 pr-4 text-right">Target</th>
                <th className="py-2 pr-4 text-right">Future Value</th>
                <th className="py-2 pr-4 text-right">Success</th>
                <th className="py-2 pr-4 text-right">Required SIP</th>
              </tr>
            </thead>
            <tbody>
              {wealthResult.goalResults.map((g) => (
                <tr key={g.goal.id} className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-medium text-navy">{g.goal.name}</td>
                  <td className="py-2 pr-4"><Badge variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}>{g.goal.priority}</Badge></td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(g.goal.targetAmount)}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(g.futureValue)}</td>
                  <td className="py-2 pr-4 text-right">
                    <span className={g.successRate >= riskProfile.goalSuccessThreshold / 100 ? 'text-green-700' : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6 ? 'text-amber-600' : 'text-red-600'}>
                      {formatPercent(g.successRate * 100)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(g.requiredSIP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><Wallet size={18} className="text-gold" /> Tax Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Annual income</span><span className="font-medium text-navy">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Estimated tax</span><span className="font-medium text-navy">{formatCurrency(wealthResult.taxSummary.annualTax)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Effective tax rate</span><span className="font-medium text-navy">{formatPercent(wealthResult.taxSummary.effectiveRate * 100)}</span></div>
            <div className="flex justify-between py-2 border-b border-stone-100"><span className="text-stone-700">Post-tax income</span><span className="font-medium text-navy">{formatCurrency(wealthResult.taxSummary.postTaxIncome)}</span></div>
            <div className="flex justify-between py-2"><span className="text-stone-700">Recommended tax saving</span><span className="font-medium text-navy">{formatCurrency(wealthResult.taxSummary.recommendedTaxSaving)}</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2"><Globe size={18} className="text-gold" /> Currency Exposure</h3>
          <div className="space-y-3">
            {wealthResult.currencyExposure.map((c) => (
              <div key={c.currency} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-navy">{c.currency}</span>
                  <Badge variant={c.currency === 'INR' ? 'outline' : 'gold'}>{formatPercent(c.percentage)}</Badge>
                </div>
                <div className="text-xs text-stone-700 mt-1">{formatCurrency(c.amount)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {wealthResult.goalsAtRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Goals at risk:</strong>{' '}
            {wealthResult.goalsAtRisk.map((g) => g.goal.name).join(', ')}.
            Review the Goal Planner to increase SIPs or extend horizons.
          </div>
        </div>
      )}

      {wealthResult.sustainable ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 text-green-800">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is sustainable.</strong> The projected corpus is expected to last through age {inputs.lifeExpectancy} under mean assumptions.
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Plan is not sustainable.</strong> Corpus may deplete at age {wealthResult.depletionAge}. Consider increasing savings, delaying retirement, or reducing withdrawals.
          </div>
        </div>
      )}

      <div className="print:hidden">
        <WorkflowFooter
          prev={{ path: '/mvo', label: 'MVO' }}
          next={{ path: '/ips', label: 'Investment Policy Statement' }}
          flowHint="Executive plan summaries, tax analyses, and Monte Carlo curves feed into your formal CFA-aligned IPS document."
        />
      </div>
    </div>
  );
};
