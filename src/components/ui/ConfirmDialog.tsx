import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** e.g. "You have unsaved changes." (§121) */
  title: string;
  description?: string;
  /** Primary action label, e.g. "Save and leave". */
  confirmLabel?: string;
  /** Destructive variant paints the primary action red. */
  destructive?: boolean;
  onConfirm: () => void;
  /** Optional middle action, e.g. "Leave without saving". */
  onSecondary?: () => void;
  secondaryLabel?: string;
  busy?: boolean;
}

/**
 * Confirmation dialog — used for the dirty-state/navigation guard (§121)
 * and destructive actions. Always offers a plain Cancel that closes.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onSecondary,
  secondaryLabel,
  busy = false,
}) => {
  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} label={title} className="max-w-md">
      <div className="p-5 md:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink pr-8">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {onSecondary && secondaryLabel && (
            <Button variant="secondary" onClick={onSecondary} disabled={busy}>
              {secondaryLabel}
            </Button>
          )}
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
