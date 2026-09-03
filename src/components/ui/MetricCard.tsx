import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'navy' | 'gold' | 'success' | 'danger';
  className?: string;
  icon?: React.ReactNode;
}

export const MetricCard = ({
  label,
  value,
  subtext,
  variant = 'default',
  className,
  icon,
}: MetricCardProps) => {
  const variants = {
    default: 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-card hover:border-slate-300 text-slate-900',
    navy: 'bg-slate-900 border border-slate-800 text-white shadow-xs',
    gold: 'bg-white border border-slate-200/90 shadow-2xs hover:shadow-card text-slate-900',
    success: 'bg-white border border-emerald-200/80 shadow-2xs hover:shadow-card text-slate-900',
    danger: 'bg-white border border-rose-200/80 shadow-2xs hover:shadow-card text-slate-900',
  };

  const mutedColors = {
    default: 'text-slate-500',
    navy: 'text-slate-400',
    gold: 'text-slate-500',
    success: 'text-slate-500',
    danger: 'text-slate-500',
  };

  const iconColors = {
    default: 'text-slate-600 bg-slate-100',
    navy: 'text-white bg-white/10',
    gold: 'text-amber-800 bg-amber-50',
    success: 'text-emerald-700 bg-emerald-50',
    danger: 'text-rose-700 bg-rose-50',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-5 relative transition-all duration-200',
        variants[variant],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className={cn('text-[10px] font-semibold uppercase tracking-wider leading-tight truncate', mutedColors[variant])}>
          {label}
        </div>
        {icon && (
          <div className={cn('shrink-0 p-1.5 rounded-lg text-xs transition-colors', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn('text-xl sm:text-2xl font-serif font-semibold tracking-tight tabular-nums truncate leading-tight', variant === 'navy' ? 'text-white' : 'text-slate-900')}>
        {value}
      </div>
      {subtext && <div className={cn('text-xs mt-1.5 leading-snug line-clamp-2', mutedColors[variant])}>{subtext}</div>}
    </div>
  );
};
