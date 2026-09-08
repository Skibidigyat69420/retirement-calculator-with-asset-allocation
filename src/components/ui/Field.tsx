import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface FieldProps {
  /** Visible label. Pass `false` to render a visually-hidden label (a11y). */
  label?: React.ReactNode | false;
  /** Supporting text below the control, linked via aria-describedby. */
  hint?: React.ReactNode;
  /** Error text — marks the control aria-invalid and links the message. */
  error?: React.ReactNode;
  /** Extra ids to include in aria-describedby (e.g. external help text). */
  describedBy?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode | ((props: FieldControlProps) => React.ReactNode);
}

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  invalid: boolean;
}

/**
 * label + hint + error wrapper (§116 form error association). Give the
 * rendered control the spread props so label/hint/error wiring is automatic.
 */
export const Field = ({
  label,
  hint,
  error,
  describedBy,
  required,
  className,
  children,
}: FieldProps) => {
  const generatedId = useId();
  const id = generatedId.replace(/:/g, '');
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedByIds = [hintId, errorId, describedBy].filter(Boolean).join(' ') || undefined;

  const controlProps: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedByIds,
    invalid: Boolean(error),
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label !== undefined && label !== false && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
        >
          {label}
          {required && (
            <span className="text-negative ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {label === false && (
        <label htmlFor={id} className="sr-only">
          {typeof hint === 'string' ? hint : 'Field'}
        </label>
      )}
      {typeof children === 'function' ? children(controlProps) : children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-negative font-medium leading-tight">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-muted leading-tight">
            {hint}
          </p>
        )
      )}
    </div>
  );
};
