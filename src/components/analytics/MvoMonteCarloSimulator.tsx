import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Line } from 'recharts';
import { Dna, TrendingUp, ShieldAlert, CheckCircle2, ArrowRight, Layers, BarChart2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { Slider } from '../ui/Slider';
import { Badge } from '../ui/Badge';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import type { Portfolio } from '../../lib/mvo';
import { createBoxMuller, createSeededRandom } from '../../lib/random';

interface MvoMonteCarloSimulatorProps {
  portfolio: Portfolio | null;
  portfolioName: string;
  symbols: string[];
  initialWealth?: number;
  initialSip?: number;
  currentPortfolio?: Portfolio | null;
  onApplyToPlan?: () => void;
  applied?: boolean;
}

export const MvoMonteCarloSimulator = ({
  portfolio,
  portfolioName,
  initialWealth = 2500000,
  initialSip = 50000,
  currentPortfolio,
  onApplyToPlan,
  applied = false,
}: MvoMonteCarloSimulatorProps) => {
  const [horizonYears, setHorizonYears] = useState<number>(15);
  const [startingWealth, setStartingWealth] = useState<number>(initialWealth);
  const [monthlySip, setMonthlySip] = useState<number>(initialSip);
  const [showComparison, setShowComparison] = useState<boolean>(true);
  const simCount = 1000;

  // Run 1,000 path Monte Carlo simulation for MVO portfolio and current portfolio
  const simResults = useMemo(() => {
    if (!portfolio || portfolio.volatility <= 0) return null;

    const runSimulation = (mu: number, sigma: number, seedOffset: number) => {
      const years = horizonYears;
      const dt = 1;
      const drift = (mu - 0.5 * sigma * sigma) * dt;
      const volStep = sigma * Math.sqrt(dt);

      const rng = createSeededRandom(42 + seedOffset);
      const randNorm = createBoxMuller(rng ? rng.random : Math.random);

      const paths: number[][] = [];
      const maxDrawdowns: number[] = [];
      let beatHurdleCount = 0;
      let beatBenchmarkCount = 0;
      const hurdleRate = 0.06;
      const benchmarkRate = 0.08;

      for (let s = 0; s < simCount; s++) {
        const path: number[] = [startingWealth];
        let peak = startingWealth;
        let maxDd = 0;

        for (let y = 1; y <= years; y++) {
          const prev = path[y - 1];
          const annualAddition = monthlySip * 12;
          const growthFactor = Math.exp(drift + volStep * randNorm());
          const nextVal = Math.max(0, (prev + annualAddition) * growthFactor);
          path.push(nextVal);

          if (nextVal > peak) peak = nextVal;
          const dd = peak > 0 ? (peak - nextVal) / peak : 0;
          if (dd > maxDd) maxDd = dd;
        }

        paths.push(path);
        maxDrawdowns.push(maxDd);

        const totalInvested = startingWealth + monthlySip * 12 * years;
        if (path[years] >= totalInvested * Math.pow(1 + hurdleRate, years * 0.7)) beatHurdleCount++;
        if (path[years] >= totalInvested * Math.pow(1 + benchmarkRate, years * 0.7)) beatBenchmarkCount++;
      }

      // Percentiles
      const yearlyPercentiles = [];
      for (let y = 0; y <= years; y++) {
        const vals = paths.map((p) => p[y]).sort((a, b) => a - b);
        const p10 = vals[Math.floor(vals.length * 0.1)];
        const p25 = vals[Math.floor(vals.length * 0.25)];
        const p50 = vals[Math.floor(vals.length * 0.5)];
        const p75 = vals[Math.floor(vals.length * 0.75)];
        const p90 = vals[Math.floor(vals.length * 0.9)];
        yearlyPercentiles.push({ p10, p25, p50, p75, p90 });
      }

      const terminalValues = paths.map((p) => p[years]).sort((a, b) => a - b);
      const medianTerminal = terminalValues[Math.floor(terminalValues.length * 0.5)];
      const p10Terminal = terminalValues[Math.floor(terminalValues.length * 0.1)];
      const p90Terminal = terminalValues[Math.floor(terminalValues.length * 0.9)];
      const p05Terminal = terminalValues[Math.floor(terminalValues.length * 0.05)];

      // 95% CVaR (Expected Shortfall) = mean of worst 5%
      const worst5Pct = terminalValues.slice(0, Math.floor(terminalValues.length * 0.05));
      const cvar95 = worst5Pct.reduce((a, b) => a + b, 0) / Math.max(1, worst5Pct.length);

      const avgMaxDd = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;
      const hurdleProb = beatHurdleCount / simCount;
      const benchmarkProb = beatBenchmarkCount / simCount;

      return {
        yearlyPercentiles,
        medianTerminal,
        p10Terminal,
        p90Terminal,
        p05Terminal,
        cvar95,
        avgMaxDd,
        hurdleProb,
        benchmarkProb,
      };
    };

    const mvoSim = runSimulation(portfolio.expectedReturn, portfolio.volatility, 0);

    // Current portfolio simulation (if provided and valid)
    const currentSim = currentPortfolio && currentPortfolio.volatility > 0
      ? runSimulation(currentPortfolio.expectedReturn, currentPortfolio.volatility, 100)
      : null;

    // Combined chart data
    const chartData = [];
    for (let y = 0; y <= horizonYears; y++) {
      chartData.push({
        year: `Yr ${y}`,
        p10: mvoSim.yearlyPercentiles[y].p10,
        p50: mvoSim.yearlyPercentiles[y].p50,
        p90: mvoSim.yearlyPercentiles[y].p90,
        currentP50: currentSim?.yearlyPercentiles[y].p50,
      });
    }

    const totalInvested = startingWealth + monthlySip * 12 * horizonYears;

    return {
      mvoSim,
      currentSim,
      chartData,
      totalInvested,
    };
  }, [portfolio, currentPortfolio, horizonYears, startingWealth, monthlySip]);

  if (!portfolio || !simResults) {
    return (
      <Card className="p-8 text-center text-slate-500 border border-dashed border-slate-200">
        Select a portfolio on the efficient frontier to launch multi-path Monte Carlo risk simulation.
      </Card>
    );
  }

  const { mvoSim, currentSim, chartData, totalInvested } = simResults;

  return (
    <Card className="border border-slate-200/90 shadow-sm bg-white overflow-hidden space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Dna size={18} />
            </span>
            <h3 className="text-lg font-serif font-bold text-slate-900">
              Monte Carlo Asset Allocation Simulator
            </h3>
            <Badge variant="navy" className="text-[10px] font-mono uppercase">
              1,000 Iterations
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Empirical stochastic projection for <strong className="text-slate-800">{portfolioName}</strong>: return{' '}
            <strong className="text-slate-800">{formatPercent(portfolio.expectedReturn * 100)}</strong>, volatility{' '}
            <strong className="text-slate-800">{formatPercent(portfolio.volatility * 100)}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          {currentSim && (
            <button
              type="button"
              onClick={() => setShowComparison((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                showComparison
                  ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers size={13} />
              {showComparison ? 'Comparison Active' : 'Overlay Baseline'}
            </button>
          )}

          {onApplyToPlan && (
            <button
              onClick={onApplyToPlan}
              className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              {applied ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Applied to Plan
                </>
              ) : (
                <>
                  Apply Strategy <ArrowRight size={13} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Simulator Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200/80">
        <Slider
          label="Investment Horizon"
          value={horizonYears}
          onChange={setHorizonYears}
          min={5}
          max={35}
          step={1}
          suffix=" yrs"
        />
        <Slider
          label="Starting Capital"
          value={startingWealth}
          onChange={setStartingWealth}
          min={100000}
          max={25000000}
          step={100000}
          formatValue={(v) => formatCurrencyCompact(v)}
        />
        <Slider
          label="Monthly SIP"
          value={monthlySip}
          onChange={setMonthlySip}
          min={0}
          max={500000}
          step={5000}
          formatValue={(v) => formatCurrencyCompact(v)}
        />
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Median Terminal Wealth"
          value={formatCurrencyCompact(mvoSim.medianTerminal)}
          subtext={`Total Invested: ${formatCurrencyCompact(totalInvested)}`}
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Bear Decile (P10 Outcome)"
          value={formatCurrencyCompact(mvoSim.p10Terminal)}
          subtext="90% probability above this"
          icon={<ShieldAlert size={16} />}
        />
        <MetricCard
          label="Expected Shortfall (95% CVaR)"
          value={formatCurrencyCompact(mvoSim.cvar95)}
          subtext="Avg of worst 5% tails"
          icon={<BarChart2 size={16} />}
          variant="danger"
        />
        <MetricCard
          label="Hurdle Beat Probability"
          value={formatPercent(mvoSim.hurdleProb * 100)}
          subtext="Outperforms 6% Rf rate"
          icon={<CheckCircle2 size={16} />}
          variant={mvoSim.hurdleProb >= 0.8 ? 'success' : 'default'}
        />
      </div>

      {/* Chart Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Projected Wealth Cone (1,000 Paths)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-slate-900 inline-block" />
              MVO Median
            </span>
            {showComparison && currentSim && (
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
                Current Portfolio
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
              P10–P90 Band
            </span>
          </div>
        </div>

        <div className="h-72 w-full bg-slate-50/40 rounded-xl p-2 border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mvoSimBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatCurrencyCompact(v)} />
              <Tooltip
                formatter={(val: any) => [formatCurrencyCompact(Number(val)), '']}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="p90"
                stroke="#64748b"
                strokeDasharray="4 4"
                fill="url(#mvoSimBand)"
                name="90th Percentile (Bull)"
              />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="#0f172a"
                strokeWidth={2.5}
                fill="none"
                name="MVO Median Path"
              />
              <Area
                type="monotone"
                dataKey="p10"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                fill="none"
                name="10th Percentile (Bear)"
              />
              {showComparison && currentSim && (
                <Line
                  type="monotone"
                  dataKey="currentP50"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Current Portfolio Median"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparative Diagnostic Footnote */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-800">Monte Carlo Stress Diagnostic:</span>
          <p className="text-slate-600">
            Average peak-to-trough simulated drawdown is <strong className="text-slate-900">{formatPercent(mvoSim.avgMaxDd * 100)}</strong>.
            {currentSim && (
              <>
                {' '}Current portfolio has an estimated median terminal wealth of{' '}
                <strong className="text-amber-800">{formatCurrencyCompact(currentSim.medianTerminal)}</strong> vs{' '}
                <strong className="text-slate-900">{formatCurrencyCompact(mvoSim.medianTerminal)}</strong> with MVO optimization ({mvoSim.medianTerminal >= currentSim.medianTerminal ? `+${formatCurrencyCompact(mvoSim.medianTerminal - currentSim.medianTerminal)} alpha` : ''}).
              </>
            )}
          </p>
        </div>
        <Badge variant={mvoSim.hurdleProb >= 0.85 ? 'success' : 'warning'} className="self-start sm:self-center shrink-0">
          {formatPercent(mvoSim.benchmarkProb * 100)} Beats 8% Hurdle
        </Badge>
      </div>
    </Card>
  );
};
