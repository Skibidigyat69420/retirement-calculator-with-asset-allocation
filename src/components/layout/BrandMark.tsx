import { cn } from '../../lib/utils';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * SOUND THESIS monogram — two ascending bars inside a hairline square.
 * Abstract "thesis/continuity" mark: a first position established, a second
 * rising above it. Token-driven (currentColor + accent) so it works in both
 * themes and inverts on dark accents.
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
    {/* First bar */}
    <rect x="8.5" y="14.5" width="3.6" height="6.5" fill="var(--color-accent)" />
    {/* Second, taller bar */}
    <rect x="15" y="9" width="3.6" height="12" fill="currentColor" fillOpacity="0.9" />
    {/* Continuity point — the thesis mark */}
    <rect x="15" y="5.5" width="3.6" height="1.6" fill="var(--color-brass)" />
  </svg>
);

/** 'Sound Thesis' wordmark with a quiet WEALTH eyebrow. */
export const Wordmark = ({ eyebrow = true, className }: { eyebrow?: boolean; className?: string }) => (
  <span className={cn('flex flex-col leading-none min-w-0', className)}>
    <span className="font-semibold tracking-tight text-ink text-[15px] whitespace-nowrap">Sound Thesis</span>
    {eyebrow && <span className="eyebrow mt-1">Wealth</span>}
  </span>
);

/** Full lockup — mark beside the wordmark. */
export const Lockup = ({ className }: { className?: string }) => (
  <span className={cn('flex items-center gap-2.5 text-ink', className)}>
    <LogoMark size={28} />
    <Wordmark />
  </span>
);
