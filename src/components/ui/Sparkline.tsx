import React from 'react';
import { cn } from '../../lib/utils';

export interface SparklineProps {
  /** Series values, rendered left→right. */
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color; defaults to the brand accent. */
  stroke?: string;
  /** Fills the area under the line with a soft gradient wash. */
  withArea?: boolean;
  /** Highlights the last point. */
  showLastPoint?: boolean;
  tone?: 'accent' | 'positive' | 'negative' | 'muted';
  className?: string;
  /** Accessible description of the trend, e.g. "Corpus grew 12% over 10 years". */
  label: string;
}

const toneColors = {
  accent: 'var(--color-accent)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  muted: 'var(--color-muted)',
};

/** Tiny inline SVG sparkline for table rows and stat cards (§115 contract). */
export const Sparkline = ({
  data,
  width = 96,
  height = 28,
  stroke,
  withArea = true,
  showLastPoint = true,
  tone = 'accent',
  className,
  label,
}: SparklineProps) => {
  const gradientId = React.useId().replace(/:/g, '');
  const color = stroke ?? toneColors[tone];

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className={className} role="img" aria-label={label}>
        <line
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--color-border-strong)"
          strokeDasharray="3 3"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((value, index) => {
    const x = pad + index * stepX;
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${path} L${points[points.length - 1][0].toFixed(2)},${height - pad} L${points[0][0].toFixed(2)},${height - pad} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={label}
      data-tabular="true"
    >
      <title>{label}</title>
      {withArea && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} aria-hidden="true" />
        </>
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showLastPoint && <circle cx={lastX} cy={lastY} r={2.4} fill={color} />}
    </svg>
  );
};
