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
      'bg-navy text-white hover:bg-navy-dark hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-navy/20',
    secondary:
      'bg-emerald-700 text-white hover:bg-emerald-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-emerald-200',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy hover:bg-indigo-50/50 active:bg-slate-50',
    ghost:
      'text-slate-600 hover:text-navy hover:bg-slate-100 active:bg-slate-200',
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
