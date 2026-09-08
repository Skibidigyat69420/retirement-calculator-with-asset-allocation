import React from 'react';
import { cn } from '../../lib/utils';

/** Client/plan status language (§232). */
export type Status =
  | 'on-track'
  | 'needs-review'
  | 'at-risk'
  | 'stale'
  | 'awaiting-input'
  | 'complete'
  | 'info';

const statusConfig: Record<Status, { label: string; dot: string; chip: string }> = {
  'on-track': {
    label: 'On track',
    dot: 'bg-positive',
    chip: 'bg-positive-soft text-positive border-positive/25',
  },
  'needs-review': {
    label: 'Needs review',
    dot: 'bg-warning',
    chip: 'bg-warning-soft text-warning border-warning/30',
  },
  'at-risk': {
    label: 'At risk',
    dot: 'bg-negative',
    chip: 'bg-negative-soft text-negative border-negative/25',
  },
  stale: {
    label: 'Stale',
    dot: 'bg-muted',
    chip: 'bg-sunken text-muted border-border',
  },
  'awaiting-input': {
    label: 'Awaiting input',
    dot: 'bg-info',
    chip: 'bg-info-soft text-info border-info/25',
  },
  complete: {
    label: 'Complete',
    dot: 'bg-positive',
    chip: 'bg-positive-soft text-positive border-positive/25',
  },
  info: {
    label: 'Info',
    dot: 'bg-info',
    chip: 'bg-info-soft text-info border-info/25',
  },
};

export interface StatusPillProps {
  status: Status;
  /** Override the displayed label (e.g. localize) while keeping the tone. */
  label?: string;
  /** Hide the status text on narrow screens (dot keeps the signal, §233
   *  never color-alone — pair with a title/tooltip). */
  dotOnly?: boolean;
  className?: string;
}

/**
 * Status pill using the product's agreed status language (§232) and color
 * semantics (§233: green positive · amber review · red concern · blue info).
 */
export const StatusPill: React.FC<StatusPillProps> = ({ status, label, dotOnly = false, className }) => {
  const config = statusConfig[status];
  const text = label ?? config.label;
  return (
    <span
      role="status"
      title={dotOnly ? text : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border',
        config.chip,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full shrink-0', config.dot)} aria-hidden="true" />
      {!dotOnly && text}
      {dotOnly && <span className="sr-only">{text}</span>}
    </span>
  );
};

export const statusLabels: Record<Status, string> = Object.fromEntries(
  (Object.keys(statusConfig) as Status[]).map((key) => [key, statusConfig[key].label]),
) as Record<Status, string>;
