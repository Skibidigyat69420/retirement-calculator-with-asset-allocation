import { cn } from '../../lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: 'default' | 'navy' | 'gold' | 'success' | 'danger';
  className?: string;
}

export const MetricCard = ({
  label,
  value,
  subtext,
  variant = 'default',
  className,
}: MetricCardProps) => {
  const variants = {
    default: 'bg-white border border-stone-200',
    navy: 'bg-navy text-white border border-navy',
    gold: 'bg-gold/10 border border-gold/20',
    success: 'bg-green-50 border border-green-200',
    danger: 'bg-red-50 border border-red-200',
  };

  return (
    <div className={cn('rounded-2xl p-5 shadow-sm relative overflow-hidden', variants[variant], className)}>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</div>
      <div className="text-2xl md:text-3xl font-serif mt-1.5">{value}</div>
      {subtext && <div className="text-xs mt-1 opacity-70">{subtext}</div>}
    </div>
  );
};
