import { cn } from '../../lib/utils';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export const Alert = ({ children, variant = 'info', icon: Icon, className }: AlertProps) => {
  const variants = {
    info: 'bg-stone-50 text-stone-700 border-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const iconColors = {
    info: 'text-stone-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
  };

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border text-sm flex items-start gap-3 shadow-sm',
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon size={18} className={cn('shrink-0 mt-0.5', iconColors[variant])} />}
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
};
