import type React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** CSS-only tooltip — appears on hover and keyboard focus of the trigger. */
export const Tooltip = ({ content, children, side = 'top', className }: TooltipProps) => {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap',
          'bg-raised border border-border shadow-popover text-xs text-ink',
          'px-2 py-1 rounded-sm pointer-events-none',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {content}
      </span>
    </span>
  );
};
