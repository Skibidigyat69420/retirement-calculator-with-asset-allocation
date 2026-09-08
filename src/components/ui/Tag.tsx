import React from 'react';
import { cn } from '../../lib/utils';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Practice-configurable labels (§246): HNI, Family, Review Due… */
  children: React.ReactNode;
  /** Soft colorways; defaults to a neutral chip. */
  tone?: 'neutral' | 'emerald' | 'blue' | 'amber' | 'rose' | 'champagne';
  /** Show a removable × button (calls onRemove). */
  onRemove?: () => void;
  className?: string;
}

const tones = {
  neutral: 'bg-sunken text-ink-soft border border-border',
  emerald: 'bg-positive-soft text-positive border border-positive/25',
  blue: 'bg-info-soft text-info border border-info/25',
  amber: 'bg-warning-soft text-warning border border-warning/30',
  rose: 'bg-negative-soft text-negative border border-negative/25',
  champagne: 'bg-champagne/10 text-champagne border border-champagne/30',
};

/** Lightweight practice-configurable tag chip (§246). Not a status signal. */
export const Tag = ({ children, tone = 'neutral', onRemove, className, ...props }: TagProps) => {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold tracking-wide transition-colors',
        tones[tone],
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${typeof children === 'string' ? children : ''}`}
          className="ml-0.5 rounded-full hover:bg-ink/10 inline-flex items-center justify-center size-3.5 cursor-pointer"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" fill="none">
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
};
