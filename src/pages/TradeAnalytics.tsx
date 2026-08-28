import { useState, useMemo } from 'react';
import { Activity, TrendingDown, BarChart2 } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable } from '../components/ui/DataTable';
import { analyzeImplementationShortfall, estimatePreTradeCost, simulateRebalancing } from '../lib/implementationShortfall';
import { formatCurrency } from '../lib/formatters';
import type { TradeExecution } from '../types';

export const TradeAnalytics = () => {
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

  const rebalance = useMemo(
    () =>
      simulateRebalancing(
        { equity: 0.7, debt: 0.2, gold: 0.1 },
        { equity: 0.55, debt: 0.35, gold: 0.1 },
        10000000,
        { equity: adv, debt: adv * 0.6, gold: adv * 0.3 },
        { equity: volatility, debt: 0.05, gold: 0.18 },
      ),
    [adv, volatility],
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Trade Analytics & Implementation Shortfall"
        subtitle="Pre-trade cost estimates, post-trade slippage analysis, and rebalancing impact simulation."
        badge="Execution Quality"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <Activity size={18} className="text-gold" /> Order Parameters
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Side</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm"
              >
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

        <Card className="space-y-4">
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

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
          <TrendingDown size={18} className="text-gold" /> Rebalancing Impact Simulator
        </h3>
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
          <div>
            <span className="text-stone-500">Total Turnover</span>
            <span className="ml-2 font-semibold text-navy">{(rebalance.totalTurnover * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-stone-500">Weighted Impact</span>
            <span className="ml-2 font-semibold text-navy">{rebalance.totalImpactBps.toFixed(1)} bps</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
