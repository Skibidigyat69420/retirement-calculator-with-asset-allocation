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
    default: 'bg-white/95 backdrop-blur-xs border border-slate-200/80 shadow-xs hover:shadow-card hover:-translate-y-0.5 border-t-[3px] border-t-slate-400/80',
    navy: 'bg-gradient-to-br from-navy via-navy to-navy-dark text-white border border-navy shadow-elevated border-t-[3px] border-t-indigo-400',
    gold: 'bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/70 shadow-xs hover:shadow-card hover:-translate-y-0.5 border-t-[3px] border-t-amber-500',
    success: 'bg-emerald-50/90 border border-emerald-200/70 shadow-xs hover:shadow-card hover:-translate-y-0.5 border-t-[3px] border-t-emerald-500',
    danger: 'bg-rose-50/90 border border-rose-200/70 shadow-xs hover:shadow-card hover:-translate-y-0.5 border-t-[3px] border-t-rose-500',
  };

  const mutedColors = {
    default: 'text-slate-500',
    navy: 'text-indigo-200',
    gold: 'text-amber-800',
    success: 'text-emerald-800',
    danger: 'text-rose-800',
  };

  const iconColors = {
    default: 'text-navy',
    navy: 'text-indigo-200',
    gold: 'text-amber-600',
    success: 'text-emerald-600',
    danger: 'text-rose-600',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-200',
        variants[variant],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className={cn('text-[10px] font-bold uppercase tracking-wider leading-tight truncate', mutedColors[variant])}>
          {label}
        </div>
        {icon && (
          <div className={cn('shrink-0 p-1.5 rounded-lg bg-white/60 shadow-2xs backdrop-blur-xs', variant === 'navy' ? 'bg-white/10' : '', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-serif font-medium tracking-tight tabular-nums truncate leading-tight">
        {value}
      </div>
      {subtext && <div className={cn('text-xs mt-1.5 leading-snug line-clamp-2', mutedColors[variant])}>{subtext}</div>}
    </div>
  );
};
