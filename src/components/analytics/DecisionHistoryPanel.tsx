import { useState } from 'react';
import {
  History,
  RotateCcw,
  Plus,
  FileSpreadsheet,
  Trash2,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useCalculator } from '../../context/CalculatorContext';
import type { DecisionLogEntry } from '../../types';

export const DecisionHistoryPanel = () => {
  const { decisionHistory, revertDecision, clearDecisionHistory, logDecision, showToast } = useCalculator();

  const [addModalOpen, setAddModalOpen] = useState(false);
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
      author: 'Adviser',
    });
    showToast('Decision recorded in audit trail.', 'success');
    setAddModalOpen(false);
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

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-900 text-white rounded-lg">
                <History size={18} />
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-900 tracking-tight">
                Plan Decision History &amp; Audit Trail
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                Governance Trail
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Immutable chronological record of strategic calibration decisions, rationale, asset rebalancing events, and client approvals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button size="sm" variant="outline" onClick={handleExport} className="text-xs h-8 px-3">
              <FileSpreadsheet size={13} className="mr-1" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 px-3">
              <Plus size={13} className="mr-1" /> Log Decision
            </Button>
          </div>
        </div>

        {decisionHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No decisions recorded in the audit trail yet. Plan updates, MVO applications, and scenario decisions will appear here automatically.
          </div>
        ) : (
          <div className="space-y-3">
            {decisionHistory.map((entry) => {
              let badgeVariant: 'navy' | 'gold' | 'success' | 'warning' | 'default' = 'navy';
              if (entry.category === 'retirement') badgeVariant = 'gold';
              else if (entry.category === 'sip') badgeVariant = 'success';
              else if (entry.category === 'mvo') badgeVariant = 'warning';

              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    entry.reverted
                      ? 'bg-slate-50/50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Calendar size={11} /> {entry.dateFormatted}
                      </span>
                      <Badge variant={badgeVariant} className="text-[9px] uppercase font-mono">
                        {entry.category}
                      </Badge>
                      <span className="text-[10px] text-slate-400">· by {entry.author}</span>
                      {entry.reverted && (
                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200">
                          Reverted
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {entry.actionTitle}
                    </h4>

                    <p className="text-xs text-slate-700 leading-snug">
                      {entry.summary}
                    </p>

                    {entry.rationale && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                        <strong className="text-slate-800 font-semibold">Advisory Rationale:</strong> {entry.rationale}
                      </div>
                    )}

                    {(entry.previousValue || entry.newValue) && (
                      <div className="flex items-center gap-2 text-xs font-mono pt-1">
                        {entry.previousValue && (
                          <span className="text-slate-400 line-through">{entry.previousValue}</span>
                        )}
                        {entry.previousValue && <ArrowRight size={12} className="text-slate-400" />}
                        <span className="font-bold text-slate-900">{entry.newValue}</span>
                      </div>
                    )}
                  </div>

                  {entry.revertPatch && !entry.reverted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        revertDecision(entry.id);
                        showToast(`Reverted decision: ${entry.actionTitle}`, 'info');
                      }}
                      className="text-[11px] h-7 px-2.5 text-slate-600 hover:text-rose-600 shrink-0 self-start"
                    >
                      <RotateCcw size={12} className="mr-1" /> Revert
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {decisionHistory.length > 0 && (
          <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>{decisionHistory.length} total recorded decision milestones</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to clear the audit history?')) {
                  clearDecisionHistory();
                  showToast('Decision audit trail cleared.', 'info');
                }
              }}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
            >
              <Trash2 size={11} /> Clear Audit History
            </button>
          </div>
        )}
      </Card>

      {/* Manual Entry Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <form
            onSubmit={handleCreateDecision}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-slate-800" />
                Record Advisory Decision
              </h3>
              <button type="button" onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs">
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Decision Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Equity allocation rebalanced 70% -> 65%"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
                >
                  <option value="allocation">Asset Allocation</option>
                  <option value="retirement">Retirement</option>
                  <option value="sip">SIP / Cashflow</option>
                  <option value="swp">SWP / Drawdown</option>
                  <option value="goal">Goal Funding</option>
                  <option value="risk">Risk Profile</option>
                  <option value="mvo">MVO Optimizer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  New Value / State
                </label>
                <input
                  type="text"
                  value={newNewVal}
                  onChange={(e) => setNewNewVal(e.target.value)}
                  placeholder="e.g. 65% Equity"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Advisory Rationale / Justification
              </label>
              <textarea
                rows={3}
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                placeholder="Explain why this change was recommended based on risk tolerance, stress tests, or goal priority..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                Save to Audit Trail
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
