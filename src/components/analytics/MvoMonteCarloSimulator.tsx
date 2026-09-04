import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Dna, TrendingUp, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { Slider } from '../ui/Slider';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import type { Portfolio } from '../../lib/mvo';
import { createBoxMuller, createSeededRandom } from '../../lib/random';

interface MvoMonteCarloSimulatorProps {
  portfolio: Portfolio | null;
  portfolioName: string;
  symbols: string[];
  initialWealth?: number;
  initialSip?: number;
  onApplyToPlan?: () => void;
  applied?: boolean;
}

export const MvoMonteCarloSimulator = ({
  portfolio,
  portfolioName,
  initialWealth = 2500000,
  initialSip = 50000,
  onApplyToPlan,
  applied = false,
}: MvoMonteCarloSimulatorProps) => {
  const [horizonYears, setHorizonYears] = useState<number>(15);
  const [startingWealth, setStartingWealth] = useState<number>(initialWealth);
  const [monthlySip, setMonthlySip] = useState<number>(initialSip);
  const [simCount] = useState<number>(500);

  // Run Monte Carlo simulation based on portfolio expected return and volatility derived from extracted CSVs
  const simResults = useMemo(() => {
    if (!portfolio || portfolio.volatility <= 0) return null;

    const mu = portfolio.expectedReturn;
    const sigma = portfolio.volatility;
    const years = horizonYears;
    const dt = 1; // annual steps
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const volStep = sigma * Math.sqrt(dt);

    const rng = createSeededRandom(42);
    const randNorm = createBoxMuller(rng ? rng.random : Math.random);

    // Store yearly paths: [simIndex][yearIndex]
    const paths: number[][] = [];
    const maxDrawdowns: number[] = [];
    let beatHurdleCount = 0;
    const hurdleRate = 0.06; // 6% risk-free rate hurdle

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

      // Total invested
      const totalInvested = startingWealth + monthlySip * 12 * years;
      const hurdleTerminal = totalInvested * Math.pow(1 + hurdleRate, years * 0.6);
      if (path[years] >= hurdleTerminal) beatHurdleCount++;
    }

    // Calculate percentiles for each year
    const yearlyPercentiles = [];
    for (let y = 0; y <= years; y++) {
      const vals = paths.map((p) => p[y]).sort((a, b) => a - b);
      const p10 = vals[Math.floor(vals.length * 0.1)];
      const p50 = vals[Math.floor(vals.length * 0.5)];
      const p90 = vals[Math.floor(vals.length * 0.9)];
      yearlyPercentiles.push({
        year: `Yr ${y}`,
        p10,
        p50,
        p90,
      });
    }

    const terminalValues = paths.map((p) => p[years]).sort((a, b) => a - b);
    const medianTerminal = terminalValues[Math.floor(terminalValues.length * 0.5)];
    const p10Terminal = terminalValues[Math.floor(terminalValues.length * 0.1)];
    const p90Terminal = terminalValues[Math.floor(terminalValues.length * 0.9)];
    const avgMaxDd = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;
    const hurdleProb = beatHurdleCount / simCount;

    return {
      chartData: yearlyPercentiles,
      medianTerminal,
      p10Terminal,
      p90Terminal,
      avgMaxDd,
      hurdleProb,
      totalInvested: startingWealth + monthlySip * 12 * years,
    };
  }, [portfolio, horizonYears, startingWealth, monthlySip, simCount]);

  if (!portfolio || !simResults) {
    return (
      <Card className="p-6 text-center text-slate-500">
        Select a portfolio on the efficient frontier to run asset allocation Monte Carlo simulations.
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/90 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-navy/5 text-navy rounded-lg">
              <Dna size={18} />
            </span>
            <h3 className="text-lg font-serif text-navy">
              Monte Carlo Asset Allocation Simulator: {portfolioName}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulated over {simCount} paths using empirical expected return ({formatPercent(portfolio.expectedReturn * 100)}) and volatility ({formatPercent(portfolio.volatility * 100)}) calibrated from extracted historical CSVs.
          </p>
        </div>

        {onApplyToPlan && (
          <button
            onClick={onApplyToPlan}
            className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {applied ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                Applied to Master Plan
              </>
            ) : (
              <>
                Apply Allocation to Master Plan <ArrowRight size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Simulator Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50/70 rounded-xl border border-slate-100">
        <Slider
          label="Horizon (Years)"
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
          max={20000000}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Median Terminal Corpus"
          value={formatCurrencyCompact(simResults.medianTerminal)}
          subtext={`From ${formatCurrencyCompact(simResults.totalInvested)} invested`}
          icon={<TrendingUp size={16} />}
          variant="gold"
        />
        <MetricCard
          label="Conservative (P10 Bear Case)"
          value={formatCurrencyCompact(simResults.p10Terminal)}
          subtext="90% probability above this"
          icon={<ShieldAlert size={16} />}
        />
        <MetricCard
          label="Optimistic (P90 Bull Case)"
          value={formatCurrencyCompact(simResults.p90Terminal)}
          subtext="Top decile trajectory"
          icon={<TrendingUp size={16} />}
          variant="success"
        />
        <MetricCard
          label="Hurdle Beat Probability"
          value={formatPercent(simResults.hurdleProb * 100)}
          subtext="Beats 6% risk-free rate"
          icon={<CheckCircle2 size={16} />}
          variant={simResults.hurdleProb >= 0.8 ? 'success' : 'default'}
        />
      </div>

      {/* Fan Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={simResults.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mvoBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B68B40" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#B68B40" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => formatCurrencyCompact(v)} />
            <Tooltip
              formatter={(val: any) => [formatCurrencyCompact(Number(val)), '']}
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="p90"
              stroke="#B68B40"
              strokeDasharray="4 4"
              fill="url(#mvoBand)"
              name="90th Percentile (Bull)"
            />
            <Area
              type="monotone"
              dataKey="p50"
              stroke="#1A233A"
              strokeWidth={2.5}
              fill="none"
              name="Median Path"
            />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              fill="none"
              name="10th Percentile (Bear)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-navy inline-block" /> Median Path
          <span className="w-2.5 h-0.5 bg-[#B68B40] border-t border-dashed inline-block ml-3" /> P10–P90 Confidence Band
        </span>
        <span>Average simulated max drawdown: <strong className="text-slate-700">{formatPercent(simResults.avgMaxDd * 100)}</strong></span>
      </div>
    </Card>
  );
};
