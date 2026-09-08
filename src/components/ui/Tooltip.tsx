import React from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const sideClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * Hover/focus tooltip via CSS group (no JS positioning). The trigger is
 * cloned with aria-describedby wiring through the wrapper. Keep content
 * short; interactive content belongs in Popover.
 */
export const Tooltip = ({ content, children, side = 'top', className }: TooltipProps) => {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-70 whitespace-nowrap rounded-lg px-2.5 py-1.5',
          'bg-midnight text-white text-xs font-medium shadow-popover border border-white/10',
          'opacity-0 translate-y-0.5 scale-[0.98] transition-all duration-150 ease-out',
          'group-hover/tt:opacity-100 group-hover/tt:translate-y-0 group-hover/tt:scale-100',
          'group-focus-within/tt:opacity-100 group-focus-within/tt:translate-y-0 group-focus-within/tt:scale-100',
          sideClasses[side],
        )}
      >
        {content}
      </span>
    </span>
  );
};
