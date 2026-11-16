import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ClipboardList, LoaderCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { RiskAssessment } from '../../../components/risk/RiskAssessment';
import { ClientRiskReport } from './ClientRiskReport';
import { isComplete, type RiskAnswers } from '../../../lib/riskQuestionnaire';
import {
  ApiRequestError,
  confirmPublicRiskAssessment,
  getPublicRiskAssessment,
  savePublicRiskAssessmentDraft,
  submitPublicRiskAssessment,
  type RiskAssessmentRecord,
} from '../../../lib/api';

type Screen = 'landing' | 'loading' | 'assessment' | 'report' | 'error';

/**
 * This is intentionally outside the signed-in practitioner workspace. A
 * client only needs the opaque link token and sees a risk-only experience.
 */
export function PublicRiskProfiler() {
  const { token = '' } = useParams();
  const [screen, setScreen] = useState<Screen>(token ? 'loading' : 'landing');
  const [assessment, setAssessment] = useState<RiskAssessmentRecord | null>(null);
  const [answers, setAnswers] = useState<RiskAnswers>({});
  const [answerDetails, setAnswerDetails] = useState<RiskAssessmentRecord['answerDetails']>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const savedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getPublicRiskAssessment(token)
      .then((record) => {
        if (!active) return;
        setAssessment(record);
        setAnswers(record.answers);
        setAnswerDetails(record.answerDetails ?? {});
        savedDraftRef.current = JSON.stringify(record.answers);
        setScreen(record.status === 'completed' && isComplete(record.answers) ? 'report' : 'assessment');
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof ApiRequestError ? cause.message : 'This questionnaire could not be opened.');
        setScreen('error');
      });
    return () => { active = false; };
  }, [token]);

  // Linked questionnaires are resumable: each partial response is saved back
  // to this private assessment, but it does not update the adviser plan until
  // the client explicitly completes the questionnaire.
  useEffect(() => {
    if (!token || !assessment || assessment.status !== 'invited' || screen !== 'assessment') return;
    const serialized = JSON.stringify(answers);
    if (savedDraftRef.current === serialized) return;
    const timer = window.setTimeout(() => {
      setSavingDraft(true);
      void savePublicRiskAssessmentDraft(token, answers, answerDetails)
        .then((record) => {
          savedDraftRef.current = JSON.stringify(record.answers);
          setAssessment(record);
        })
        .catch(() => {
          // The final submission remains available; avoid interrupting a
          // client who temporarily lost connectivity while answering.
        })
        .finally(() => setSavingDraft(false));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, answerDetails, assessment, screen, token]);

  const submit = async () => {
    if (!isComplete(answers) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const record = await submitPublicRiskAssessment(token, answers, answerDetails);
      setAssessment(record);
      setAnswers(record.answers);
        setAnswerDetails(record.answerDetails ?? {});
      setScreen('report');
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Your responses could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 border-b border-border pb-6 sm:mb-10">
          <div className="eyebrow mb-2">Sound Thesis</div>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">Risk profiler</h1>
          {assessment?.recipientName && <p className="mt-2 text-sm text-muted">Prepared for {assessment.recipientName}</p>}
        </header>

        {screen === 'loading' && (
          <div className="grid min-h-64 place-items-center text-sm text-muted"><span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin" /> Opening questionnaire…</span></div>
        )}

        {screen === 'landing' && (
          <section className="mx-auto max-w-xl rounded-xl border border-border bg-raised p-6 text-center sm:p-8">
            <ClipboardList className="mx-auto text-accent" size={30} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Your adviser will send your private link</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">The Risk Profiler is a short questionnaire about your financial comfort, capacity and experience. Open the individual link sent by your adviser to begin.</p>
          </section>
        )}

        {screen === 'error' && (
          <section className="mx-auto max-w-xl rounded-xl border border-negative/30 bg-raised p-6 text-center">
            <AlertCircle className="mx-auto text-negative" size={28} aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">Questionnaire unavailable</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
            <p className="mt-4 text-xs text-faint">Please ask your adviser to send a new secure link.</p>
          </section>
        )}

        {screen === 'assessment' && (
          <>
            <section className="mb-8 max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList size={17} className="text-accent" aria-hidden="true" /> A short, private questionnaire</div>
              <p className="mt-3 text-sm leading-relaxed text-muted">There are fourteen questions about your financial time horizon, ability to take risk, comfort with market changes and investing experience. Please answer based on your own circumstances. Your progress is saved automatically, so you can return to this link later.</p>
            </section>
            {error && <div className="mb-5 rounded-md border border-negative/30 bg-negative/5 px-4 py-3 text-sm text-negative">{error}</div>}
            <RiskAssessment
              riskAnswers={answers}
              setRiskAnswers={setAnswers}
              answerDetails={answerDetails}
              setAnswerDetails={setAnswerDetails}
              onLogDecision={() => undefined}
              onViewReport={() => void submit()}
              clientMode
            />
            {(submitting || savingDraft) && <div className="fixed inset-x-0 bottom-5 z-50 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">{submitting ? 'Submitting your responses…' : 'Saving your progress…'}</div>}
          </>
        )}

        {screen === 'report' && <><ClientRiskReport answers={answers} />{assessment?.workflowStatus && ['reviewed', 'applied'].includes(assessment.workflowStatus) && <ClientConfirmation token={token} confirmedAt={assessment.clientConfirmedAt} onConfirmed={(record) => setAssessment(record)} />}{assessment?.workflowStatus === 'submitted' && <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-border bg-raised p-4 text-sm text-muted">Your adviser has received your assessment and will review it before it is applied to your plan.</p>}</>}
      </div>
    </main>
  );
}

function ClientConfirmation({ token, confirmedAt, onConfirmed }: { token: string; confirmedAt: string | null; onConfirmed: (record: RiskAssessmentRecord) => void }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (confirmedAt) return <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-positive/30 bg-positive/5 p-4 text-sm text-positive">You confirmed this reviewed risk profile on {new Date(confirmedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.</p>;
  return <section className="mx-auto mt-6 max-w-2xl rounded-lg border border-accent/30 bg-accent-soft p-5"><h2 className="font-semibold text-ink">Your adviser has reviewed this profile</h2><p className="mt-1 text-sm text-muted">Please confirm that this reflects your current circumstances, or contact your adviser if it does not.</p>{error && <p className="mt-3 text-sm text-negative">{error}</p>}<button type="button" onClick={() => { setWorking(true); setError(null); void confirmPublicRiskAssessment(token).then(onConfirmed).catch((cause) => setError(cause instanceof ApiRequestError ? cause.message : 'Could not record your confirmation.')).finally(() => setWorking(false)); }} disabled={working} className="mt-4 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{working ? 'Confirming…' : 'Confirm this profile'}</button></section>;
}
