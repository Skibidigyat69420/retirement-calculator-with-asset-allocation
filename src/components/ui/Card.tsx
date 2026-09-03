import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white/95 backdrop-blur-xs border border-slate-200/80 shadow-xs hover:shadow-card hover:border-slate-300/80',
    elevated: 'bg-white border border-slate-200/80 shadow-card hover:shadow-card-hover',
    navy: 'bg-gradient-to-br from-navy via-navy to-navy-dark text-white border border-navy/40 shadow-elevated',
    gold: 'bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/80 shadow-xs',
    subtle: 'bg-slate-50/90 border border-slate-200/60',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 md:p-6 transition-all duration-200 print:break-inside-avoid',
        variant === 'default' && 'hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};
