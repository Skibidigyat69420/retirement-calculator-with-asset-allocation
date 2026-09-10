import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  FileEdit,
  Eye,
  Check,
  Archive,
  Circle,
  Play,
  ClipboardCheck,
  Activity,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type Status =
  | 'on-track'
  | 'needs-review'
  | 'at-risk'
  | 'incomplete'
  | 'stale'
  | 'saved'
  | 'saving'
  | 'error'
  | 'draft'
  | 'review'
  | 'approved'
  | 'archived'
  | 'not-started'
  | 'in-progress'
  | 'ready-for-review'
  | 'active';

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const config: Record<Status, StatusConfig> = {
  'on-track': { label: 'On track', icon: CheckCircle2, className: 'bg-positive-soft text-positive border-positive/25' },
  'needs-review': { label: 'Needs review', icon: AlertTriangle, className: 'bg-warning-soft text-warning border-warning/25' },
  'at-risk': { label: 'At risk', icon: AlertTriangle, className: 'bg-negative-soft text-negative border-negative/25' },
  incomplete: { label: 'Incomplete', icon: CircleDashed, className: 'bg-sunken text-muted border-border' },
  stale: { label: 'Stale', icon: Clock, className: 'bg-sunken text-faint border-border' },
  saved: { label: 'Saved', icon: Save, className: 'bg-positive-soft text-positive border-positive/25' },
  saving: { label: 'Saving…', icon: Loader2, className: 'bg-info-soft text-info border-info/25' },
  error: { label: 'Error', icon: AlertCircle, className: 'bg-negative-soft text-negative border-negative/25' },
  draft: { label: 'Draft', icon: FileEdit, className: 'bg-sunken text-ink-soft border-border' },
  review: { label: 'In review', icon: Eye, className: 'bg-info-soft text-info border-info/25' },
  approved: { label: 'Approved', icon: Check, className: 'bg-positive-soft text-positive border-positive/25' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-sunken text-faint border-border' },
  'not-started': { label: 'Not started', icon: Circle, className: 'bg-sunken text-muted border-border' },
  'in-progress': { label: 'In progress', icon: Play, className: 'bg-info-soft text-info border-info/25' },
  'ready-for-review': { label: 'Ready for review', icon: ClipboardCheck, className: 'bg-brass-soft text-brass-strong border-brass/25' },
  active: { label: 'Active', icon: Activity, className: 'bg-accent-soft text-accent-strong border-accent/25' },
};

export interface StatusBadgeProps {
  status: Status;
  className?: string;
}

/** Status chip with icon + label — never color alone. */
export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const { label, icon: Icon, className: toneClass } = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-[3px] rounded-sm border font-mono text-[10px] font-medium uppercase tracking-[0.08em] leading-none',
        toneClass,
        className,
      )}
    >
      <Icon size={11} strokeWidth={1.8} aria-hidden="true" className={status === 'saving' ? 'animate-spin' : undefined} />
      {label}
    </span>
  );
};
