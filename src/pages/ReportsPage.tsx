import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FilePlus2, Printer, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Alert } from '../components/ui/Alert';
import { ReportListTable, type ReportRecord } from '../components/reports/ReportListTable';
import { archiveReport, createReport, getReportDownloadUrl, listReports, updateReport } from '../lib/api';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const activeClientId = typeof window !== 'undefined' ? localStorage.getItem('stw.activeClientId') : null;

  const activeReports = useMemo(() => reports.filter((report) => report.status !== 'archived'), [reports]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listReports(activeClientId || undefined);
      setReports(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [activeClientId]);

  const generate = async (kind: 'dossier' | 'plan-report') => {
    if (!activeClientId) {
      setNotice('Open a client workspace before generating a report.');
      return;
    }
    setGenerating(true);
    setNotice(null);
    try {
      const report = await createReport(activeClientId, {
        kind,
        name: kind === 'dossier' ? 'Wealth Dossier' : 'Comprehensive Plan Report',
      });
      setReports((current) => [report, ...current]);
      if (kind === 'dossier') navigate(`/dossier?reportId=${encodeURIComponent(report.id)}&clientId=${encodeURIComponent(report.clientId)}`);
    } finally {
      setGenerating(false);
    }
  };

  const preview = (report: ReportRecord) => {
    navigate(`/dossier?reportId=${encodeURIComponent(report.id)}&clientId=${encodeURIComponent(report.clientId)}`);
  };

  const download = async (report: ReportRecord) => {
    const res = await getReportDownloadUrl(report.id);
    navigate(res.url);
  };

  const share = (report: ReportRecord) => {
    const url = `${window.location.origin}/dossier?reportId=${encodeURIComponent(report.id)}&clientId=${encodeURIComponent(report.clientId)}`;
    void navigator.clipboard?.writeText(url);
    setNotice('Report link copied for internal sharing.');
  };

  const approve = async (report: ReportRecord) => {
    const next = await updateReport(report.id, { status: 'approved' });
    setReports((current) => current.map((item) => (item.id === next.id ? next : item)));
  };

  const archive = async (report: ReportRecord) => {
    const next = await archiveReport(report.id);
    setReports((current) => current.map((item) => (item.id === next.id ? next : item)));
  };

  const restore = async (report: ReportRecord) => {
    const next = await updateReport(report.id, { status: 'review' });
    setReports((current) => current.map((item) => (item.id === next.id ? next : item)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Deliver"
        title="Reports & Dossier"
        description="Generate and manage client-ready plan reports and the 16:9 wealth dossier deck."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw size={15} /> Refresh
            </Button>
            <Button variant="outline" onClick={() => void generate('plan-report')} disabled={generating || !activeClientId}>
              <FilePlus2 size={15} /> Plan report
            </Button>
            <Button variant="primary" onClick={() => void generate('dossier')} disabled={generating || !activeClientId}>
              <Printer size={15} /> Dossier deck
            </Button>
          </div>
        }
      />

      {!activeClientId && (
        <Alert variant="warning">Open a client from the Client desk before generating reports.</Alert>
      )}
      {notice && <Alert variant="info">{notice}</Alert>}

      {loading ? (
        <ReportListTable reports={[]} generating onPreview={preview} onDownload={download} onShare={share} onApprove={approve} onArchive={archive} onRestore={restore} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No reports generated yet"
          description="Create a dossier deck or plan report for the active client. The dossier opens as a print-ready PDF deck."
          action={<Button variant="primary" onClick={() => void generate('dossier')} disabled={!activeClientId}>Generate dossier deck</Button>}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{activeReports.length} active report{activeReports.length === 1 ? '' : 's'}</span>
            <span>{reports.length - activeReports.length} archived</span>
          </div>
          <ReportListTable reports={reports} generating={generating} onPreview={preview} onDownload={download} onShare={share} onApprove={approve} onArchive={archive} onRestore={restore} />
        </div>
      )}
    </div>
  );
};
