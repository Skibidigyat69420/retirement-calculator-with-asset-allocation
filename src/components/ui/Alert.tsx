import { cn } from '../../lib/utils';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export const Alert = ({ children, variant = 'info', icon: Icon, className }: AlertProps) => {
  const variants = {
    info: 'bg-paper text-textMuted border-warm',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-red/8 text-red border-red/20',
  };

  const iconColors = {
    info: 'text-warm-dark',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red',
  };

  return (
    <div
      role="alert"
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
