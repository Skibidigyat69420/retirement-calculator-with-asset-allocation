import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-stone-100 text-stone-600',
    gold: 'bg-gold/30 text-ink border border-gold/50',
    navy: 'bg-navy text-white',
    outline: 'border border-stone-300 text-stone-600 bg-white',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    danger: 'bg-rose-50 text-rose-700 border border-rose-100',
    warning: 'bg-amber-50 text-amber-700 border border-amber-100',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};
