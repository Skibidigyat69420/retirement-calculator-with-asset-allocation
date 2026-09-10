import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
  side?: 'left' | 'right';
}

const clampWidth = (w: number) => Math.min(640, Math.max(420, w));

export const Drawer = ({
  open,
  onClose,
  title,
  children,
  width = 480,
  side = 'right',
}: DrawerProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ width: clampWidth(width) }}
        className={cn(
          'absolute inset-y-0 bg-surface shadow-popover outline-none overflow-y-auto',
          'focus-visible:outline-none',
          side === 'right'
            ? 'right-0 border-l border-border animate-drawer-right-in'
            : 'left-0 border-r border-border animate-drawer-in',
        )}
      >
        {title && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-border bg-surface">
            <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={1.6} />
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
};
