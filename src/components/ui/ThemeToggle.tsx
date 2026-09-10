import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme, type ThemePreference } from '../../lib/theme';

interface ThemeToggleProps {
  /** 'segmented' shows Light/Dark/System; 'icon' cycles through all three. */
  variant?: 'segmented' | 'icon';
  className?: string;
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Persistent Light / Dark / System theme control. */
export const ThemeToggle = ({ variant = 'segmented', className }: ThemeToggleProps) => {
  const { theme, resolved, setTheme } = useTheme();

  if (variant === 'icon') {
    const currentIndex = OPTIONS.findIndex((o) => o.value === theme);
    const next = OPTIONS[(currentIndex + 1) % OPTIONS.length];
    const ActiveIcon = OPTIONS.find((o) => o.value === (theme === 'system' ? resolved : theme))?.icon ?? Sun;
    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        title={`Theme: ${theme}. Switch to ${next.label}`}
        aria-label={`Theme: ${theme}. Switch to ${next.label}`}
        className={cn(
          'p-2 min-h-9 min-w-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors',
          className,
        )}
      >
        <ActiveIcon size={16} strokeWidth={1.6} />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-sunken',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            title={label}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-[5px] text-[11px] font-medium transition-all duration-150',
              active
                ? 'bg-raised text-ink shadow-card'
                : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={13} strokeWidth={1.6} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
