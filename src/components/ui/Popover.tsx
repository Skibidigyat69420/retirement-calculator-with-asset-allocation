import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Anchor element the popover is positioned against. */
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'bottom' | 'top' | 'right' | 'left';
  className?: string;
}

/**
 * Floating panel (§112: elevated shadow tier) anchored to a trigger —
 * menus, filters, detail peek. Outside-click and ESC dismiss.
 */
export const Popover = ({
  open,
  onClose,
  anchorRef,
  children,
  align = 'start',
  side = 'bottom',
  className,
}: PopoverProps) => {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const gap = 6;
      const next: React.CSSProperties = {};
      if (side === 'bottom') {
        next.top = rect.bottom + gap;
        next.left = align === 'start' ? rect.left : align === 'end' ? rect.right - panel.offsetWidth : rect.left + rect.width / 2 - panel.offsetWidth / 2;
      } else if (side === 'top') {
        next.bottom = window.innerHeight - rect.top + gap;
        next.left = align === 'start' ? rect.left : align === 'end' ? rect.right - panel.offsetWidth : rect.left + rect.width / 2 - panel.offsetWidth / 2;
      } else if (side === 'right') {
        next.left = rect.right + gap;
        next.top = rect.top;
      } else {
        next.right = window.innerWidth - rect.left + gap;
        next.top = rect.top;
      }
      // Clamp horizontally into the viewport.
      if (next.left !== undefined) {
        const left = Math.min(Math.max(8, next.left as number), window.innerWidth - panel.offsetWidth - 8);
        next.left = Math.max(8, left);
      }
      setStyle(next);
    };
    update();

    const onPointerDown = (event: PointerEvent) => {
      if (panel.contains(event.target as Node) || anchor.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', update);
    };
  }, [open, onClose, anchorRef, align, side]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: side === 'bottom' ? -4 : 4, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={style}
          className={cn(
            'fixed z-70 min-w-44 max-w-sm rounded-xl bg-surface border border-border shadow-popover p-1.5 outline-none',
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
