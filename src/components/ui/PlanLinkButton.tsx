import { RefreshCw, Send } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface PlanLinkButtonProps {
  /** 'pull' loads the Master Plan values into the calculator; 'push' writes back. */
  mode: 'pull' | 'push';
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const PlanLinkButton = ({ mode, onClick, className, disabled }: PlanLinkButtonProps) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    variant={mode === 'pull' ? 'ghost' : 'outline'}
    className={cn('flex-1 text-xs', className)}
  >
    {mode === 'pull' ? (
      <RefreshCw size={13} strokeWidth={1.6} className="mr-1.5" aria-hidden="true" />
    ) : (
      <Send size={13} strokeWidth={1.6} className="mr-1.5" aria-hidden="true" />
    )}
    {mode === 'pull' ? 'Sync from Plan' : 'Apply to Plan'}
  </Button>
);
