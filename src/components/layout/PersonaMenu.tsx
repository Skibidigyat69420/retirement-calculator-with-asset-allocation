import { useEffect, useRef, useState } from 'react';
import { FlaskConical, ChevronDown, Eraser } from 'lucide-react';
import { PERSONAS } from '../../lib/personas';
import { useCalculator } from '../../context/CalculatorContext';

/**
 * Sample-persona picker for the TopBar. Replaces the single "Load Sample"
 * quick action with a menu of fully-built demo workspaces plus a blank-state
 * escape hatch. Sample data stays strictly opt-in.
 */
export const PersonaMenu = () => {
  const { loadPersona, resetToDefaults } = useCalculator();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close on outside interaction and on Escape (mirrors the TopBar user menu).
  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Sample workspaces"
        title="Load a sample workspace"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-strong shadow-sm transition-all hover:-translate-y-px active:translate-y-0"
      >
        <FlaskConical size={14} strokeWidth={2} />
        <span className="text-[13px] font-semibold hidden sm:inline-block">Samples</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className="transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sample workspaces"
          className="absolute right-0 top-full mt-1.5 w-[22rem] max-w-[calc(100vw-2rem)] bg-raised border border-border rounded-md shadow-popover py-1.5 z-50"
        >
          <div className="px-3 pt-1.5 pb-1">
            <span className="eyebrow">Sample personas</span>
            <p className="mt-1 text-[11px] text-muted leading-snug">
              Fully-built demo workspaces — pick one to explore the planner.
            </p>
          </div>

          {PERSONAS.map((persona) => (
            <button
              key={persona.id}
              type="button"
              role="menuitem"
              onClick={() => {
                loadPersona(persona.id);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-sunken"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${persona.accent} text-[11px] font-semibold text-white`}
              >
                {persona.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink truncate">{persona.label}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted border border-border rounded-sm px-1 leading-[14px]">
                    {persona.lifeStage}
                  </span>
                  <span className="text-[10px] text-muted border border-border rounded-sm px-1 leading-[14px]">
                    {persona.riskStyle}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] text-muted leading-snug">{persona.tagline}</span>
                <span className="mt-0.5 block text-[11px] text-faint leading-snug line-clamp-2">
                  {persona.description}
                </span>
              </span>
            </button>
          ))}

          <div className="my-1.5 border-t border-border-subtle" role="separator" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              resetToDefaults();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-ink hover:bg-sunken transition-colors"
          >
            <Eraser size={15} strokeWidth={1.7} className="text-faint" />
            Blank workspace
          </button>
        </div>
      )}
    </div>
  );
};
