import { Badge } from './Badge';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export const SectionTitle = ({ title, subtitle, badge }: SectionTitleProps) => {
  return (
    <div className="mb-6">
      {badge && (
        <div className="mb-3">
          <Badge variant="gold">{badge}</Badge>
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-serif text-navy">{title}</h2>
      {subtitle && <p className="mt-2 text-stone-500 max-w-3xl">{subtitle}</p>}
    </div>
  );
};
