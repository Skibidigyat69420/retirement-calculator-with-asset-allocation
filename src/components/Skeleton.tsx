import type { ReactElement } from 'react';

export function Skeleton(): ReactElement {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-3xl space-y-4 animate-pulse">
        <div className="h-8 bg-raised rounded-xl w-1/3" />
        <div className="h-40 bg-raised rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-raised rounded-2xl" />
          <div className="h-24 bg-raised rounded-2xl" />
          <div className="h-24 bg-raised rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
