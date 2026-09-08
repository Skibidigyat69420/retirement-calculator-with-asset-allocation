import React, { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Popover } from './Popover';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface DropdownMenuProps {
  /** Trigger element — receives click toggling; render as-function to get open state. */
  trigger: React.ReactElement | ((open: boolean) => React.ReactElement);
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
  'aria-label'?: string;
}

/**
 * Dropdown menu (§104 "+ New" quick actions). Built on Popover: roving
 * activation via click, item shortcuts shown as plain text chips.
 */
export const DropdownMenu = ({
  trigger,
  items,
  align = 'end',
  className,
  'aria-label': ariaLabel,
}: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const resolved: React.ReactElement<Record<string, unknown>> =
    typeof trigger === 'function'
      ? (trigger(open) as React.ReactElement<Record<string, unknown>>)
      : (trigger as React.ReactElement<Record<string, unknown>>);
  const triggerElement = React.cloneElement(resolved, {
    'aria-expanded': open,
    'aria-haspopup': 'menu' as const,
  });

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onClick={() => setOpen((value) => !value)}
      >
        {triggerElement}
      </span>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={align}
        className={cn('p-1.5', className)}
      >
        <div role="menu" aria-label={ariaLabel} className="flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors duration-100 cursor-pointer',
                'hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none',
                'disabled:opacity-40 disabled:pointer-events-none',
                item.danger ? 'text-negative' : 'text-ink',
              )}
            >
              {item.icon && <span className="shrink-0 opacity-80">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && (
                <span className="text-[10px] font-mono text-muted uppercase">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
};
