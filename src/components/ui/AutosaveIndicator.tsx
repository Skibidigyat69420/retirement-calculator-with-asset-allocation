import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface AutosaveIndicatorProps {
  state: AutosaveState;
  /** e.g. "Saved just now" — defaults derived from `state`. */
  savedLabel?: string;
  onRetry?: () => void;
  className?: string;
}

const config: Record<AutosaveState, { icon: React.ReactNode; text: string; className: string }> = {
  idle: { icon: <Check size={12} />, text: '', className: 'text-muted' },
  saving: {
    icon: <Loader2 size={12} className="animate-spin" />,
    text: 'Saving…',
    className: 'text-muted',
  },
  saved: {
    icon: <Check size={12} />,
    text: 'Saved just now',
    className: 'text-positive',
  },
  error: {
    icon: <CloudOff size={12} />,
    text: "Couldn't save",
    className: 'text-negative',
  },
};

/**
 * Autosave indicator (§120): subtle text near the plan title.
 * saving → "Saving…" · saved → "Saved just now" · error → "Couldn't save [Retry]".
 */
export const AutosaveIndicator = ({
  state,
  savedLabel,
  onRetry,
  className,
}: AutosaveIndicatorProps) => {
  if (state === 'idle') return null;
  const current = config[state];
  const text = state === 'saved' && savedLabel ? savedLabel : current.text;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium tabular-nums',
        current.className,
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state + text}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="inline-flex items-center gap-1.5"
        >
          {current.icon}
          {text}
        </motion.span>
      </AnimatePresence>
      {state === 'error' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-2 font-semibold cursor-pointer hover:opacity-80"
        >
          Retry
        </button>
      )}
    </span>
  );
};
