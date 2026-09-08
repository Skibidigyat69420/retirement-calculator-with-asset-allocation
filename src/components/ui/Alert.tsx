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
    info: 'bg-info/[0.07] border-info/25',
    success: 'bg-positive/[0.07] border-positive/25',
    warning: 'bg-warning/[0.07] border-warning/25',
    danger: 'bg-negative/[0.07] border-negative/25',
  };

  const iconStyles = {
    info: 'text-info bg-info/10 border-info/25',
    success: 'text-positive bg-positive/10 border-positive/25',
    warning: 'text-warning bg-warning/10 border-warning/25',
    danger: 'text-negative bg-negative/10 border-negative/25',
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
      <div className="flex-1 leading-relaxed font-normal text-ink-soft">{children}</div>
    </div>
  );
};

