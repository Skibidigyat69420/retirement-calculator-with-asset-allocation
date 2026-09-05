import React from 'react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

export const Alert = ({ children, variant = 'info', icon: Icon, className }: AlertProps) => {
  const variants = {
    info: 'bg-sky-50/70 text-sky-950 border-sky-200/80',
    success: 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80',
    warning: 'bg-amber-50/70 text-amber-950 border-amber-200/80',
    danger: 'bg-rose-50/70 text-rose-950 border-rose-200/80',
  };

  const iconStyles = {
    info: 'text-sky-700 bg-sky-100/70 border-sky-200/60',
    success: 'text-emerald-700 bg-emerald-100/70 border-emerald-200/60',
    warning: 'text-amber-700 bg-amber-100/70 border-amber-200/60',
    danger: 'text-rose-700 bg-rose-100/70 border-rose-200/60',
  };

  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-2xl border text-sm flex items-start gap-3.5 shadow-2xs backdrop-blur-xs transition-all',
        variants[variant],
        className,
      )}
    >
      {Icon && (
        <div className={cn('shrink-0 p-1.5 rounded-xl border flex items-center justify-center', iconStyles[variant])}>
          <Icon size={16} />
        </div>
      )}
      <div className="flex-1 leading-relaxed font-normal">{children}</div>
    </div>
  );
};

