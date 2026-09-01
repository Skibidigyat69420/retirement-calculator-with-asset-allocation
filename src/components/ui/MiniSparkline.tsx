import { COLORS } from '../../lib/constants';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const MiniSparkline = ({ data, width = 100, height = 32, color = COLORS.navy, className }: MiniSparklineProps) => {
  if (data.length < 2) {
    return <div className={className} style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * plotWidth;
    const y = padding + plotHeight - ((value - min) / range) * plotHeight;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};
