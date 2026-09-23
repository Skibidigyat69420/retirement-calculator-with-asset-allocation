import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
}: ConfirmDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    cancelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm animate-overlay-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm bg-raised border border-border rounded-xl shadow-popover p-5"
      >
        <div className="flex items-start gap-3.5">
          {danger && (
            <div className="shrink-0 p-2 rounded-full bg-negative-soft text-negative border border-negative/20">
              <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {description && (
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} autoFocus={!danger}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
