import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'navy' | 'outline' | 'success' | 'danger' | 'warning';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  const variants = {
    default: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
    gold: 'bg-zinc-900 text-white border border-zinc-800',
    navy: 'bg-zinc-900 text-white border border-zinc-800',
    outline: 'border border-zinc-300 text-zinc-700 bg-white',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
    warning: 'bg-zinc-100 text-zinc-800 border border-zinc-300',
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
