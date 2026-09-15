import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface RepeaterProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** One line: name + key figures. Numbers should be font-mono. */
  renderSummary: (item: T) => ReactNode;
  /** Full field grid, shown when the row is expanded. */
  renderEditor: (item: T) => ReactNode;
  onRemove?: (item: T) => void;
  /**
   * Appends a blank item immediately. Ignored when `renderAddEditor` is
   * provided — then the dashed row expands a staged add-form instead.
   */
  onAdd: () => void;
  addLabel: string;
  emptyLabel?: string;
  maxItems?: number;
  /**
   * Optional staged add-form rendered inside the expanded dashed row.
   * When provided, Repeater renders a commit button that calls
   * `onAddCommit` (and collapses the row).
   */
  renderAddEditor?: ReactNode;
  onAddCommit?: () => void;
  addCommitDisabled?: boolean;
  addCommitLabel?: string;
  className?: string;
}

const ADD_KEY = '__add__';

export const Repeater = <T,>({
  items,
  getKey,
  renderSummary,
  renderEditor,
  onRemove,
  onAdd,
  addLabel,
  emptyLabel,
  maxItems,
  renderAddEditor,
  onAddCommit,
  addCommitDisabled,
  addCommitLabel = 'Add',
  className,
}: RepeaterProps<T>) => {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const toggle = (key: string) =>
    setExpandedKey((current) => (current === key ? null : key));

  const atMax = maxItems !== undefined && items.length >= maxItems;

  const expandTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.25, ease: 'easeInOut' as const };

  const renderExpanded = (key: string, content: ReactNode) => (
    <AnimatePresence initial={false}>
      {expandedKey === key && (
        <motion.div
          key="expanded"
          initial={reduceMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={expandTransition}
          style={{ overflow: 'hidden' }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('border-b border-border', className)}>
      {items.length === 0 && emptyLabel && (
        <p className="py-3 text-xs text-faint">{emptyLabel}</p>
      )}

      {items.map((item) => {
        const key = getKey(item);
        const isOpen = expandedKey === key;
        return (
          <div key={key} className="border-t border-border">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => toggle(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(key);
                }
              }}
              className="flex items-center gap-3 min-h-11 px-1 -mx-1 rounded-sm cursor-pointer select-none transition-colors hover:bg-sunken/50"
            >
              <div className="flex-1 min-w-0">{renderSummary(item)}</div>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item);
                  }}
                  aria-label="Remove row"
                  className="p-1.5 rounded-md text-faint hover:text-negative hover:bg-negative-soft transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                </button>
              )}
              <ChevronDown
                size={14}
                strokeWidth={1.8}
                aria-hidden="true"
                className={cn(
                  'text-muted transition-transform duration-200 shrink-0',
                  isOpen && 'rotate-180',
                )}
              />
            </div>
            {renderExpanded(
              key,
              <div className="px-1 pb-4 pt-1 sm:px-3">{renderEditor(item)}</div>,
            )}
          </div>
        );
      })}

      {!atMax &&
        (renderAddEditor !== undefined ? (
          <div className="border-t border-dashed border-border-strong">
            <button
              type="button"
              onClick={() => toggle(ADD_KEY)}
              aria-expanded={expandedKey === ADD_KEY}
              className={cn(
                'w-full flex items-center gap-2 min-h-11 px-1 text-xs font-medium text-muted',
                'cursor-pointer select-none transition-colors hover:text-ink hover:bg-sunken/40',
              )}
            >
              <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
              {addLabel}
            </button>
            {renderExpanded(
              ADD_KEY,
              <div className="px-1 pb-4 sm:px-3">
                {renderAddEditor}
                <div className="flex justify-end mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      onAddCommit?.();
                      setExpandedKey(null);
                    }}
                    disabled={addCommitDisabled}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>{addCommitLabel}</span>
                  </Button>
                </div>
              </div>,
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              'w-full flex items-center gap-2 min-h-11 px-1 border-t border-dashed border-border-strong',
              'text-xs font-medium text-muted cursor-pointer select-none transition-colors',
              'hover:text-ink hover:bg-sunken/40',
            )}
          >
            <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
            {addLabel}
          </button>
        ))}
    </div>
  );
};
