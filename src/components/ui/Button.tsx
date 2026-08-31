import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const variants = {
    primary:
      'bg-navy text-white hover:bg-navy/90 hover:shadow-md active:scale-[0.98] focus:ring-2 focus:ring-navy/20',
    secondary:
      'bg-gold text-ink hover:bg-gold/80 hover:shadow-md active:scale-[0.98] focus:ring-2 focus:ring-gold/20',
    outline:
      'border border-stone-300 bg-white text-navy hover:border-gold hover:text-gold hover:bg-gold/5 active:scale-[0.98]',
    ghost:
      'text-stone-500 hover:text-navy hover:bg-stone-100/70 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
};
