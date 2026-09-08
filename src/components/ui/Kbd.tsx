import React from 'react';
import { cn } from '../../lib/utils';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/** Keyboard shortcut chip, e.g. <Kbd>⌘</Kbd><Kbd>K</Kbd> (§103, §198). */
export const Kbd = ({ children, className, ...props }: KbdProps) => {
  return (
    <kbd
      {...props}
      className={cn(
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md',
        'bg-sunken border border-border border-b-2 border-b-border-strong',
        'font-mono text-[10px] font-semibold text-muted uppercase leading-none',
        className,
      )}
    >
      {children}
    </kbd>
  );
};

/** Formats a shortcut descriptor like "cmd+k" or "g c" into Kbd chips. */
export function shortcutToKbd(shortcut: string): React.ReactNode {
  return shortcut
    .split(/\s+/)
    .flatMap((combo, comboIndex) =>
      combo.split('+').map((key, keyIndex) => (
        <React.Fragment key={`${comboIndex}-${keyIndex}`}>
          <Kbd>{key === 'cmd' ? '⌘' : key === 'shift' ? '⇧' : key === 'alt' ? '⌥' : key}</Kbd>
          {keyIndex < combo.split('+').length - 1 && <span className="sr-only"> plus </span>}
        </React.Fragment>
      )),
    )
    .reduce<React.ReactNode[]>((acc, node, index) => {
      // Insert a visual gap between multi-key sequences ("G C").
      if (index > 0 && shortcut.includes(' ')) acc.push(<span key={`gap-${index}`} className="w-1" />);
      acc.push(node);
      return acc;
    }, []);
}
