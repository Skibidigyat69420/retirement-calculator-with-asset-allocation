import { useState, useMemo } from 'react';
import { PieChart, Activity, ShieldAlert } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { DataTable } from '../components/ui/DataTable';
import { useCalculator } from '../context/CalculatorContext';
import {
  computePortfolioHoldings,
  computePortfolioMetrics,
  computeAttribution,
} from '../lib/portfolioAnalytics';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import type { PortfolioHoldingAnalytics } from '../types';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

export const PortfolioAnalytics = () => {
  const { inputs } = useCalculator();
  const [showStress, setShowStress] = useState(false);

  const syntheticHoldings: PortfolioHoldingAnalytics[] = useMemo(() => {
    const holdings = inputs.assets.map((a) => ({
      symbol: a.name,
      token: a.id,
      exchange: 'NSE',
      quantity: 1,
      averageprice: a.value,
      ltp: a.value * (showStress ? 0.85 : 1),
    }));
    return computePortfolioHoldings(holdings);
  }, [inputs.assets, showStress]);

  const metrics = useMemo(() => computePortfolioMetrics(syntheticHoldings), [syntheticHoldings]);
  const attribution = useMemo(() => computeAttribution(syntheticHoldings), [syntheticHoldings]);

  const allocationData = attribution.map((d) => ({
    name: ASSET_LABELS[d.category],
    value: d.value,
    color: ASSET_COLORS[d.category],
  }));

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Portfolio Analytics"
        subtitle="Risk metrics, attribution, and stress-test analytics for your current asset allocation."
        badge="Risk & Performance"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Value" value={formatCurrency(metrics.totalValue)} subtext={`Invested ${formatCurrency(metrics.totalInvested)}`} variant="navy" />
        <MetricCard label="Unrealized P&L" value={formatCurrency(metrics.totalPnl)} subtext={formatPercent(metrics.totalPnlPercent)} variant={metrics.totalPnl >= 0 ? 'success' : 'danger'} />
        <MetricCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} subtext={`Sortino ${metrics.sortinoRatio.toFixed(2)}`} />
        <MetricCard label="Max Drawdown" value={formatPercent(metrics.maxDrawdown * 100)} subtext="Historical proxy" variant="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Annualized Return" value={formatPercent(metrics.annualizedReturn * 100)} subtext="Expected" />
        <MetricCard label="Volatility" value={formatPercent(metrics.annualizedVolatility * 100)} subtext="Annualized" />
        <MetricCard label="Beta" value={metrics.beta.toFixed(2)} subtext={`Alpha ${formatPercent(metrics.alpha * 100)}`} />
        <MetricCard label="95% CVaR" value={formatCurrency(metrics.cvar95)} subtext="Expected tail loss" variant="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-gold" /> Asset Allocation
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {allocationData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={((value: number) => formatCurrency(value)) as any} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
            <Activity size={18} className="text-gold" /> Holdings
          </h3>
          <DataTable
            data={syntheticHoldings}
            columns={[
              { key: 'symbol', header: 'Asset' },
              { key: 'category', header: 'Category', render: (r) => ASSET_LABELS[r.category] },
              { key: 'value', header: 'Value', align: 'right', render: (r) => formatCurrency(r.value) },
              { key: 'weight', header: 'Weight', align: 'right', render: (r) => `${r.weight.toFixed(1)}%` },
              { key: 'pnlPercent', header: 'Return', align: 'right', render: (r) => formatPercent(r.pnlPercent) },
            ]}
          />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <ShieldAlert size={18} className="text-gold" /> Stress Test
          </h3>
          <label className="flex items-center gap-2 text-sm text-navy">
            <input
              type="checkbox"
              checked={showStress}
              onChange={(e) => setShowStress(e.target.checked)}
              className="accent-navy w-4 h-4"
            />
            Simulate -15% market shock
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Stressed Value"
            value={formatCurrency(metrics.totalValue)}
            subtext={formatCurrency(metrics.totalValue - metrics.totalInvested)}
          />
          <MetricCard label="Stressed VaR" value={formatCurrency(metrics.var95)} subtext="1-day 95%" variant="danger" />
          <MetricCard label="Stressed CVaR" value={formatCurrency(metrics.cvar95)} subtext="Expected shortfall" variant="danger" />
        </div>
      </Card>
    </div>
  );
};
