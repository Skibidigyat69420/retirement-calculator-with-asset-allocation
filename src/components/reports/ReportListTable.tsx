import { useEffect, useRef, useState } from 'react';
import { Eye, Download, Share2, Archive, Check, MoreHorizontal, RotateCcw, FileText, BookOpen } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

export type ReportStatus = 'draft' | 'review' | 'approved' | 'archived';

export interface ReportRecord {
  id: string;
  kind: 'plan-report' | 'dossier';
  name: string;
  clientName: string;
  version: number;
  createdAt: string;
  status: ReportStatus;
}

interface RowMenuProps {
  report: ReportRecord;
  onPreview: (r: ReportRecord) => void;
  onDownload: (r: ReportRecord) => void;
  onShare: (r: ReportRecord) => void;
  onApprove: (r: ReportRecord) => void;
  onArchive: (r: ReportRecord) => void;
  onRestore: (r: ReportRecord) => void;
}

const menuItem =
  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-soft hover:bg-sunken hover:text-ink transition-colors text-left';

function RowMenu({ report, onPreview, onDownload, onShare, onApprove, onArchive, onRestore }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const archived = report.status === 'archived';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${report.name}`}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-sunken transition-colors"
      >
        <MoreHorizontal size={16} strokeWidth={1.6} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-44 bg-raised border border-border rounded-md shadow-popover py-1 z-30"
        >
          <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onPreview(report); }}>
            <Eye size={13} strokeWidth={1.6} /> Preview
          </button>
          <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onDownload(report); }}>
            <Download size={13} strokeWidth={1.6} /> Download
          </button>
          <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onShare(report); }}>
            <Share2 size={13} strokeWidth={1.6} /> Share
          </button>
          {!archived && report.status === 'review' && (
            <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onApprove(report); }}>
              <Check size={13} strokeWidth={1.6} /> Approve
            </button>
          )}
          {!archived ? (
            <button
              type="button"
              role="menuitem"
              className={cn(menuItem, 'text-negative hover:text-negative')}
              onClick={() => { setOpen(false); onArchive(report); }}
            >
              <Archive size={13} strokeWidth={1.6} /> Archive
            </button>
          ) : (
            <button type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); onRestore(report); }}>
              <RotateCcw size={13} strokeWidth={1.6} /> Restore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ReportListTableProps {
  reports: ReportRecord[];
  generating: boolean;
  onPreview: (r: ReportRecord) => void;
  onDownload: (r: ReportRecord) => void;
  onShare: (r: ReportRecord) => void;
  onApprove: (r: ReportRecord) => void;
  onArchive: (r: ReportRecord) => void;
  onRestore: (r: ReportRecord) => void;
}

/** Elegant hairline table of deliverable reports. */
export const ReportListTable = ({
  reports,
  generating,
  onPreview,
  onDownload,
  onShare,
  onApprove,
  onArchive,
  onRestore,
}: ReportListTableProps) => {
  return (
    <div className="border border-border rounded-lg bg-raised overflow-hidden">
      <div className="overflow-x-auto" role="region" aria-label="Reports table" tabIndex={0}>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-sunken/60">
              <th className="text-left py-3 pl-5 pr-4 eyebrow font-medium">Report</th>
              <th className="text-left py-3 pr-4 eyebrow font-medium">Client</th>
              <th className="text-left py-3 pr-4 eyebrow font-medium">Version</th>
              <th className="text-left py-3 pr-4 eyebrow font-medium">Created</th>
              <th className="text-left py-3 pr-4 eyebrow font-medium">Status</th>
              <th className="w-12" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {reports.map((r) => (
              <tr key={r.id} className="group hover:bg-surface transition-colors">
                <td className="py-3.5 pl-5 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 p-1.5 rounded-md border border-border-subtle bg-sunken text-muted">
                      {r.kind === 'dossier' ? <BookOpen size={14} strokeWidth={1.6} /> : <FileText size={14} strokeWidth={1.6} />}
                    </span>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onPreview(r)}
                        className="font-medium text-ink hover:text-accent-strong transition-colors truncate max-w-[260px] block text-left"
                      >
                        {r.name}
                      </button>
                      <span className="text-[11px] text-faint capitalize">{r.kind === 'dossier' ? 'PDF dossier' : 'Plan report'}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-muted text-[13px] whitespace-nowrap">{r.clientName || '—'}</td>
                <td className="py-3.5 pr-4 font-mono tabular-nums text-[13px] text-ink-soft">v{r.version}</td>
                <td className="py-3.5 pr-4 font-mono tabular-nums text-[13px] text-muted whitespace-nowrap">
                  {formatDate(r.createdAt)}
                </td>
                <td className="py-3.5 pr-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3.5 pr-3">
                  <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex justify-end">
                    <RowMenu
                      report={r}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      onShare={onShare}
                      onApprove={onApprove}
                      onArchive={onArchive}
                      onRestore={onRestore}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {generating &&
              [0, 1].map((i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  <td colSpan={6} className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-sunken animate-shimmer" />
                      <div className="flex-1 space-y-2">
                        <div className="h-2.5 w-2/5 rounded bg-sunken animate-shimmer" />
                        <div className="h-2 w-1/4 rounded bg-sunken animate-shimmer" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
