import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { shortcutToKbd } from './Kbd';

export interface CommandPaletteItem {
  id: string;
  /** Primary label, e.g. "Raj Sharma" or "Create client". */
  label: string;
  /** Group heading, e.g. "Clients" / "Actions" / "Navigation". */
  group: string;
  /** Extra match text: aliases, plan names, tags. */
  keywords?: string;
  /** Secondary line, e.g. "₹6.84Cr · 82% health · Retirement 2033". */
  hint?: string;
  /** Display-only shortcut, e.g. "N" or "G C" (§198). */
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Search index to fuzzy-filter (§122). */
  items: CommandPaletteItem[];
  /** Placeholder text, e.g. "Find a client or run a command…". */
  placeholder?: string;
  /** Global hotkey that opens the palette, default ⌘K / Ctrl-K (§103). */
  hotkey?: string;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * Subsequence fuzzy score: consecutive runs and word-prefix starts score
 * higher. Returns -1 when the query does not match.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return 0;
  let score = 0;
  let lastIndex = -1;
  let streak = 0;
  for (const char of q) {
    const index = t.indexOf(char, lastIndex + 1);
    if (index === -1) return -1;
    streak = index === lastIndex + 1 ? streak + 1 : 0;
    score += 1 + streak * 2 + (index === 0 || /\s/.test(t[index - 1] ?? ' ') ? 3 : 0);
    lastIndex = index;
  }
  return score - t.length * 0.01; // prefer shorter labels
}

function isHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const needsMod = parts.includes('cmd') || parts.includes('ctrl');
  const mod = event.metaKey || event.ctrlKey;
  return mod === needsMod && event.key.toLowerCase() === key;
}

/**
 * Command palette (§103, §122, §198): ⌘K opens; fuzzy search over the
 * provided index; ↑/↓ navigate, ↵ selects, ESC closes; items render in
 * groups with hint lines and shortcut chips.
 */
export const CommandPalette = ({
  open,
  onClose,
  items,
  placeholder = 'Find a client or run a command…',
  hotkey = 'cmd+k',
  onOpenChange,
  className,
}: CommandPaletteProps) => {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global hotkey — listen even while closed.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isHotkey(event, hotkey) && !open) {
        event.preventDefault();
        onOpenChange?.(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hotkey, open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const scored = items
      .map((item) => {
        const labelScore = fuzzyScore(query, item.label);
        const keywordScore = query ? fuzzyScore(query, item.keywords ?? '') : 0;
        const best = Math.max(labelScore, keywordScore - 0.5);
        return { item, score: best };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.item);
  }, [items, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = useCallback(
    (item: CommandPaletteItem) => {
      if (item.disabled) return;
      onClose();
      item.onSelect();
    },
    [onClose],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) select(item);
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, CommandPaletteItem[]>();
    for (const item of results) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
        order.push(item.group);
      }
      map.get(item.group)?.push(item);
    }
    return order.map((name) => ({ name, items: map.get(name) ?? [] }));
  }, [results]);

  let flatIndex = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-start justify-center pt-[12vh] px-4">
          <motion.button
            type="button"
            aria-label="Close command palette"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-overlay cursor-pointer"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full max-w-xl bg-surface border border-border rounded-2xl shadow-popover overflow-hidden',
              className,
            )}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 px-4 border-b border-border">
              <Search size={16} className="text-muted shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                aria-label="Search commands and clients"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-results"
                aria-activedescendant={
                  results[activeIndex] ? `command-item-${results[activeIndex].id}` : undefined
                }
                className="flex-1 py-3.5 bg-transparent text-sm text-ink placeholder:text-faint outline-none"
              />
              <span className="flex items-center gap-1 shrink-0">{shortcutToKbd('esc')}</span>
            </div>

            <div
              ref={listRef}
              id="command-palette-results"
              role="listbox"
              aria-label="Results"
              className="max-h-[46vh] overflow-y-auto p-2"
            >
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  No matches for “{query}”. Try a client name or a command.
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.name} className="mb-1">
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      {group.name}
                    </div>
                    {group.items.map((item) => {
                      flatIndex += 1;
                      const index = flatIndex;
                      const active = index === activeIndex;
                      return (
                        <button
                          key={item.id}
                          id={`command-item-${item.id}`}
                          type="button"
                          data-index={index}
                          role="option"
                          aria-selected={active}
                          disabled={item.disabled}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => select(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100 cursor-pointer',
                            active ? 'bg-sunken' : 'bg-transparent',
                            item.disabled && 'opacity-40 pointer-events-none',
                          )}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-ink truncate">{item.label}</span>
                            {item.hint && (
                              <span className="block text-xs text-muted truncate tabular-nums">{item.hint}</span>
                            )}
                          </span>
                          {item.shortcut && <span className="flex items-center gap-0.5 shrink-0">{shortcutToKbd(item.shortcut)}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                {shortcutToKbd('↑')} {shortcutToKbd('↓')} navigate
              </span>
              <span className="inline-flex items-center gap-1">{shortcutToKbd('↵')} select</span>
              <span className="inline-flex items-center gap-1">{shortcutToKbd('esc')} close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
