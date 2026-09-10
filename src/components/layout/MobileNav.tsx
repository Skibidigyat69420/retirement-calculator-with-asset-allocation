import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, PieChart, TrendingUp, BarChart3, Menu, X, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navItems, groupBySection, type NavItem } from './navItems';

const PRIMARY: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/master-plan', label: 'Plan', icon: PieChart },
  { path: '/allocation', label: 'Portfolio', icon: TrendingUp },
  { path: '/reports', label: 'Deliver', icon: BarChart3 },
];

const primaryPaths = new Set(PRIMARY.map((p) => p.path));
const remainingItems = navItems.filter((item) => !primaryPaths.has(item.path));

export const MobileNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    document.body.style.overflow = 'hidden';
    const t = requestAnimationFrame(() => closeRef.current?.focus());
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [moreOpen]);

  const isItemActive = (item: NavItem) => location.pathname === item.path;

  const ItemButton = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    return (
      <Link
        to={item.path}
        onClick={() => setMoreOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 min-h-10 px-3 rounded-md text-[13px] font-medium transition-colors',
          active ? 'bg-accent-soft text-ink' : 'text-muted hover:bg-sunken hover:text-ink',
        )}
      >
        <Icon size={16} strokeWidth={1.7} className={cn('shrink-0', active ? 'text-accent-strong' : 'text-faint')} />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Mobile"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-5">
          {PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-[10px] font-medium transition-colors"
                >
                  <Icon
                    size={19}
                    strokeWidth={1.7}
                    className={active ? 'text-accent-strong' : 'text-faint'}
                  />
                  <span className={active ? 'text-accent-strong' : 'text-muted'}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-label="More navigation"
              className="flex w-full flex-col items-center justify-center gap-1 min-h-14 py-2 text-[10px] font-medium text-muted transition-colors"
            >
              <Menu size={19} strokeWidth={1.7} className="text-faint" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-overlay backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              className="absolute inset-x-0 bottom-0 bg-surface border-t border-border rounded-t-xl shadow-popover max-h-[72vh] overflow-y-auto"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface border-b border-border-subtle">
                <span className="eyebrow">Navigate</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 min-h-11 min-w-11 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors"
                >
                  <X size={18} strokeWidth={1.7} />
                </button>
              </div>
              <div className="px-3 py-3">
                {groupBySection(remainingItems).map(([section, items]) => (
                  <div key={section} className="mt-3 first:mt-0">
                    <div className="px-3 mb-1">
                      <span className="eyebrow">{section}</span>
                    </div>
                    <ul className="space-y-px">
                      {items.map((item) => (
                        <li key={item.path}>
                          <ItemButton item={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
