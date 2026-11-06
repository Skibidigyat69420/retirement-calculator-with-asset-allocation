import { cn } from '../../lib/utils';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * SoundThesis Capital monogram — two ascending bars inside a hairline square.
 * Abstract "thesis/continuity" mark: a first position established, a second
 * rising above it. Token-driven (currentCol + accent/brass) so it works in
 * both themes and inverts on dark accents.
 */
export const LogoMark = ({ size = 28, className }: LogoMarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    aria-hidden="true"
    className={cn('shrink-0', className)}
  >
    {/* Hairline square */}
    <rect x="1" y="1" width="26" height="26" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
    {/* Baseline */}
    <line x1="7" y1="21" x2="21" y2="21" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
    {/* First bar — verdigris */}
    <rect x="8.5" y="14.5" width="3.6" height="6.5" fill="var(--color-accent)" />
    {/* Second, taller bar — ink */}
    <rect x="15" y="9" width="3.6" height="12" fill="currentColor" fillOpacity="0.9" />
    {/* Continuity point — one restrained direction of colour */}
    <rect x="15" y="5.5" width="3.6" height="1.6" fill="var(--color-accent)" />
  </svg>
);

/** 'SoundThesis Capital' wordmark. */
export const Wordmark = ({ subtitle, className }: { subtitle?: string; className?: string }) => (
  <span className={cn('flex flex-col leading-none min-w-0', className)}>
    <span className="font-display text-[15px] font-semibold tracking-tight text-ink whitespace-nowrap">SoundThesis Capital</span>
    {subtitle && <span className="text-[11px] text-muted tracking-wide mt-1">{subtitle}</span>}
  </span>
);

/** Full lockup — mark beside the wordmark. */
export const Lockup = ({ className }: { className?: string }) => (
  <span className={cn('flex items-center gap-2.5 text-ink', className)}>
    <LogoMark size={28} />
    <Wordmark />
  </span>
);
