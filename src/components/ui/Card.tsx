import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white border border-slate-200/70 shadow-card',
    elevated: 'bg-white border border-slate-200/60 shadow-card-hover',
    navy: 'bg-gradient-to-br from-navy to-navy-dark text-white border border-navy shadow-elevated',
    gold: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60',
    subtle: 'bg-slate-50/80 border border-slate-100',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 md:p-6 transition-all duration-200 print:break-inside-avoid',
        variant === 'default' && 'hover:shadow-card-hover hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};
