import { cn } from '../../lib/utils';

export interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

const dotStyles = {
  saving: 'bg-accent animate-pulse',
  saved: 'bg-positive',
  error: 'bg-negative',
};

export const SaveIndicator = ({ status }: SaveIndicatorProps) => {
  if (status === 'idle') return null;

  const labels = {
    saving: 'Saving…',
    saved: 'Saved just now',
    error: 'Changes not saved',
  } as const;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-faint" role="status" aria-live="polite">
      <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[status])} aria-hidden="true" />
      {labels[status]}
    </span>
  );
};
