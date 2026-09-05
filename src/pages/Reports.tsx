import { FileText, TrendingUp, Target, PieChart, ShieldCheck, AlertTriangle, CheckCircle2, Globe, Wallet, Printer, FileDown } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculator } from '../context/CalculatorContext';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { DonutChart } from '../components/charts/DonutChart';
import { MonteCarloFanChart } from '../components/charts/MonteCarloFanChart';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const Reports = () => {
  const navigate = useNavigate();
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
      <style>{`
        @media print {
          aside, header, footer, nav, .print-hidden { display: none !important; }
          body { background: white !important; color: #09090b !important; }
          .page-break { break-after: page !important; page-break-after: always !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <SectionTitle
          title="Plan Reports"
          subtitle="A consolidated view of your financial plan: net worth, allocation, goals, Monte Carlo outcomes, tax, and currency exposure."
          badge="Comprehensive"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/dossier?autoPrint=true')} variant="primary" className="flex items-center gap-2 shadow-xs">
            <FileDown size={16} />
            Export Full Dossier (PDF)
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100">
            <Printer size={16} />
            Print Page
          </Button>
        </div>
      </div>

      {/* Executive Client Header Banner */}
      <Card className="bg-white border border-zinc-200/90 shadow-2xs print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Institutional Wealth Plan</div>
            <h2 className="text-xl sm:text-2xl font-sans text-zinc-950 font-bold mt-0.5">{inputs.client?.name || 'Private Client Plan'}</h2>
            <p className="text-xs text-zinc-600 mt-1">
              Advisor: <strong className="text-zinc-900 font-semibold">{inputs.client?.advisor || 'Sound Thesis Wealth Advisory'}</strong> · Review Date: <strong className="text-zinc-900 font-semibold">{inputs.client?.reviewDate || new Date().toISOString().split('T')[0]}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-zinc-300 text-slate-800">
              Risk: {riskProfile.label}
            </Badge>
            <Badge variant={wealthResult.sustainable ? 'success' : 'danger'} className="text-xs px-3 py-1">
              {wealthResult.sustainable ? 'Sustainable' : `Depletes Age ${wealthResult.depletionAge}`}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrencyCompact(wealthResult.netWorth)}
          subtext={formatCurrency(wealthResult.netWorth)}
          icon={<Wallet size={16} />}
          variant="navy"
        />
        <MetricCard
          label="Net Annual Savings"
          value={formatCurrencyCompact(wealthResult.annualSavings)}
          subtext={`${formatPercent(wealthResult.savingsRate)} of income`}
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Terminal Corpus"
          value={formatCurrencyCompact(wealthResult.terminalValue)}
          subtext={`At age ${inputs.lifeExpectancy}`}
          icon={<Target size={16} />}
        />
        <MetricCard
          label="Plan Success Rate"
          value={formatPercent(wealthResult.monteCarlo.successRate * 100)}
          subtext="All goals + SWP sustainable"
          icon={<CheckCircle2 size={16} />}
          variant={wealthResult.monteCarlo.successRate * 100 >= riskProfile.goalSuccessThreshold ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-zinc-600" /> Plan Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Client age</span><span className="font-semibold text-zinc-900">{inputs.currentAge}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Retirement age</span><span className="font-semibold text-zinc-900">{inputs.retirementAge}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Life expectancy</span><span className="font-semibold text-zinc-900">{inputs.lifeExpectancy}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Annual income</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Monthly expenditure</span><span className="font-semibold text-zinc-900">{formatCurrency(inputs.monthlyExpenditure)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Annual expenses (today)</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.annualExpenses)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Net annual savings</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.annualSavings)} ({formatPercent(wealthResult.savingsRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Invested / deployed</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.annualInvested)} ({formatPercent(wealthResult.investmentRate)})</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Monthly SIP</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.monthlySIP)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Total invested (projected)</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.totalInvested)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">CAGR nominal</span><span className="font-semibold text-zinc-900">{formatPercent(wealthResult.cagrNominal)}</span></div>
            <div className="flex justify-between py-2"><span className="text-zinc-600 font-medium">CAGR real</span><span className="font-semibold text-zinc-900">{formatPercent(wealthResult.cagrReal)}</span></div>
          </div>
        </Card>

        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-zinc-600" /> Risk Profile</h3>
          <div className="p-4 bg-zinc-950 text-white rounded-xl mb-4 shadow-xs">
            <div className="text-2xl font-sans font-bold">{riskProfile.label}</div>
            <p className="text-sm text-zinc-300 mt-1">{riskProfile.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl"><div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Max drawdown</div><div className="font-semibold text-zinc-900 mt-0.5">{formatPercent(riskProfile.maxDrawdown)}</div></div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl"><div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Volatility target</div><div className="font-semibold text-zinc-900 mt-0.5">{formatPercent(riskProfile.targetVolatility)}</div></div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl"><div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Goal threshold</div><div className="font-semibold text-zinc-900 mt-0.5">{formatPercent(riskProfile.goalSuccessThreshold)}</div></div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl"><div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Max drawdown prob</div><div className="font-semibold text-zinc-900 mt-0.5">{formatPercent(wealthResult.maxDrawdownProbability * 100)}</div></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><PieChart size={18} className="text-zinc-600" /> Current vs Target Allocation</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-zinc-600 mb-2 text-center">Current</div>
              <DonutChart data={currentAllocationData} innerRadius={40} outerRadius={70} />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-600 mb-2 text-center">Target</div>
              <DonutChart data={targetAllocationData} innerRadius={40} outerRadius={70} />
            </div>
          </div>
        </Card>

        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-zinc-600" /> Monte Carlo Fan Chart</h3>
          <MonteCarloFanChart data={wealthResult.monteCarlo.yearlyPercentiles} />
        </Card>
      </div>

      <Card className="border border-zinc-200/90 shadow-2xs">
        <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><Target size={18} className="text-zinc-600" /> Goal Probability Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Essential goals</div>
            <div className="text-xl font-sans font-bold text-zinc-900 mt-1">{formatPercent(wealthResult.essentialSuccessRate * 100)}</div>
            <div className="text-xs text-zinc-600 mt-1 font-medium">{essentialGoals.length} goals</div>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Important goals</div>
            <div className="text-xl font-sans font-bold text-zinc-900 mt-1">
              {importantGoals.length > 0 ? formatPercent((importantGoals.reduce((s, g) => s + g.successRate, 0) / importantGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-zinc-600 mt-1 font-medium">{importantGoals.length} goals</div>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Aspirational goals</div>
            <div className="text-xl font-sans font-bold text-zinc-900 mt-1">
              {aspirationalGoals.length > 0 ? formatPercent((aspirationalGoals.reduce((s, g) => s + g.successRate, 0) / aspirationalGoals.length) * 100) : '—'}
            </div>
            <div className="text-xs text-zinc-600 mt-1 font-medium">{aspirationalGoals.length} goals</div>
          </div>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left text-[11px] uppercase tracking-wider text-zinc-900 font-bold">
                <th className="py-2.5 pr-4">Goal</th>
                <th className="py-2.5 pr-4">Priority</th>
                <th className="py-2.5 pr-4 text-right">Target</th>
                <th className="py-2.5 pr-4 text-right">Future Value</th>
                <th className="py-2.5 pr-4 text-right">Success</th>
                <th className="py-2.5 pr-4 text-right">Required SIP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wealthResult.goalResults.map((g) => (
                <tr key={g.goal.id} className="hover:bg-zinc-50/50">
                  <td className="py-2.5 pr-4 font-semibold text-zinc-900">{g.goal.name}</td>
                  <td className="py-2.5 pr-4"><Badge variant={g.goal.priority === 'essential' ? 'danger' : g.goal.priority === 'important' ? 'default' : 'outline'}>{g.goal.priority}</Badge></td>
                  <td className="py-2.5 pr-4 text-right font-mono text-zinc-700">{formatCurrency(g.goal.targetAmount)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-zinc-700">{formatCurrency(g.futureValue)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-bold">
                    <span className={g.successRate >= riskProfile.goalSuccessThreshold / 100 ? 'text-emerald-700' : g.successRate >= (riskProfile.goalSuccessThreshold / 100) * 0.6 ? 'text-amber-700' : 'text-rose-700'}>
                      {formatPercent(g.successRate * 100)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono font-semibold text-zinc-900">{formatCurrency(g.requiredSIP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><Wallet size={18} className="text-zinc-600" /> Tax Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Annual income</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.annualIncome)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Estimated tax</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.taxSummary.annualTax)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Effective tax rate</span><span className="font-semibold text-zinc-900">{formatPercent(wealthResult.taxSummary.effectiveRate * 100)}</span></div>
            <div className="flex justify-between py-2 border-b border-zinc-200/70"><span className="text-zinc-600 font-medium">Post-tax income</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.taxSummary.postTaxIncome)}</span></div>
            <div className="flex justify-between py-2"><span className="text-zinc-600 font-medium">Recommended tax saving</span><span className="font-semibold text-zinc-900">{formatCurrency(wealthResult.taxSummary.recommendedTaxSaving)}</span></div>
          </div>
        </Card>

        <Card className="border border-zinc-200/90 shadow-2xs">
          <h3 className="text-lg font-sans text-zinc-950 font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-zinc-600" /> Currency Exposure</h3>
          <div className="space-y-3">
            {wealthResult.currencyExposure.map((c) => (
              <div key={c.currency} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">{c.currency}</span>
                  <Badge variant={c.currency === 'INR' ? 'outline' : 'gold'}>{formatPercent(c.percentage)}</Badge>
                </div>
                <div className="text-xs text-zinc-600 font-mono mt-1">{formatCurrency(c.amount)}</div>
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
          prev={{ path: '/advanced-portfolio', label: 'Portfolio Lab' }}
          next={{ path: '/ips', label: 'IPS' }}
          flowHint="Executive plan summaries, tax analyses, and Monte Carlo curves feed into your institutional Investment Policy Statement."
        />
      </div>
    </div>
  );
};
