import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/** Inline skeleton shimmer block — compose into page/row layouts (§118). */
export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={cn('animate-pulse rounded-lg bg-sunken border border-border/60', className)}
    />
  );
};

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText = ({ lines = 3, className }: SkeletonTextProps) => {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-3 animate-pulse rounded bg-sunken border border-border/60"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  );
};

/** Standard table skeleton — `rows` body rows beneath a header row (§118). */
export const SkeletonTableRows = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div role="status" aria-label="Loading table" className="space-y-2.5 p-4">
      <span className="sr-only">Loading…</span>
      <div className="flex gap-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} className="h-9 flex-1 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
};
