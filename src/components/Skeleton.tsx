import type { ReactElement } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  /** Pass-through classes to match a specific chart/table shape. */
  className?: string;
}

export function Skeleton({ className }: SkeletonProps = {}): ReactElement {
  return (
    <div
      className={cn('min-h-[50vh] flex flex-col items-center justify-center p-6', className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-3xl space-y-4">
        <div className="h-7 w-1/3 rounded-md bg-sunken animate-shimmer" />
        <div className="h-40 rounded-lg bg-sunken animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded-lg bg-sunken animate-shimmer" />
          <div className="h-24 rounded-lg bg-sunken animate-shimmer" />
          <div className="h-24 rounded-lg bg-sunken animate-shimmer" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
