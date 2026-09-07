import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceDot,
} from 'recharts';
import type { Portfolio } from '../../lib/mvo';

interface FrontierPoint {
  volatility: number;
  expectedReturn: number;
}

export interface FrontierKeyPortfolio {
  label: string;
  portfolio: Portfolio;
  color: string;
}

interface EfficientFrontierChartProps {
  frontier: FrontierPoint[];
  keyPortfolios: FrontierKeyPortfolio[];
  /** Accessible name for the chart (announced by screen readers). */
  ariaLabel: string;
  /** Visually-hidden textual summary of the same data. */
  summary: string;
}

const CHART_MARGIN = { top: 12, right: 16, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--color-border)',
  backgroundColor: '#ffffff',
  fontSize: '12px',
  padding: '8px 12px',
};

const pct = (v: number) => Number((v * 100).toFixed(2));

/**
 * Markowitz efficient frontier scatter: sampled long-only portfolios form
 * the frontier cloud; the maximum-Sharpe, minimum-variance and current
 * target portfolios are annotated with labeled dots plus a text legend so
 * colour is never the only encoder. Fixed-height SVG — print-safe on A4.
 */
export const EfficientFrontierChart = ({ frontier, keyPortfolios, ariaLabel, summary }: EfficientFrontierChartProps) => {
  if (!frontier.length) return null;

  const frontierData = frontier.map((p) => ({ x: pct(p.volatility), y: pct(p.expectedReturn) }));
  const keyData = keyPortfolios.map((k) => ({ x: pct(k.portfolio.volatility), y: pct(k.portfolio.expectedReturn), label: k.label, color: k.color }));

  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      <div className="h-64 print:h-60 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Volatility (p.a.)', position: 'insideBottom' as const, offset: -4, fill: 'var(--color-muted)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}%`, name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Scatter name="Sampled Portfolios" data={frontierData} fill="var(--color-faint)" fillOpacity={0.45} isAnimationActive={false} />
            <Scatter name="Key Portfolios" data={keyData} isAnimationActive={false}>
              {keyData.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Scatter>
            {keyData.map((d) => (
              <ReferenceDot
                key={d.label}
                x={d.x}
                y={d.y}
                r={7}
                fill="none"
                stroke={d.color}
                strokeWidth={1.5}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
};
