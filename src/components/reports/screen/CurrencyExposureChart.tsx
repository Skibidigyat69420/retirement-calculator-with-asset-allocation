import { useMemo } from 'react';
import { Coins } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { TOKEN } from './chartTheme';
import { DonutChart } from '../../charts/DonutChart';
import { Badge } from '../../ui/Badge';
import { formatCurrency, formatPercent } from '../../../lib/formatters';
import type { CurrencyExposure } from '../../../lib/wealthEngine';

interface CurrencyExposureChartProps {
  exposure: CurrencyExposure[];
}

/** Token-based palette so the donut never introduces off-palette hex colors. */
const TOKEN_PALETTE = [TOKEN.ink, TOKEN.info, TOKEN.warning, TOKEN.accent, TOKEN.negative, TOKEN.muted, TOKEN.faint];

function readTokenPalette(): string[] {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return TOKEN_PALETTE;
  }
  const styles = getComputedStyle(document.documentElement);
  return TOKEN_PALETTE.map((token) => {
    const raw = styles.getPropertyValue(token.replace('var(', '').replace(')', '')).trim();
    return raw || '#52525b';
  });
}

export const CurrencyExposureChart = ({ exposure }: CurrencyExposureChartProps) => {
  const data = useMemo(() => {
    const palette = readTokenPalette();
    return exposure
      .filter((c) => c.amount > 0)
      .map((c, i) => ({
        name: c.currency,
        value: c.amount,
        color: palette[i % palette.length],
      }));
  }, [exposure]);

  const dominant = exposure.reduce<CurrencyExposure | null>(
    (best, c) => (c.percentage > (best?.percentage ?? -1) ? c : best),
    null,
  );

  const caption = dominant
    ? `${dominant.currency} dominates the portfolio at ${formatPercent(dominant.percentage)} of assets (${formatCurrency(dominant.amount)}); FX risk is concentrated where non-INR exposure exceeds ~20% of net worth.`
    : 'No currency exposure data available.';

  const summary = `Currency exposure of the portfolio. ${exposure
    .map((c) => `${c.currency}: ${formatCurrency(c.amount)}, ${formatPercent(c.percentage)} of assets`)
    .join('. ')}.`;

  return (
    <ChartFrame
      title="Currency Exposure — Concentration"
      icon={<Coins size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View per-currency table"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Currency</th>
              <th className="py-2.5 pr-4 text-right">Amount</th>
              <th className="py-2.5 pr-4 text-right">Share</th>
              <th className="py-2.5 pr-4">Exposure</th>
            </>
          }
        >
          {exposure.map((c) => (
            <tr key={c.currency}>
              <td className="py-2 pr-4 font-semibold text-ink">{c.currency}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(c.amount)}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatPercent(c.percentage)}</td>
              <td className="py-2 pr-4 w-48">
                <div className="h-2 rounded-full bg-sunken overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, c.percentage)}%`, backgroundColor: TOKEN.muted }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </DetailTable>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div role="img" aria-label={`Donut chart of currency exposure: ${exposure.map((c) => `${c.currency} ${formatPercent(c.percentage)}`).join(', ')}`}>
          <DonutChart data={data} innerRadius={46} outerRadius={74} />
        </div>
        <ul className="space-y-2.5">
          {exposure.map((c) => (
            <li key={c.currency} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-ink">{c.currency}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-muted text-xs">{formatCurrency(c.amount)}</span>
                <Badge variant={c.currency === 'INR' ? 'outline' : c.percentage > 20 ? 'gold' : 'default'}>
                  {formatPercent(c.percentage)}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
};
