import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the complementary panel. */
  label: string;
  children: React.ReactNode;
  /** Header content — usually a title + close affordance is built in. */
  header?: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
}

/**
 * Drawer (§113 drawer entrance micro-interaction): slides over content with
 * an overlay, ESC to close, body scroll locked while open.
 */
export const Drawer = ({
  open,
  onClose,
  label,
  children,
  header,
  side = 'right',
  className,
}: DrawerProps) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const offscreen = side === 'right' ? '100%' : '-100%';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-overlay cursor-pointer"
          />
          <motion.aside
            role="complementary"
            aria-label={label}
            initial={reduceMotion ? { opacity: 0 } : { x: offscreen }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { x: offscreen }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute top-0 bottom-0 w-full sm:max-w-md bg-surface border-border shadow-popover',
              'flex flex-col outline-none overflow-hidden',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div className="min-w-0 flex-1 text-base font-semibold text-ink truncate">{header ?? label}</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="size-8 inline-flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-sunken border border-transparent hover:border-border transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
