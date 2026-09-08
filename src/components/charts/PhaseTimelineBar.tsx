import { cn } from '../../lib/utils';

interface PhaseTimelineBarProps {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  depletionAge: number | null;
  ariaLabel?: string;
}

/**
 * Horizontal phase timeline: accumulation → funded distribution → unfunded gap
 * (if the corpus depletes before life expectancy). Purely div-based so it
 * prints reliably and needs no chart library.
 */
export const PhaseTimelineBar = ({
  currentAge,
  retirementAge,
  lifeExpectancy,
  depletionAge,
  ariaLabel,
}: PhaseTimelineBarProps) => {
  const span = Math.max(1, lifeExpectancy - currentAge);
  const accYears = Math.max(0, retirementAge - currentAge);
  const sustainable = depletionAge === null || depletionAge > lifeExpectancy;
  const depletion = sustainable ? null : Math.min(depletionAge ?? lifeExpectancy, lifeExpectancy);
  const fundedYears = sustainable ? lifeExpectancy - retirementAge : Math.max(0, (depletion ?? retirementAge) - retirementAge);
  const gapYears = sustainable ? 0 : Math.max(0, lifeExpectancy - (depletion ?? lifeExpectancy));

  const accPct = (accYears / span) * 100;
  const fundedPct = (fundedYears / span) * 100;
  const gapPct = (gapYears / span) * 100;

  const description =
    `Plan phases over ${span} years: ${accYears} years of accumulation to age ${retirementAge}, then ` +
    (sustainable
      ? `${fundedYears} years of fully funded retirement withdrawals through age ${lifeExpectancy}.`
      : `${fundedYears} years of funded retirement until the corpus depletes at age ${depletion}, leaving ${gapYears} unfunded years to age ${lifeExpectancy}.`);

  return (
    <div role="img" aria-label={ariaLabel ?? description}>
      <span className="sr-only">{description}</span>

      <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-faint mb-1.5">
        <span>Age {currentAge}</span>
        <span className="text-ink">Age {retirementAge} · Retire</span>
        {!sustainable && depletion !== null && (
          <span className="text-negative font-bold">Age {depletion} · Depleted</span>
        )}
        <span>Age {lifeExpectancy}</span>
      </div>

      <div className="w-full h-5 bg-sunken rounded-full overflow-hidden flex border border-border">
        <div
          className="bg-ink h-full flex items-center justify-center min-w-0"
          style={{ width: `${Math.max(0, accPct)}%` }}
        >
          {accPct > 14 && (
            <span className="text-[10px] font-bold truncate px-2" style={{ color: 'var(--color-background)' }}>
              Accumulation · {accYears}y
            </span>
          )}
        </div>
        <div
          className={cn('h-full flex items-center justify-center min-w-0', fundedYears > 0 ? 'bg-positive' : 'bg-transparent')}
          style={{ width: `${Math.max(0, fundedPct)}%` }}
        >
          {fundedPct > 16 && (
            <span className="text-[10px] font-bold text-white truncate px-2">Funded SWP · {fundedYears}y</span>
          )}
        </div>
        {gapPct > 0 && (
          <div
            className="bg-negative h-full flex items-center justify-center min-w-0"
            style={{ width: `${Math.max(0, gapPct)}%` }}
          >
            {gapPct > 12 && (
              <span className="text-[10px] font-bold text-white truncate px-2">Gap · {gapYears}y</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted mt-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-ink inline-block" aria-hidden="true" />
          Accumulation ({accYears} yrs)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-positive inline-block" aria-hidden="true" />
          Funded distribution ({fundedYears} yrs)
        </span>
        {gapYears > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-negative font-semibold">
            <span className="w-2.5 h-2.5 rounded-xs bg-negative inline-block" aria-hidden="true" />
            Unfunded shortfall ({gapYears} yrs)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-positive font-semibold">
            Corpus outlasts life expectancy
          </span>
        )}
      </div>
    </div>
  );
};
