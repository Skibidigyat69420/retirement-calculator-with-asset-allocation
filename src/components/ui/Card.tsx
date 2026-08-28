import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'navy' | 'gold' | 'subtle';
}

export const Card = ({ children, className, variant = 'default' }: CardProps) => {
  const variants = {
    default: 'bg-white border border-stone-200 shadow-sm',
    navy: 'bg-navy text-white border border-navy',
    gold: 'bg-gold/10 border border-gold/30',
    subtle: 'bg-stone-50 border border-stone-100',
  };

  return (
    <div className={cn('rounded-2xl p-6', variants[variant], className)}>
      {children}
    </div>
  );
};
