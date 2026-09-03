import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white border border-slate-200/80 shadow-2xs hover:shadow-card hover:border-slate-300/80',
    elevated: 'bg-white border border-slate-200/80 shadow-card hover:shadow-card-hover',
    navy: 'bg-slate-900 text-white border border-slate-800 shadow-sm',
    gold: 'bg-amber-50/30 border border-amber-200/50 text-slate-900',
    subtle: 'bg-slate-50 border border-slate-200/60',
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
