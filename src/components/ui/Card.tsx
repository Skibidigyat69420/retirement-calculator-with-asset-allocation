import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white/90 border border-stone-200/70 shadow-card',
    elevated: 'bg-white border border-stone-200/60 shadow-card-hover',
    navy: 'bg-navy text-white border border-navy shadow-card',
    gold: 'bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20',
    subtle: 'bg-stone-50/80 border border-stone-100',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 md:p-6 transition-all duration-200 print:break-inside-avoid',
        variant === 'default' && 'hover:shadow-card-hover',
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};
