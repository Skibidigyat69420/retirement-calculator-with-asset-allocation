import { Card } from '../ui/Card';

interface CalculatorShellProps {
  title: string;
  description?: string;
  inputs: React.ReactNode;
  results: React.ReactNode;
  children?: React.ReactNode;
}

export const CalculatorShell = ({ title, description, inputs, results, children }: CalculatorShellProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-l-4 border-l-navy">
          <h3 className="text-lg font-serif text-navy mb-1">{title}</h3>
          {description && <p className="text-xs text-slate-700 mb-5">{description}</p>}
          <div className="space-y-4">{inputs}</div>
        </Card>
      </div>
      <div className="lg:col-span-8 space-y-6">
        {results}
        {children}
      </div>
    </div>
  );
};
