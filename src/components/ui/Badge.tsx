import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/50',
    gold: 'bg-amber-50 text-amber-900/80 border border-amber-200/60',
    navy: 'bg-slate-100 text-slate-800 border border-slate-200/80',
    outline: 'border border-slate-200 text-slate-600 bg-white',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/60',
    warning: 'bg-amber-50 text-amber-900/80 border border-amber-200/60',
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
