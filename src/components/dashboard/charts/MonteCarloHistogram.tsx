import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrencyCompact } from '../../../lib/formatters';
import { COLORS } from '../../../lib/constants';

interface MonteCarloHistogramProps {
  terminalValues: number[];
  ariaLabel: string;
  summary: string;
}

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

const BIN_COUNT = 10;

interface HistogramBin {
  label: string;
  binStart: number;
  binEnd: number;
  midpoint: number;
  count: number;
}

export const MonteCarloHistogram = ({ terminalValues, ariaLabel, summary }: MonteCarloHistogramProps) => {
  const { bins, median } = useMemo(() => {
    const sorted = [...terminalValues].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (sorted.length === 0) {
      return { bins: [] as HistogramBin[], median: 0 };
    }
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const span = max - min;
    const medianValue = sorted[Math.floor(sorted.length / 2)] || 0;

    if (span <= 0) {
      return {
        bins: [
          {
            label: formatCurrencyCompact(min),
            binStart: min,
            binEnd: max,
            midpoint: min,
            count: sorted.length,
          },
        ] as HistogramBin[],
        median: medianValue,
      };
    }

    const width = span / BIN_COUNT;
    const counts = new Array<number>(BIN_COUNT).fill(0);
    for (const v of sorted) {
      const idx = Math.min(BIN_COUNT - 1, Math.floor((v - min) / width));
      counts[idx] += 1;
    }

    const built: HistogramBin[] = counts.map((count, i) => {
      const binStart = min + i * width;
      const binEnd = binStart + width;
      return {
        label: `${formatCurrencyCompact(binStart)}–${formatCurrencyCompact(binEnd)}`,
        binStart,
        binEnd,
        midpoint: (binStart + binEnd) / 2,
        count,
      };
    });

    return { bins: built, median: medianValue };
  }, [terminalValues]);

  if (bins.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <p className="text-sm text-zinc-600 text-center px-6">No Monte Carlo outcomes available yet.</p>
        <p className="sr-only">{summary}</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#78716c' }}
            angle={-28}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
            tickMargin={6}
            height={58}
            interval={bins.length > 6 ? 1 : 0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const bin = payload[0].payload as HistogramBin;
              return (
                <div style={TOOLTIP_STYLE}>
                  <div className="text-[11px] font-bold text-zinc-800">{bin.label}</div>
                  <div className="text-[11px] text-zinc-600 tabular-nums">
                    {bin.count.toLocaleString()} scenario{bin.count === 1 ? '' : 's'}
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            x={bins.find((b) => median >= b.binStart && median <= b.binEnd)?.label}
            stroke={COLORS.gold}
            strokeWidth={2}
            strokeDasharray="5 3"
            label={{ value: 'Median', position: 'insideTop', fill: COLORS.gold, fontSize: 10, fontWeight: 700 }}
          />
          <Bar dataKey="count" name="Scenarios" radius={[4, 4, 0, 0]} fill={COLORS.navy}>
            {bins.map((bin, index) => (
              <Cell
                key={`bin-${index}`}
                fill={bin.midpoint >= median ? COLORS.navy : COLORS.warmDark}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="sr-only">{summary}</p>
    </div>
  );
};
