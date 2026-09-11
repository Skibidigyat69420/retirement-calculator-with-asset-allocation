import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, FileText, Printer, Share2, TriangleAlert } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SaveIndicator } from '../components/ui/SaveIndicator';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SectionHeader } from '../components/ui/SectionHeader';
import { ReportListTable, type ReportRecord, type ReportStatus } from '../components/reports/ReportListTable';
import { PlanReportBody } from '../components/reports/PlanReportBody';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { planStatus } from '../lib/planState';

const REPORTS_STORAGE_KEY = 'soundthesis_reports_v1';

const loadReports = (): ReportRecord[] => {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReportRecord[]) : [];
  } catch {
    return [];
  }
};

export const Reports = () => {
  const navigate = useNavigate();
  const { inputs, wealthResult, showToast } = useCalculator();

  const [reports, setReports] = useState<ReportRecord[]>(loadReports);
  const [generating, setGenerating] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ReportRecord | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // storage unavailable — list lives for the session
    }
  }, [reports]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const status = planStatus(inputs);
  const planReady = status === 'ready-for-review';

  const updateReport = useCallback((id: string, patch: Partial<ReportRecord>) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const handleGenerate = () => {
    setNotice(null);
    if (!planReady) {
      setNotice('Generate a planning report after the plan is ready — profile, finances and at least one goal are required.');
      showToast('The plan is not ready for reporting yet.', 'info');
      return;
    }
    if (generating) return;
    setGenerating(true);
    setSaveState('saving');
    // Report assembly is a local composition step over the computed plan.
    timerRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      const clientName = inputs.client?.name || 'Private Client';
      const nextVersion =
        reports.reduce((max, r) => Math.max(max, r.version), 0) + 1;
      const stamp = Date.now();
      setReports((prev) => [
        {
          id: `pr-${stamp}`,
          kind: 'plan-report',
          name: 'Comprehensive Plan Report',
          clientName,
          version: nextVersion,
          createdAt: now,
          status: 'draft',
        },
        {
          id: `do-${stamp}`,
          kind: 'dossier',
          name: 'Portfolio Dossier',
          clientName,
          version: nextVersion,
          createdAt: now,
          status: 'draft',
        },
        ...prev,
      ]);
      setGenerating(false);
      setSaveState('saved');
      showToast('Reports generated and added to the deliverables list.', 'success');
      timerRef.current = setTimeout(() => setSaveState('idle'), 2500);
    }, 900);
  };

  const handlePreview = (r: ReportRecord) => {
    if (r.status === 'archived') {
      showToast('Archived reports are read-only. Restore to preview.', 'info');
      return;
    }
    if (r.kind === 'dossier') {
      navigate('/dossier');
      return;
    }
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = (r: ReportRecord) => {
    if (r.status === 'archived') {
      showToast('Archived reports are read-only. Restore to download.', 'info');
      return;
    }
    if (r.kind === 'dossier') {
      navigate('/dossier?autoPrint=true');
      return;
    }
    window.print();
  };

  const handleShare = async (r: ReportRecord) => {
    if (r.status === 'archived') {
      showToast('Archived reports cannot be shared.', 'info');
      return;
    }
    const url = `${window.location.origin}/dossier`;
    try {
      if (navigator.share) {
        await navigator.share({ title: r.name, text: `${r.name} — ${r.clientName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Dossier link copied to clipboard.', 'success');
      }
      if (r.status === 'draft') updateReport(r.id, { status: 'review' satisfies ReportStatus });
    } catch {
      // share sheet dismissed — no state change
    }
  };

  const handleApprove = (r: ReportRecord) => {
    updateReport(r.id, { status: 'approved' });
    showToast(`${r.name} marked as approved.`, 'success');
  };

  const handleArchive = (r: ReportRecord) => setArchiveTarget(r);

  const handleRestore = (r: ReportRecord) => {
    updateReport(r.id, { status: 'draft' });
    showToast(`${r.name} restored to draft.`, 'success');
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    updateReport(archiveTarget.id, { status: 'archived' });
    showToast(`${archiveTarget.name} archived.`, 'info');
    setArchiveTarget(null);
  };

  return (
    <div className="pb-10">
      <style>{`
        @media print {
          aside, header, footer, nav, .print-hidden { display: none !important; }
          .page-break { break-after: page !important; page-break-after: always !important; }
          .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      <div className="print:hidden">
        <PageHeader
          eyebrow="CLIENT REPORTS"
          title="Client Reports"
          description="Create, review and deliver polished planning outputs."
          variant="hero"
          actions={
            <>
              <SaveIndicator status={saveState} />
              <Button onClick={handleGenerate} disabled={generating}>
                <FilePlus2 size={15} strokeWidth={1.6} />
                {generating ? 'Generating…' : 'Generate report'}
              </Button>
            </>
          }
        />
      </div>

      {notice && (
        <div
          className="print:hidden mb-5 flex items-start gap-2.5 text-[13px] text-warning bg-warning-soft border border-warning/25 rounded-md px-3.5 py-2.5"
          role="status"
        >
          <TriangleAlert size={15} strokeWidth={1.6} className="shrink-0 mt-0.5" />
          {notice}
        </div>
      )}

      {/* Deliverables list */}
      <section className="print:hidden" aria-label="Report deliverables">
        {reports.length === 0 && !generating ? (
          <EmptyState
            icon={FileText}
            display
            title="No reports yet"
            description="Generate a planning report after the plan is ready."
            action={
              <Button onClick={handleGenerate} variant="outline">
                <FilePlus2 size={15} strokeWidth={1.6} />
                Generate report
              </Button>
            }
          />
        ) : (
          <ReportListTable
            reports={reports}
            generating={generating}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onShare={handleShare}
            onApprove={handleApprove}
            onArchive={handleArchive}
            onRestore={handleRestore}
          />
        )}
      </section>

      {/* Live plan report preview — only rendered once the plan is configured */}
      <div ref={previewRef} className="scroll-mt-6 mt-10 print:mt-0 print-hidden-anchor">
        <div className="print:hidden">
          <SectionHeader
            title="Plan report preview"
            description="Live view of the comprehensive plan report. Numbers update as the plan changes."
            hairline
            action={
              wealthResult.isConfigured ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/dossier?autoPrint=true')}>
                    <Share2 size={13} strokeWidth={1.6} />
                    Export Full Dossier (PDF)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer size={13} strokeWidth={1.6} />
                    Print
                  </Button>
                </div>
              ) : undefined
            }
          />
        </div>
        {wealthResult.isConfigured ? (
          <PlanReportBody />
        ) : (
          <EmptyState
            icon={FileText}
            title="Report preview is not available yet"
            description="Configure the plan — profile, finances and goals — and the comprehensive plan report will render here."
          />
        )}
      </div>

      <div className="print:hidden mt-10">
        <WorkflowFooter
          prev={{ path: '/advanced-portfolio', label: 'Portfolio Lab' }}
          next={{ path: '/ips', label: 'IPS' }}
          flowHint="Executive plan summaries, tax analyses, and Monte Carlo curves feed into your institutional Investment Policy Statement."
        />
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
        title="Archive this report?"
        description={archiveTarget ? `"${archiveTarget.name}" will be marked archived and hidden from active deliverables. You can restore it later.` : undefined}
        confirmLabel="Archive"
      />
    </div>
  );
};
