import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  FolderOpen,
  FlaskConical,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { navItems } from './navItems';
import { useCalculator } from '../../context/CalculatorContext';
import { useTheme } from '../../lib/theme';
import { formatDate } from '../../lib/formatters';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onRequestReset: () => void;
}

interface PaletteEntry {
  id: string;
  group: 'Plans' | 'Navigate' | 'Actions';
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  run: () => void;
}

const matches = (query: string, ...fields: (string | undefined)[]) =>
  fields.some((f) => f?.toLowerCase().includes(query));

export const CommandPalette = ({ open, onClose, onRequestReset }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { savedPlans, loadSavedPlan, loadDemoWorkspace } = useCalculator();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset transient state when the palette opens (render-time adjustment).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();

    const plans: PaletteEntry[] = savedPlans
      .filter((p) => !q || matches(q, p.name, 'plan'))
      .map((p) => ({
        id: `plan:${p.id}`,
        group: 'Plans',
        label: p.name,
        sublabel: p.updatedAt ? `Updated ${formatDate(p.updatedAt)}` : undefined,
        icon: FolderOpen,
        run: () => {
          void loadSavedPlan(p.id);
        },
      }));

    const navigateEntries: PaletteEntry[] = navItems
      .filter((item) => !q || matches(q, item.label, item.section, item.description))
      .map((item) => ({
        id: `nav:${item.path}`,
        group: 'Navigate',
        label: item.label,
        sublabel: q ? item.section : item.description,
        icon: item.icon,
        run: () => navigate(item.path),
      }));

    const themeOptions = [
      { value: 'light' as const, label: 'Switch to Light', icon: Sun },
      { value: 'dark' as const, label: 'Switch to Dark', icon: Moon },
      { value: 'system' as const, label: 'Switch to System', icon: Monitor },
    ].filter((o) => theme !== o.value);

    const actions: PaletteEntry[] = [
      {
        id: 'action:demo',
        group: 'Actions' as const,
        label: 'Load demo workspace',
        icon: FlaskConical,
        run: () => loadDemoWorkspace(),
      },
      {
        id: 'action:reset',
        group: 'Actions' as const,
        label: 'Reset workspace',
        icon: RotateCcw,
        run: () => onRequestReset(),
      },
      ...themeOptions.map(
        (o): PaletteEntry => ({
          id: `action:theme-${o.value}`,
          group: 'Actions',
          label: o.label,
          icon: o.icon,
          run: () => setTheme(o.value),
        }),
      ),
    ].filter((a) => !q || matches(q, a.label, 'action'));

    // Empty query: quiet defaults — a few navigate targets + all actions.
    if (!q) return [...navigateEntries.slice(0, 6), ...actions];
    return [...plans, ...navigateEntries, ...actions];
  }, [query, savedPlans, theme, navigate, loadSavedPlan, loadDemoWorkspace, setTheme, onRequestReset]);

  // Clamp the active row instead of resetting it in an effect.
  const clampedIndex = entries.length === 0 ? 0 : Math.min(activeIndex, entries.length - 1);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${clampedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [clampedIndex]);

  const select = (entry: PaletteEntry) => {
    entry.run();
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(Math.min(clampedIndex + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(clampedIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = entries[clampedIndex];
      if (entry) select(entry);
    }
  };

  const groups: PaletteEntry['group'][] = ['Plans', 'Navigate', 'Actions'];
  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4">
          <div
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-lg bg-raised border border-border rounded-lg shadow-popover overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3.5 border-b border-border-subtle">
              <Search size={14} strokeWidth={1.7} className="text-faint shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search plans, pages, actions…"
                aria-label="Search commands"
                className="flex-1 min-w-0 py-3 text-sm text-ink placeholder:text-faint bg-transparent outline-none border-none focus:outline-none focus-visible:outline-none"
              />
              <kbd className="text-[10px] text-muted border border-border rounded-sm px-1 font-mono shrink-0">
                esc
              </kbd>
            </div>

            <div ref={listRef} role="listbox" aria-label="Commands" className="max-h-[46vh] overflow-y-auto p-1.5">
              {entries.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted">No results</div>
              ) : (
                groups.map((group) => {
                  const items = entries.filter((e) => e.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="pt-1.5 first:pt-0">
                      <div className="px-2.5 pb-1">
                        <span className="eyebrow">{group}</span>
                      </div>
                      {items.map((entry) => {
                        flatIndex += 1;
                        const index = flatIndex;
                        const Icon = entry.icon;
                        const active = index === clampedIndex;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            data-index={index}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => select(entry)}
                            className={cn(
                              'flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors duration-100',
                              active ? 'bg-accent-soft' : 'text-ink',
                            )}
                          >
                            <Icon
                              size={15}
                              strokeWidth={1.7}
                              className={cn('shrink-0', active ? 'text-accent-strong' : 'text-faint')}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium text-ink truncate">{entry.label}</span>
                              {entry.sublabel && (
                                <span className="block text-[11px] text-muted truncate">{entry.sublabel}</span>
                              )}
                            </span>
                            {active && (
                              <CornerDownLeft size={12} strokeWidth={1.7} className="text-faint shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
