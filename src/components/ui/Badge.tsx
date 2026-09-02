import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    gold: 'bg-amber-100 text-amber-800 border border-amber-200',
    navy: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    outline: 'border border-slate-300 text-slate-600 bg-white',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
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
