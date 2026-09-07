import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Percent } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../../lib/formatters';
import type { TaxSummary } from '../../../lib/wealthEngine';

interface TaxBreakdownChartProps {
  taxSummary: TaxSummary;
  annualIncome: number;
}

const GAUGE_SCALE_MAX = 40; // gauge spans 0–40% effective rate
const ARC_RADIUS = 85;
const ARC_LENGTH = Math.PI * ARC_RADIUS;

export const TaxBreakdownChart = ({ taxSummary, annualIncome }: TaxBreakdownChartProps) => {
  const rate = taxSummary.effectiveRate * 100;
  const gaugeFraction = Math.min(1, rate / GAUGE_SCALE_MAX);
  const gaugeColor = rate > 30 ? TOKEN.negative : rate > 20 ? TOKEN.warning : TOKEN.accent;

  const composition = useMemo(
    () => [
      {
        name: 'Annual Income',
        postTax: taxSummary.postTaxIncome,
        tax: taxSummary.annualTax,
      },
    ],
    [taxSummary],
  );

  const caption = `${formatPercent(rate)} of income is paid in tax — ${formatCurrency(taxSummary.annualTax)} per year, leaving ${formatCurrency(taxSummary.postTaxIncome)} of post-tax income; an additional ${formatCurrency(taxSummary.recommendedTaxSaving)} is addressable through tax-saving instruments.`;

  const summary = `Effective tax rate ${formatPercent(rate)} on annual income of ${formatCurrency(annualIncome)}. Estimated annual tax ${formatCurrency(taxSummary.annualTax)}. Post-tax income ${formatCurrency(taxSummary.postTaxIncome)}. Recommended tax saving ${formatCurrency(taxSummary.recommendedTaxSaving)}.`;

  return (
    <ChartFrame
      title="Tax Composition — Effective Rate & Income Split"
      icon={<Percent size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View tax figures"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Item</th>
              <th className="py-2.5 pr-4 text-right">Amount</th>
            </>
          }
        >
          {(
            [
              ['Annual income', annualIncome],
              ['Estimated annual tax', taxSummary.annualTax],
              ['Post-tax income', taxSummary.postTaxIncome],
              ['Recommended tax saving', taxSummary.recommendedTaxSaving],
            ] as [string, number][]
          ).map(([label, value]) => (
            <tr key={label}>
              <td className="py-2 pr-4 text-muted">{label}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(value)}</td>
            </tr>
          ))}
          <tr>
            <td className="py-2 pr-4 text-muted">Effective tax rate</td>
            <td className="py-2 pr-4 text-right font-mono text-ink">{formatPercent(rate)}</td>
          </tr>
        </DetailTable>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div role="img" aria-label={`Gauge showing an effective tax rate of ${formatPercent(rate)} on a 0 to ${GAUGE_SCALE_MAX} percent scale`} className="mx-auto w-full max-w-[220px]">
          <svg viewBox="0 0 200 118" className="w-full h-auto">
            <path
              d="M 15 105 A 85 85 0 0 1 185 105"
              fill="none"
              stroke={TOKEN.border}
              strokeWidth={14}
              strokeLinecap="round"
            />
            <path
              d="M 15 105 A 85 85 0 0 1 185 105"
              fill="none"
              stroke={gaugeColor}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={`${gaugeFraction * ARC_LENGTH} ${ARC_LENGTH}`}
            />
            <text x="100" y="88" textAnchor="middle" className="fill-ink" style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {formatPercent(rate)}
            </text>
            <text x="100" y="108" textAnchor="middle" className="fill-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Effective tax rate
            </text>
          </svg>
        </div>
        <div className="h-36 w-full" role="img" aria-label={`Stacked bar: of annual income ${formatCurrencyCompact(annualIncome)}, tax is ${formatCurrencyCompact(taxSummary.annualTax)} and post-tax income is ${formatCurrencyCompact(taxSummary.postTaxIncome)}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={composition} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="40%">
              <XAxis type="number" hide domain={[0, annualIncome || 1]} />
              <YAxis type="category" dataKey="name" tick={CHART_TICK} axisLine={false} tickLine={false} width={96} />
              <Tooltip
                cursor={{ fill: 'var(--color-sunken)' }}
                formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Bar dataKey="postTax" name="Post-tax income" stackId="income" fill={TOKEN.accent} fillOpacity={0.85} radius={[0, 0, 0, 0]}>
                <LabelList dataKey="postTax" position="center" formatter={(v: any) => formatCurrencyCompact(Number(v))} style={{ fontSize: 10, fill: '#ffffff', fontWeight: 600 }} />
              </Bar>
              <Bar dataKey="tax" name="Estimated tax" stackId="income" fill={TOKEN.warning} fillOpacity={0.9} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="tax" position="center" formatter={(v: any) => formatCurrencyCompact(Number(v))} style={{ fontSize: 10, fill: '#ffffff', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartFrame>
  );
};
