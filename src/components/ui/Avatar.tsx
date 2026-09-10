import { cn } from '../../lib/utils';

export interface AvatarProps {
  name: string;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

/** Deterministic token-safe tones, picked by hashing id || name. */
const tones = [
  'bg-accent-soft text-accent-strong',
  'bg-brass-soft text-brass-strong',
  'bg-info-soft text-info',
  'bg-positive-soft text-positive',
  'bg-warning-soft text-warning',
] as const;

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const Avatar = ({ name, id, size = 'md' }: AvatarProps) => {
  const tone = tones[hashString(id || name) % tones.length];
  return (
    <span
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold font-mono uppercase select-none',
        sizeStyles[size],
        tone,
      )}
    >
      {initials(name)}
    </span>
  );
};
