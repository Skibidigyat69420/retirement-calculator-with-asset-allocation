import { Badge } from './Badge';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export const SectionTitle = ({ title, subtitle, badge }: SectionTitleProps) => {
  return (
    <div className="mb-8">
      {badge && (
        <div className="mb-3">
          <Badge variant="gold">{badge}</Badge>
        </div>
      )}
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-serif text-navy">{title}</h2>
        <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-warm to-transparent" />
      </div>
      {subtitle && <p className="mt-2 text-stone-500 max-w-3xl text-sm md:text-base">{subtitle}</p>}
    </div>
  );
};
