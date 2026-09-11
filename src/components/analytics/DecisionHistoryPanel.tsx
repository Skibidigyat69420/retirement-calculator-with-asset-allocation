import { useState } from 'react';
import {
  ArrowRight,
  Download,
  MoreHorizontal,
  NotebookPen,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Badge, type BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Drawer } from '../ui/Drawer';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCalculator } from '../../context/CalculatorContext';
import type { DecisionLogEntry } from '../../types';

const CATEGORY_TONE: Record<DecisionLogEntry['category'], BadgeTone> = {
  retirement: 'brass',
  allocation: 'accent',
  sip: 'positive',
  swp: 'info',
  goal: 'info',
  risk: 'warning',
  scenario: 'neutral',
  mvo: 'brass',
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'allocation', label: 'Asset Allocation' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'sip', label: 'SIP / Cashflow' },
  { value: 'swp', label: 'SWP / Drawdown' },
  { value: 'goal', label: 'Goal Funding' },
  { value: 'risk', label: 'Risk Profile' },
  { value: 'mvo', label: 'MVO Optimizer' },
];

/** '15 SEP 2026' — the notebook's dated editorial record eyebrow. */
const notebookDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(date)
    .toUpperCase();
};

export const DecisionHistoryPanel = () => {
  const { decisionHistory, revertDecision, clearDecisionHistory, logDecision, showToast } = useCalculator();

  const [addOpen, setAddOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [revertTarget, setRevertTarget] = useState<DecisionLogEntry | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState<DecisionLogEntry['category']>('allocation');
  const [newRationale, setNewRationale] = useState('');
  const [newOldVal, setNewOldVal] = useState('');
  const [newNewVal, setNewNewVal] = useState('');

  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Please provide a decision title.', 'warning');
      return;
    }
    logDecision({
      category: newCategory,
      actionTitle: newTitle,
      summary: newSummary || newTitle,
      previousValue: newOldVal,
      newValue: newNewVal,
      rationale: newRationale,
      author: 'Advisor',
    });
    showToast('Decision recorded in audit trail.', 'success');
    setAddOpen(false);
    setNewTitle('');
    setNewSummary('');
    setNewRationale('');
    setNewOldVal('');
    setNewNewVal('');
  };

  const handleExport = () => {
    const csvContent = [
      'Date,Category,Action,Summary,Previous,New,Rationale,Author',
      ...decisionHistory.map(
        (d) =>
          `"${d.dateFormatted}","${d.category}","${d.actionTitle}","${d.summary.replace(/"/g, '""')}","${d.previousValue || ''}","${d.newValue}","${d.rationale.replace(/"/g, '""')}","${d.author}"`,
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sound_thesis_decision_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Decision history exported to CSV.', 'success');
  };

  const handleRevert = () => {
    if (!revertTarget) return;
    revertDecision(revertTarget.id);
    showToast(`Reverted decision: ${revertTarget.actionTitle}`, 'info');
    setRevertTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">Investment notebook</h3>
          {decisionHistory.length > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-faint">
              {decisionHistory.length} {decisionHistory.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={decisionHistory.length === 0}>
            <Download size={13} strokeWidth={1.6} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={13} strokeWidth={1.6} /> Log decision
          </Button>
        </div>
      </div>

      {decisionHistory.length === 0 ? (
        <EmptyState
          eyebrow="Audit Trail"
          title="No decisions recorded yet."
          description="Plan updates, allocation changes, and scenario approvals you log will appear here as a dated, reversible record of the advisory reasoning."
          icon={NotebookPen}
          action={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={13} strokeWidth={1.6} /> Log first decision
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-raised shadow-card">
          <ol className="divide-y divide-border">
            {decisionHistory.map((entry) => (
              <li key={entry.id} className="relative px-5 md:px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Date eyebrow + category */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="eyebrow">{notebookDate(entry.timestamp) || entry.dateFormatted}</span>
                      <Badge tone={CATEGORY_TONE[entry.category]}>{entry.category}</Badge>
                      <span className="text-[11px] text-faint">by {entry.author}</span>
                    </div>

                    {/* The change */}
                    <h4 className="mt-2 text-sm font-semibold tracking-tight text-ink">{entry.actionTitle}</h4>

                    {(entry.previousValue || entry.newValue) && (
                      <p className="mt-1 font-mono text-[13px] tabular-nums flex items-center gap-2 flex-wrap">
                        {entry.previousValue && (
                          <span className="text-faint line-through decoration-border-strong">{entry.previousValue}</span>
                        )}
                        {entry.previousValue && <ArrowRight size={12} strokeWidth={1.6} className="text-faint" aria-hidden="true" />}
                        {entry.newValue ? (
                          <span className="text-ink font-medium">{entry.newValue}</span>
                        ) : (
                          entry.previousValue && <span className="text-faint">—</span>
                        )}
                      </p>
                    )}

                    {/* Impact line */}
                    {entry.summary && entry.summary !== entry.actionTitle && (
                      <p className="mt-2 text-xs text-accent-strong font-medium">{entry.summary}</p>
                    )}

                    {/* Reason */}
                    {entry.rationale && (
                      <p className="mt-2 text-xs text-muted leading-relaxed max-w-prose text-pretty">
                        {entry.rationale}
                      </p>
                    )}
                  </div>

                  {/* Entry actions */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label={`Options for decision: ${entry.actionTitle}`}
                      aria-expanded={menuOpenId === entry.id}
                      onClick={() => setMenuOpenId(menuOpenId === entry.id ? null : entry.id)}
                      className="p-1.5 rounded-md text-faint hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
                    >
                      <MoreHorizontal size={15} strokeWidth={1.6} />
                    </button>
                    {menuOpenId === entry.id && (
                      <>
                        <button
                          type="button"
                          aria-label="Close menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-raised shadow-popover py-1">
                          {entry.revertPatch && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                setRevertTarget(entry);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-soft hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                            >
                              <RotateCcw size={12} strokeWidth={1.6} /> Revert this decision
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setClearConfirmOpen(true);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-negative hover:bg-negative-soft transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} strokeWidth={1.6} /> Clear audit history
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Log decision drawer */}
      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="Record advisory decision" width={460}>
        <form onSubmit={handleCreateDecision} className="space-y-4">
          <Input
            label="Decision title"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Retirement age revised after career review"
          />
          <Select
            label="Category"
            value={newCategory}
            onChange={(v) => setNewCategory(v as DecisionLogEntry['category'])}
            options={CATEGORY_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Previous value"
              value={newOldVal}
              onChange={(e) => setNewOldVal(e.target.value)}
              placeholder="e.g. 55"
            />
            <Input
              label="New value"
              value={newNewVal}
              onChange={(e) => setNewNewVal(e.target.value)}
              placeholder="e.g. 57"
            />
          </div>
          <Input
            label="Impact line"
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="e.g. +₹62L projected resilience"
            helper="A short measurable consequence shown on the notebook entry."
          />
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted" htmlFor="decision-rationale">
              Advisory rationale
            </label>
            <textarea
              id="decision-rationale"
              rows={4}
              value={newRationale}
              onChange={(e) => setNewRationale(e.target.value)}
              placeholder="Why was this change recommended — risk tolerance, stress tests, goal priority…"
              className="w-full px-3 py-2.5 bg-surface border border-border rounded-md text-sm text-ink placeholder:text-faint resize-none leading-relaxed focus:border-accent focus:ring-2 focus:ring-accent-soft focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save to audit trail
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Revert confirmation */}
      <ConfirmDialog
        open={revertTarget !== null}
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
        title="Revert this decision?"
        description={
          revertTarget
            ? `“${revertTarget.actionTitle}” will be rolled back and removed from the notebook. This cannot be undone.`
            : undefined
        }
        confirmLabel="Revert decision"
        danger
      />

      {/* Clear history confirmation */}
      <ConfirmDialog
        open={clearConfirmOpen}
        onConfirm={() => {
          clearDecisionHistory();
          setClearConfirmOpen(false);
          showToast('Decision audit trail cleared.', 'info');
        }}
        onCancel={() => setClearConfirmOpen(false)}
        title="Clear the audit history?"
        description="Every recorded decision will be permanently removed from the notebook. This cannot be undone."
        confirmLabel="Clear history"
        danger
      />
    </div>
  );
};
