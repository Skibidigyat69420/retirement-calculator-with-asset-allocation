import { useState, useMemo } from 'react';
import { Activity, TrendingDown, BarChart2, Globe, RefreshCcw, AlertTriangle } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { analyzeImplementationShortfall, estimatePreTradeCost, simulateRebalancing } from '../lib/implementationShortfall';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { useCalculator } from '../context/CalculatorContext';
import type { TradeExecution } from '../types';

export const TradeAnalytics = () => {
  const { inputs, assumptions } = useCalculator();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState(2500);
  const [arrivalPrice, setArrivalPrice] = useState(2495);
  const [vwap, setVwap] = useState(2502);
  const [twap, setTwap] = useState(2501);
  const [explicitCost, setExplicitCost] = useState(150);
  const [adv, setAdv] = useState(5000000);
  const [volatility, setVolatility] = useState(0.25);
  const [spreadBps, setSpreadBps] = useState(5);
  const [durationHours, setDurationHours] = useState(2);

  // Currency impact inputs
  const [foreignExposure, setForeignExposure] = useState(0);
  const [fxVolatility, setFxVolatility] = useState(5);
  const [baseCurrencyReturn, setBaseCurrencyReturn] = useState(12);

  const trade: TradeExecution = useMemo(
    () => ({
      symbol: 'RELIANCE',
      side,
      quantity,
      benchmarkPrice: arrivalPrice,
      avgExecutionPrice: price,
      arrivalPrice,
      vwap,
      twap,
      explicitCost,
      startTime: '',
      endTime: '',
      marketValue: quantity * price,
    }),
    [side, quantity, price, arrivalPrice, vwap, twap, explicitCost],
  );

  const postTrade = useMemo(() => analyzeImplementationShortfall(trade), [trade]);
  const preTrade = useMemo(
    () => estimatePreTradeCost(side, quantity, adv, volatility, price, spreadBps, durationHours),
    [side, quantity, adv, volatility, price, spreadBps, durationHours],
  );

  const currentWeights = useMemo(() => {
    const total = inputs.assets.reduce((sum, a) => sum + a.value, 0);
    if (total <= 0) return { equity: 0.55, debt: 0.25, gold: 0.1, liquid: 0.05, other: 0.05 };
    const weights: Record<string, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    inputs.assets.forEach((a) => {
      weights[a.category] = (weights[a.category] || 0) + a.value / total;
    });
    return weights;
  }, [inputs.assets]);

  const targetWeights = useMemo(
    () => ({
      equity: inputs.sip.equitySplit / 100,
      debt: inputs.sip.debtSplit / 100,
      gold: 0.05,
      realestate: 0.05,
      liquid: 0.05,
      other: 0,
    }),
    [inputs.sip.equitySplit, inputs.sip.debtSplit],
  );

  const portfolioValue = useMemo(() => inputs.assets.reduce((sum, a) => sum + a.value, 0), [inputs.assets]);

  const rebalance = useMemo(
    () =>
      simulateRebalancing(
        currentWeights,
        targetWeights,
        Math.max(portfolioValue, 10000000),
        { equity: adv, debt: adv * 0.6, gold: adv * 0.3, realestate: adv * 0.2, liquid: adv * 1.2, other: adv * 0.1 },
        {
          equity: assumptions.categories.equity.std,
          debt: assumptions.categories.debt.std,
          gold: assumptions.categories.gold.std,
          realestate: assumptions.categories.realestate.std,
          liquid: assumptions.categories.liquid.std,
          other: assumptions.categories.other.std,
        },
      ),
    [currentWeights, targetWeights, portfolioValue, adv, assumptions],
  );

  // Currency impact: approximate variance contribution from FX
  const fxImpact = useMemo(() => {
    const exposure = foreignExposure / 100;
    const fxStd = fxVolatility / 100;
    const localReturn = baseCurrencyReturn / 100;
    // FX contribution to portfolio volatility scales with foreign exposure
    const contribution = exposure * fxStd;
    return {
      contribution,
      contributionBps: contribution * 10000,
      totalReturn: (localReturn + contribution) * 100,
    };
  }, [foreignExposure, fxVolatility, baseCurrencyReturn]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Trade Analytics & Implementation Shortfall"
        subtitle="Pre-trade cost estimates, post-trade slippage analysis, rebalancing impact simulation, and FX/currency contribution."
        badge="Execution Quality"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="space-y-4 lg:col-span-1">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <Activity size={18} className="text-gold" /> Order Parameters
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Side</label>
              <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <NumberInput label="Quantity" value={quantity} onChange={setQuantity} />
            <NumberInput label="Avg Exec Price" value={price} onChange={setPrice} />
            <NumberInput label="Arrival Price" value={arrivalPrice} onChange={setArrivalPrice} />
            <NumberInput label="VWAP" value={vwap} onChange={setVwap} />
            <NumberInput label="TWAP" value={twap} onChange={setTwap} />
            <NumberInput label="Explicit Cost (₹)" value={explicitCost} onChange={setExplicitCost} />
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-1">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <BarChart2 size={18} className="text-gold" /> Pre-Trade Estimate
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Avg Daily Volume (₹)" value={adv} onChange={setAdv} />
            <NumberInput label="Volatility" value={volatility * 100} onChange={(v) => setVolatility(v / 100)} suffix="%" />
            <NumberInput label="Spread (bps)" value={spreadBps} onChange={setSpreadBps} />
            <NumberInput label="Duration (hrs)" value={durationHours} onChange={setDurationHours} />
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-1">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <Globe size={18} className="text-gold" /> Currency Impact
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <NumberInput label="Foreign Exposure" value={foreignExposure} onChange={setForeignExposure} suffix="%" helper="% of portfolio" />
            <NumberInput label="FX Volatility" value={fxVolatility} onChange={setFxVolatility} suffix="%" helper="Annualized" />
            <NumberInput label="Base-Currency Return" value={baseCurrencyReturn} onChange={setBaseCurrencyReturn} suffix="%" helper="Local asset return" />
          </div>
          {foreignExposure > 0 && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
              <div className="flex justify-between"><span>FX contribution</span><span className="font-medium">{formatPercent(fxImpact.contributionBps)} bps</span></div>
              <div className="flex justify-between"><span>Total return (base ccy)</span><span className="font-medium">{formatPercent(fxImpact.totalReturn)}</span></div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Arrival Shortfall" value={`${postTrade.arrivalShortfallBps.toFixed(1)} bps`} subtext={formatCurrency(postTrade.arrivalShortfall * quantity)} variant={postTrade.arrivalShortfallBps > 5 ? 'danger' : 'success'} />
        <MetricCard label="VWAP Slippage" value={`${postTrade.vwapSlippageBps.toFixed(1)} bps`} subtext={formatCurrency(postTrade.vwapSlippage * quantity)} />
        <MetricCard label="Total Cost" value={`${postTrade.totalCostBps.toFixed(1)} bps`} subtext={formatCurrency(postTrade.totalCost)} variant={postTrade.totalCostBps > 20 ? 'danger' : 'default'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Expected Shortfall" value={`${preTrade.expectedShortfallBps.toFixed(1)} bps`} subtext="Pre-trade estimate" />
        <MetricCard label="Market Impact" value={`${preTrade.marketImpactBps.toFixed(1)} bps`} subtext="Square-root model" />
        <MetricCard label="Recommended Duration" value={`${preTrade.recommendedDurationHours.toFixed(1)} hrs`} subtext={`Participation ${(preTrade.participationRate * 100).toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-gold" /> Rebalancing Impact Simulator
          </h3>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Badge variant="outline">Current portfolio weights</Badge>
            <span className="text-stone-400">→</span>
            <Badge variant="outline">Target allocation</Badge>
          </div>
          <DataTable
            data={rebalance.trades}
            columns={[
              { key: 'symbol', header: 'Asset' },
              { key: 'current', header: 'Current %', align: 'right', render: (r) => `${(r.current * 100).toFixed(1)}%` },
              { key: 'target', header: 'Target %', align: 'right', render: (r) => `${(r.target * 100).toFixed(1)}%` },
              { key: 'value', header: 'Trade Value', align: 'right', render: (r) => formatCurrency(r.value) },
              { key: 'impactBps', header: 'Est. Impact', align: 'right', render: (r) => `${r.impactBps.toFixed(1)} bps` },
            ]}
          />
          <div className="flex gap-6 mt-4 text-sm">
            <div><span className="text-stone-500">Total Turnover</span><span className="ml-2 font-semibold text-navy">{(rebalance.totalTurnover * 100).toFixed(1)}%</span></div>
            <div><span className="text-stone-500">Weighted Impact</span><span className="ml-2 font-semibold text-navy">{rebalance.totalImpactBps.toFixed(1)} bps</span></div>
          </div>
          {rebalance.totalImpactBps > 50 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              High estimated rebalancing impact. Consider stretching trades over multiple days or using ETFs with tighter spreads.
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
            <RefreshCcw size={18} className="text-gold" /> Cost Attribution
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Post-Trade</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-stone-600">Arrival shortfall</span><span className="font-medium">{postTrade.arrivalShortfallBps.toFixed(1)} bps</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Market impact</span><span className="font-medium">{toBps(postTrade.marketImpact, price).toFixed(1)} bps</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Timing cost</span><span className="font-medium">{toBps(postTrade.timingCost, price).toFixed(1)} bps</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Explicit cost</span><span className="font-medium">{toBps(postTrade.explicitCost / quantity, price).toFixed(1)} bps</span></div>
              </div>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Pre-Trade Estimate</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-stone-600">Market impact</span><span className="font-medium">{preTrade.marketImpactBps.toFixed(1)} bps</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Timing risk</span><span className="font-medium">{preTrade.timingRiskBps.toFixed(1)} bps</span></div>
                <div className="flex justify-between"><span className="text-stone-600">Spread cost</span><span className="font-medium">{spreadBps.toFixed(1)} bps</span></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

function toBps(value: number, benchmarkPrice: number): number {
  return benchmarkPrice > 0 ? (value / benchmarkPrice) * 10000 : 0;
}
