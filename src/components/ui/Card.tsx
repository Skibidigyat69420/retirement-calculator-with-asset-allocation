import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle' | 'elevated';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white border border-zinc-200/90 shadow-2xs hover:shadow-card hover:border-zinc-300',
    elevated: 'bg-white border border-zinc-200/90 shadow-card hover:shadow-card-hover',
    navy: 'bg-zinc-950 text-white border border-zinc-900 shadow-xs',
    gold: 'bg-zinc-50 border border-zinc-200 text-zinc-900',
    subtle: 'bg-zinc-50/70 border border-zinc-200/80',
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
