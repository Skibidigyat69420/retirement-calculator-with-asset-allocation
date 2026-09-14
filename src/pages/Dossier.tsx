import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PlanReportBody } from '../components/reports/PlanReportBody';

export const Dossier = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { inputs, wealthResult } = useCalculator();

  const autoPrint = searchParams.get('autoPrint') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!wealthResult.isConfigured) {
    return (
      <EmptyState
        icon={FileText}
        display
        title="The dossier is not available yet"
        description="Configure the plan — profile, finances and goals — and the comprehensive portfolio dossier will compile here, ready for PDF export."
        action={
          <Button variant="outline" onClick={() => navigate('/plan-inputs')}>
            Configure the plan
          </Button>
        }
      />
    );
  }

  return (
    <div className="pb-8 print:pb-0">


      {/* Floating Action Bar (Hidden in Print) */}
      <div className="sticky top-0 z-40 glass-header px-4 py-3 flex items-center justify-between print:hidden -mx-1 px-5">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} strokeWidth={1.6} /> Back
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-ink">
              Master Plan Dossier — {inputs.client?.name || 'Client Report'}
            </h1>
            <p className="text-[11px] text-muted">
              Unified comprehensive report, compiled for high-resolution PDF export or print
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer size={14} strokeWidth={1.6} /> Save as PDF / Print
        </Button>
      </div>

      {/* Main Printable Container */}
      <div className="max-w-5xl mx-auto p-4 sm:p-8 print:p-0 space-y-8 print:space-y-6">
        
        {/* COVER HEADER */}
        <div className="relative overflow-hidden hero-orbit rounded-2xl border border-border shadow-elevated print:bg-white print:text-ink print:border-none print:shadow-none p-10 sm:p-16 print:p-0">
            <div className="flex items-start justify-between gap-4 mb-16">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brass text-on-inkfill flex items-center justify-center font-display text-lg shadow-sm">
                    ST
                  </div>
                  <span className="font-display text-3xl hero-title print:text-ink">Sound Thesis</span>
                </div>
                <p className="eyebrow mt-3 hero-kicker print:text-muted">Private Wealth & Advisory Mandate</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-faint hero-copy print:text-muted">Date: <span className="font-mono hero-title print:text-ink">{printDate}</span></p>
              </div>
            </div>

            <div className="my-10 space-y-4">
              <h1 className="font-display text-5xl sm:text-6xl hero-title print:text-ink leading-tight text-balance">
                {inputs.client?.name || 'Private Client'}
              </h1>
              <p className="text-[15px] hero-copy print:text-muted max-w-2xl leading-relaxed text-pretty">
                An institutional wealth plan connecting personal risk tolerance, capital assets, systematic accumulation,
                goal funding, and post-retirement withdrawal longevity into one comprehensive model.
              </p>
            </div>
        </div>

        {/* UNIFIED REPORT CONTENT */}
        <div className="bg-raised rounded-2xl border border-border p-8 print:border-none print:p-0 shadow-card">
          <PlanReportBody />
        </div>
      </div>
    </div>
  );
};
