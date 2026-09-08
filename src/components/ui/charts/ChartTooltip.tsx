import React from 'react';
import { formatCompactINR } from '../../../lib/design-tokens';
import { useChartTheme } from './chartTheme';

export interface ChartTooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  label?: string | number;
}

/**
 * Shared tooltip shell (§115: consistent tooltips + number formatting).
 * Values default to compact INR; series color chips keep series identity.
 */
export const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
  const theme = useChartTheme();
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-xl border px-3 py-2.5 shadow-popover text-xs"
      style={{
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        color: theme.tooltipText,
      }}
    >
      {label !== undefined && (
        <div className="font-semibold mb-1.5" style={{ color: theme.tooltipText }}>
          {label}
        </div>
      )}
      <ul className="space-y-1">
        {payload.map((entry, index) => {
          const raw = entry.value;
          const numeric = typeof raw === 'number' ? raw : Number(raw);
          const formatted =
            typeof raw === 'number' || (typeof raw === 'string' && raw !== '' && !Number.isNaN(numeric))
              ? formatCompactINR(numeric)
              : String(raw ?? '');
          return (
            <li key={`${entry.name ?? entry.dataKey ?? index}`} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color ?? theme.series[index % theme.series.length] }}
              />
              <span className="opacity-75">{entry.name ?? entry.dataKey}</span>
              <span className="font-semibold tabular-nums ml-auto pl-3">{formatted}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
