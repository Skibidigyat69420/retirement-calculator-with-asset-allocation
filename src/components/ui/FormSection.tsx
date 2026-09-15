import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FormSectionProps {
  /** Section ordinal, e.g. "01". Rendered as `01 · TITLE` in the eyebrow. */
  index?: string;
  title: string;
  /** One sentence of context, rendered muted under the eyebrow. */
  description?: string;
  /** Right-aligned mono summary, e.g. "2 members". */
  meta?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Optional status dot before the meta. */
  badge?: 'complete' | 'partial' | 'empty';
  children: ReactNode;
  className?: string;
}

const BADGE_DOT: Record<NonNullable<FormSectionProps['badge']>, string> = {
  complete: 'bg-positive',
  partial: 'bg-brass',
  empty: 'bg-border-strong',
};

export const FormSection = ({
  index,
  title,
  description,
  meta,
  collapsible = false,
  defaultOpen = true,
  badge,
  children,
  className,
}: FormSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();

  const eyebrow = (
    <span className="eyebrow">
      {index ? `${index} · ` : ''}
      {title}
    </span>
  );

  const headerInner = (
    <>
      <div className="min-w-0">
        {eyebrow}
        {description && <p className="mt-1 text-xs text-muted leading-relaxed">{description}</p>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
        {badge && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full', BADGE_DOT[badge])}
            aria-hidden="true"
          />
        )}
        {meta && (
          <span className="font-mono text-[11px] tabular-nums text-faint whitespace-nowrap">
            {meta}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            aria-hidden="true"
            className={cn(
              'text-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        )}
      </div>
    </>
  );

  return (
    <section className={cn('border-b border-border', className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-start justify-between gap-4 py-3 text-left cursor-pointer select-none group"
        >
          {headerInner}
        </button>
      ) : (
        <div className="flex items-start justify-between gap-4 py-3">{headerInner}</div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pb-7">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
