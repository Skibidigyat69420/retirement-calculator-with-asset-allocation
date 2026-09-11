import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { getChartTheme } from '../../lib/chartTheme';

export interface RiskRadarDatum {
  dimension: string;
  score: number;
}

interface RiskRadarProps {
  data: RiskRadarDatum[];
  /** Extra context announced to screen readers. */
  caption?: string;
}

/**
 * Restrained eight-dimension radar. All colours come from the shared chart
 * theme (CSS custom properties), so light/dark switching is automatic.
 */
export const RiskRadar = ({ data, caption }: RiskRadarProps) => {
  const theme = getChartTheme();

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label={
        caption ??
        `Radar chart of the eight risk dimensions: ${data
          .map((d) => `${d.dimension} ${d.score} percent`)
          .join(', ')}.`
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={theme.grid} />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: theme.axisLabel }} />
          <Tooltip
            formatter={(value) => [`${Number(value)}%`, 'Dimension score']}
            contentStyle={{
              borderRadius: '10px',
              border: `1px solid ${theme.tooltipBorder}`,
              backgroundColor: theme.tooltipBg,
              color: theme.tooltipText,
              padding: '8px 12px',
              fontSize: '12px',
              boxShadow: 'var(--shadow-popover)',
            }}
          />
          <Radar
            name="score"
            dataKey="score"
            stroke={theme.primary}
            fill={theme.primaryFill}
            fillOpacity={0.22}
            strokeWidth={1.6}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
