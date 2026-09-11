import { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { formatCurrencyCompact } from '../../lib/formatters';

interface DistributionBin {
  binStart: number;
  binEnd: number;
  count: number;
  probability: number;
}

interface GoalDistributionBarsProps {
  distribution: DistributionBin[];
  /** Bins ending below this value render in the shortfall colour. */
  targetAmount?: number;
  className?: string;
}

/**
 * Compact inline probability histogram rendered purely with divs so it
 * survives PDF print (no canvas / SVG hover states). Each bin is a vertical
 * bar whose height is proportional to its probability mass.
 */
export const GoalDistributionBars = ({ distribution, targetAmount, className }: GoalDistributionBarsProps) => {
  const { maxProbability, shortfallMass } = useMemo(() => {
    let max = 0;
    let shortfall = 0;
    distribution.forEach((bin) => {
      if (bin.probability > max) max = bin.probability;
      if (targetAmount !== undefined && bin.binEnd < targetAmount) shortfall += bin.probability;
    });
    return { maxProbability: max, shortfallMass: shortfall };
  }, [distribution, targetAmount]);

  if (!distribution.length || maxProbability <= 0) {
    return <span className="text-[11px] text-faint">Distribution unavailable</span>;
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className="flex items-end gap-[1px] h-12 w-full"
        role="img"
        aria-label={`Simulated outcome distribution${targetAmount !== undefined ? ` with ${(shortfallMass * 100).toFixed(0)}% probability below target` : ''}`}
      >
        {distribution.map((bin, i) => {
          const heightPct = Math.max(4, (bin.probability / maxProbability) * 100);
          const isShortfall = targetAmount !== undefined && bin.binEnd < targetAmount;
          return (
            <div
              key={i}
              className={cn('flex-1 rounded-t-[1px]', isShortfall ? 'bg-negative/60' : 'bg-positive/70')}
              style={{ height: `${heightPct}%` }}
              title={`${formatCurrencyCompact(bin.binStart)} – ${formatCurrencyCompact(bin.binEnd)}: ${(bin.probability * 100).toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-faint font-mono">
        <span>{formatCurrencyCompact(distribution[0].binStart)}</span>
        {targetAmount !== undefined && shortfallMass > 0 && (
          <span className="text-negative font-semibold">{(shortfallMass * 100).toFixed(0)}% below target</span>
        )}
        <span>{formatCurrencyCompact(distribution[distribution.length - 1].binEnd)}</span>
      </div>
    </div>
  );
};
