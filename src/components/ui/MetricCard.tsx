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
    default: 'bg-white border border-stone-200/70 shadow-card',
    navy: 'bg-navy text-white border border-navy shadow-card',
    gold: 'bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20',
    success: 'bg-emerald-50/80 border border-emerald-100',
    danger: 'bg-rose-50/80 border border-rose-100',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 relative overflow-hidden transition-shadow duration-200 hover:shadow-card-hover',
        variants[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</div>
          <div className="text-2xl md:text-3xl font-serif mt-1.5">{value}</div>
          {subtext && <div className="text-xs mt-1 opacity-70">{subtext}</div>}
        </div>
        {icon && <div className="text-gold/80">{icon}</div>}
      </div>
    </div>
  );
};
