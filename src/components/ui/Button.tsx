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
      'bg-zinc-950 text-white hover:bg-zinc-800 shadow-2xs hover:shadow-xs active:translate-y-0 focus:ring-2 focus:ring-zinc-400',
    secondary:
      'bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200 active:translate-y-0 focus:ring-2 focus:ring-zinc-300',
    outline:
      'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-950 hover:bg-zinc-50 active:bg-zinc-100',
    ghost:
      'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200',
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
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-navy/40',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
};
