import type React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

const defaultIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const variants = {
  info: 'bg-info-soft/60 text-ink border-info/25',
  success: 'bg-positive-soft/60 text-ink border-positive/25',
  warning: 'bg-warning-soft/60 text-ink border-warning/25',
  danger: 'bg-negative-soft/60 text-ink border-negative/25',
};

const iconStyles = {
  info: 'text-info',
  success: 'text-positive',
  warning: 'text-warning',
  danger: 'text-negative',
};

export const Alert = ({ children, variant = 'info', icon: Icon, className }: AlertProps) => {
  const IconComponent = Icon ?? defaultIcons[variant];

  return (
    <div
      role="alert"
      className={cn('p-3.5 rounded-md border text-sm flex items-start gap-3', variants[variant], className)}
    >
      <IconComponent size={15} strokeWidth={1.8} className={cn('shrink-0 mt-0.5', iconStyles[variant])} />
      <div className="flex-1 leading-relaxed text-pretty">{children}</div>
    </div>
  );
};
