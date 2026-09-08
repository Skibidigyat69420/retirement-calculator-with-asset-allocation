import React from 'react';
import { CloudOff, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  /** Human summary, e.g. "We couldn't save this plan." (§119) */
  title: string;
  /** Reassurance + context, e.g. "Your previous saved version is safe." */
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

/** Error state (§119): no raw "500 Internal Server Error", always a way out. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
  compact = false,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-6' : 'px-6 py-12 md:py-16',
        'rounded-2xl border border-negative/25 bg-negative-soft/40',
        className,
      )}
    >
      {!compact && (
        <div
          aria-hidden="true"
          className="size-12 rounded-2xl bg-negative/10 border border-negative/25 flex items-center justify-center text-negative mb-4"
        >
          <CloudOff size={22} />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5">
          <RotateCcw size={14} aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
