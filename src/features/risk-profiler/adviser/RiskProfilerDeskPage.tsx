import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCopy, Download, Link2, RefreshCw, Shield, Upload, UserRound } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { RiskAssessment } from '../../../components/risk/RiskAssessment';
import { useCalculator } from '../../../context/CalculatorContext';
import { useAuth } from '../../../context/AuthContext';
import {
  ApiRequestError,
  createRiskAssessment,
  exportClientRiskProfile,
  importClientRiskProfile,
  listPracticeRiskProfiles,
  type AdviserRiskProfileRecord,
} from '../../../lib/api';
import { calculateRiskScore, getRiskProfile, isComplete } from '../../../lib/riskQuestionnaire';
import { riskProfilerLink } from '../riskProfilerLink';
import { setActiveCRMClient } from '../../../lib/crm';

/** Adviser-only control surface for the separate, client-facing Risk Profiler. */
export function RiskProfilerDesk() {
  const { user } = useAuth();
  const { inputs, riskAnswers, setRiskAnswers, refreshSharedRiskProfile, logDecision, showToast } = useCalculator();
  const [activeClientId, setActiveClientId] = useState<string | null>(() => localStorage.getItem('stw.activeClientId'));
  const [records, setRecords] = useState<AdviserRiskProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exportExpiresAt, setExportExpiresAt] = useState<string | null>(null);
  const [importCode, setImportCode] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listPracticeRiskProfiles();
      setRecords(response.data);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not load the risk-profile register.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const syncClient = () => setActiveClientId(localStorage.getItem('stw.activeClientId'));
    window.addEventListener('stw:active-client-changed', syncClient);
    return () => window.removeEventListener('stw:active-client-changed', syncClient);
  }, []);

  const createLink = async () => {
    if (!activeClientId || creating) return;
    setCreating(true);
    setError(null);
    try {
      const { accessToken } = await createRiskAssessment(activeClientId, {
        recipientName: inputs.client.name.trim() || undefined,
        initialAnswers: riskAnswers,
      });
      const url = riskProfilerLink(accessToken);
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        showToast('Risk-profiler link copied.', 'success');
      } catch {
        showToast('Risk-profiler link is ready to copy below.', 'info');
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not create the risk-profiler link.');
    } finally {
      setCreating(false);
    }
  };

  const exportProfile = async () => {
    if (!activeClientId || transferring) return;
    setTransferring(true);
    setError(null);
    try {
      const result = await exportClientRiskProfile(activeClientId);
      setExportCode(result.exportCode);
      setExportExpiresAt(result.expiresAt);
      try {
        await navigator.clipboard.writeText(result.exportCode);
        showToast('Portable risk-profile export copied.', 'success');
      } catch {
        showToast('Portable export is ready to copy below.', 'info');
      }
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not export the risk profile.');
    } finally {
      setTransferring(false);
    }
  };

  const importProfile = async () => {
    if (!activeClientId || !importCode.trim() || transferring) return;
    setTransferring(true);
    setError(null);
    try {
      await importClientRiskProfile(activeClientId, importCode);
      await refreshSharedRiskProfile();
      setImportCode('');
      await refresh();
      showToast('Risk profile imported into this household plan.', 'success');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Could not import that risk profile.');
    } finally {
      setTransferring(false);
    }
  };

  const activeClientName = inputs.client.name.trim() || 'the selected household';
  const summary = useMemo(() => ({
    completed: records.filter((record) => record.status === 'completed' && isComplete(record.answers)).length,
    awaiting: records.filter((record) => record.status === 'in_progress').length,
  }), [records]);

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        eyebrow="Separate client tool"
        title="Risk Profiler"
        description="A stand-alone client questionnaire and adviser register. Client links show only risk questions and a risk verdict; this desk maps every response back to its household."
        actions={<Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>}
      />

      <section className="grid gap-4 border-y border-border py-5 sm:grid-cols-3">
        <Metric label="Recorded profiles" value={String(summary.completed)} />
        <Metric label="Awaiting client" value={String(summary.awaiting)} />
        <Metric label="Selected household" value={activeClientId ? activeClientName : 'Choose a household'} />
      </section>

      <section className="rounded-xl border border-border bg-raised p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Shield size={17} className="text-accent" /> Adviser assessment</div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Use the same assessment with the client in the room. Each answer is saved to the same shared profile that a client link updates.</p>
          </div>
          {activeClientId && <Button variant="outline" onClick={() => setAssessmentMode((value) => !value)}>{assessmentMode ? 'Close assessment' : isComplete(riskAnswers) ? 'Review or edit' : 'Fill with client'}</Button>}
        </div>
        {!activeClientId && <p className="mt-4 text-sm text-muted">Select a household first to start its shared risk assessment.</p>}
        {assessmentMode && activeClientId && <div className="mt-6 border-t border-border pt-6"><RiskAssessment riskAnswers={riskAnswers} setRiskAnswers={setRiskAnswers} onLogDecision={logDecision} onViewReport={() => { setAssessmentMode(false); showToast('Shared risk profile saved.', 'success'); }} /></div>}
      </section>

      <section className="rounded-xl border border-border bg-raised p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Link2 size={17} className="text-accent" /> Client questionnaire link</div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Create a private link for {activeClientId ? activeClientName : 'a household selected in All households'}. Existing adviser answers are prefilled; the client can finish later because progress saves to this link. The completed submission updates the plan automatically.</p>
          </div>
          <Button onClick={() => void createLink()} disabled={!activeClientId || creating}><Link2 size={14} className="mr-1" />{creating ? 'Creating…' : 'Create link'}</Button>
        </div>
        {shareUrl && <div className="mt-5 rounded-md border border-accent/30 bg-accent-soft p-3"><div className="flex items-center gap-2 text-xs font-semibold text-ink"><ClipboardCopy size={14} /> Send this client link</div><input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-ink" aria-label="Client risk-profiler link" /></div>}
        {error && <p className="mt-4 text-sm text-negative">{error}</p>}
      </section>

      <section className="rounded-xl border border-border bg-raised p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Download size={17} className="text-accent" /> Portable import / export</div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Use this only when the profile needs to move between separate adviser workspaces. Export creates a signed, risk-only code with no client name or contact details; select the receiving household, then paste the code to import it into that plan.</p>
          </div>
          <Button variant="outline" onClick={() => void exportProfile()} disabled={!activeClientId || transferring || Object.keys(riskAnswers).length === 0}><Download size={14} className="mr-1" />{transferring ? 'Working…' : 'Export current profile'}</Button>
        </div>
        {exportCode && <div className="mt-5 rounded-md border border-accent/30 bg-accent-soft p-3"><div className="flex items-center gap-2 text-xs font-semibold text-ink"><ClipboardCopy size={14} /> Signed transfer code {exportExpiresAt ? `· valid until ${new Date(exportExpiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</div><textarea readOnly value={exportCode} onFocus={(event) => event.currentTarget.select()} className="mt-2 min-h-20 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-ink" aria-label="Portable risk-profile export code" /></div>}
        <div className="mt-5 border-t border-border pt-5">
          <label htmlFor="risk-profile-import" className="flex items-center gap-2 text-sm font-semibold text-ink"><Upload size={15} className="text-accent" /> Import into {activeClientId ? activeClientName : 'the selected household'}</label>
          <textarea id="risk-profile-import" value={importCode} onChange={(event) => setImportCode(event.target.value)} placeholder="Paste a signed risk-profile transfer code" className="mt-2 min-h-24 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-faint" disabled={!activeClientId || transferring} />
          <div className="mt-3 flex justify-end"><Button onClick={() => void importProfile()} disabled={!activeClientId || !importCode.trim() || transferring}><Upload size={14} className="mr-1" />{transferring ? 'Importing…' : 'Import into plan'}</Button></div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><div className="eyebrow mb-2">Adviser register</div><h2 className="text-xl font-semibold tracking-tight text-ink">Client mapping & risk verdicts</h2></div>
          <span className="text-xs text-muted">{records.length} record{records.length === 1 ? '' : 's'}</span>
        </div>
        {loading && records.length === 0 && <p className="rounded-lg border border-border p-5 text-sm text-muted">Loading risk profiles…</p>}
        {!loading && !error && records.length === 0 && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted">No profiles have been sent yet. Select a household, then create its first link.</p>}
        {records.length > 0 && <div className="overflow-hidden rounded-lg border border-border bg-raised"><div className="hidden grid-cols-[1.2fr_1fr_0.75fr_auto] gap-4 border-b border-border bg-sunken/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted md:grid"><span>Client</span><span>Risk verdict</span><span>Source / status</span><span /></div>{records.map((record) => <RiskProfileRow key={record.id} record={record} activeClientId={activeClientId} onSelectClient={() => setActiveCRMClient(record.clientId)} />)}</div>}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div><div className="mt-1 truncate text-sm font-semibold text-ink">{value}</div></div>;
}

function RiskProfileRow({ record, activeClientId, onSelectClient }: { record: AdviserRiskProfileRecord; activeClientId: string | null; onSelectClient: () => void }) {
  const completed = record.status === 'completed' && isComplete(record.answers);
  const score = completed ? (record.riskScore ?? calculateRiskScore(record.answers)) : null;
  const profile = score === null ? null : getRiskProfile(score);
  const verdict = record.riskVerdict ?? profile?.label ?? null;
  const date = new Date(completed ? record.completedAt || record.updatedAt : record.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return <div className="grid gap-3 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_0.75fr_auto] md:items-center md:gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><UserRound size={15} /></span><div className="min-w-0"><div className="truncate text-sm font-semibold text-ink">{record.clientName}</div><div className="text-xs text-muted">Updated {date}</div></div></div><div>{verdict ? <div><div className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Shield size={15} className="text-accent" />{verdict}</div><div className="mt-0.5 text-xs text-muted">Risk-o-meter {score}/100</div></div> : <span className="text-sm text-muted">Assessment in progress</span>}</div><div><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${completed ? 'bg-positive/10 text-positive' : 'bg-accent-soft text-accent-strong'}`}>{record.source === 'client' ? 'Client' : 'Advisor'} · {completed ? 'completed' : 'in progress'}</span></div><div>{record.clientId !== activeClientId && <Button variant="outline" size="sm" onClick={onSelectClient}>Select client</Button>}</div></div>;
}
