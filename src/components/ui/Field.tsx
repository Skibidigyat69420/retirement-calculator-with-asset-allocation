import { type ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FieldProps {
  label?: ReactNode;
  /** id of the control the label points at. Falls back to a generated id. */
  htmlFor?: string;
  /**
   * 'stack' (default): label above the control.
   * 'inline': small mono label left of the control — for dense grids of short fields.
   */
  layout?: 'stack' | 'inline';
  helper?: string;
  /** Sentence-case error message. When set, renders in negative tone. */
  error?: string;
  /** Free-form slot below the helper — notices, cross-page links. */
  hint?: ReactNode;
  /** Extra classes for the label (stack layout only, inline label is fixed). */
  labelClassName?: string;
  className?: string;
  children: ReactNode;
}

export const Field = ({
  label,
  htmlFor,
  layout = 'stack',
  helper,
  error,
  hint,
  labelClassName,
  className,
  children,
}: FieldProps) => {
  const generatedId = useId();
  const inline = layout === 'inline';
  const hasError = !!error;

  return (
    <div className={cn(inline ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor ?? generatedId}
          className={cn(
            inline
              ? 'w-24 sm:w-28 shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted leading-tight'
              : 'field-label block text-xs font-medium tracking-normal text-ink-soft',
            !inline && labelClassName,
          )}
        >
          {label}
        </label>
      )}
      {children}
      {(helper || error) && (
        <div
          className={cn(
            'flex items-start gap-1.5 pt-0.5',
            inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]',
          )}
        >
          {hasError && <AlertCircle size={13} strokeWidth={1.8} className="text-negative mt-0.5 shrink-0" />}
          <p className={cn('text-xs leading-relaxed', hasError ? 'text-negative' : 'text-faint')}>
            {error ?? helper}
          </p>
        </div>
      )}
      {hint && (
        <div className={cn('pt-0.5', inline && 'basis-full pl-[6.75rem] sm:pl-[7.75rem]')}>
          {hint}
        </div>
      )}
    </div>
  );
};

export interface FieldGridProps {
  /** Responsive column counts, e.g. { sm: 2, md: 3 }. Base is always 1 column. */
  cols?: { sm?: number; md?: number; lg?: number };
  className?: string;
  children: ReactNode;
}

const SM_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const MD_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

export const FieldGrid = ({ cols, className, children }: FieldGridProps) => (
  <div
    className={cn(
      'grid grid-cols-1 gap-x-5 gap-y-4',
      cols?.sm && SM_COLS[cols.sm],
      cols?.md && MD_COLS[cols.md],
      cols?.lg && LG_COLS[cols.lg],
      className,
    )}
  >
    {children}
  </div>
);
