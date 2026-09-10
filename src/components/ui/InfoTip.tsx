import { HelpCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface InfoTipProps {
  content: string;
  side?: 'top' | 'bottom';
}

/** Small "?" affordance that reveals a plain-language explanation on hover/focus. */
export const InfoTip = ({ content, side = 'top' }: InfoTipProps) => {
  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        aria-label={content}
        className="inline-flex items-center justify-center p-0.5 rounded-full text-faint hover:text-muted hover:bg-sunken transition-colors cursor-pointer align-middle"
      >
        <HelpCircle size={12} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </Tooltip>
  );
};
