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
    default: 'bg-white border border-slate-200/70 shadow-card',
    navy: 'bg-gradient-to-br from-navy to-navy-dark text-white border border-navy shadow-elevated',
    gold: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60',
    success: 'bg-emerald-50/80 border border-emerald-100',
    danger: 'bg-rose-50/80 border border-rose-100',
  };

  const mutedColors = {
    default: 'text-slate-500',
    navy: 'text-indigo-100',
    gold: 'text-amber-700',
    success: 'text-emerald-700',
    danger: 'text-rose-700',
  };

  const iconColors = {
    default: 'text-navy/80',
    navy: 'text-indigo-100',
    gold: 'text-amber-600',
    success: 'text-emerald-600',
    danger: 'text-rose-600',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={cn('text-[10px] font-bold uppercase tracking-widest', mutedColors[variant])}>{label}</div>
          <div className="text-2xl md:text-3xl font-serif mt-1.5">{value}</div>
          {subtext && <div className={cn('text-xs mt-1', mutedColors[variant])}>{subtext}</div>}
        </div>
        {icon && <div className={cn('shrink-0', iconColors[variant])}>{icon}</div>}
      </div>
    </div>
  );
};
