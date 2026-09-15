import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, Save, FileDown, Activity, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCalculator } from '../context/CalculatorContext';
import { planStatus } from '../lib/planState';
import { SaveIndicator } from '../components/ui/SaveIndicator';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PlanningAssumptionsModal } from '../components/analytics/PlanningAssumptionsModal';
import { MasterPlanSidebar, PLAN_STEPS } from '../components/master-plan/MasterPlanSidebar';
import { MasterPlanSummary } from '../components/master-plan/MasterPlanSummary';
import { ProfileStep } from '../components/master-plan/ProfileStep';
import { FinancialsStep } from '../components/master-plan/FinancialsStep';
import { CashflowsStep } from '../components/master-plan/CashflowsStep';
import { GoalsStep } from '../components/master-plan/GoalsStep';
import { RiskStep } from '../components/master-plan/RiskStep';
import { AssumptionsStep } from '../components/master-plan/AssumptionsStep';
import { ResultsStep } from '../components/master-plan/ResultsStep';
import type { MasterPlanInputs } from '../types';
import type { WealthEngineResult } from '../lib/wealthEngine';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface OutlookDockProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
  totalLiabilities: number;
  netBalanceSheet: number;
  debtToAssetRatio: number;
  hasRiskAnswers?: boolean;
  onSavePlan: () => Promise<void>;
  onViewDetails: () => void;
}

/** Floating outlook dock — collapsible replacement for the old right rail. */
const OutlookDock = ({
  inputs,
  wealthResult,
  totalLiabilities,
  netBalanceSheet,
  debtToAssetRatio,
  hasRiskAnswers,
  onSavePlan,
  onViewDetails,
}: OutlookDockProps) => {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-20 right-4 z-40 xl:bottom-[4.5rem] xl:right-6 flex flex-col items-end"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-14 right-0 w-[min(340px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface shadow-popover"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-surface/95 backdrop-blur">
              <span className="eyebrow">Plan outlook</span>
              <button
                type="button"
                onClick={close}
                aria-label="Close plan outlook"
                className="p-1 rounded-md text-faint hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
              >
                <X size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              <MasterPlanSummary
                inputs={inputs}
                wealthResult={wealthResult}
                totalLiabilities={totalLiabilities}
                netBalanceSheet={netBalanceSheet}
                debtToAssetRatio={debtToAssetRatio}
                hasRiskAnswers={hasRiskAnswers}
                onSavePlan={onSavePlan}
                onViewDetails={onViewDetails}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close plan outlook' : 'Open plan outlook'}
        className="w-12 h-12 rounded-full bg-accent text-on-inkfill border border-accent shadow-popover flex items-center justify-center cursor-pointer transition-colors hover:bg-accent-strong hover:border-accent-strong"
      >
        {open ? (
          <X size={18} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Activity size={18} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export const MasterPlan = ({ defaultStep = 'profile' }: { defaultStep?: string }) => {
  const {
    inputs,
    updateInputs,
    updateClient,
    addAsset,
    removeAsset,
    updateAsset,
    updateLiability,
    addLiability,
    removeLiability,
    updateSIP,
    updateSTP,
    updateSWP,
    addGoal,
    updateGoal,
    removeGoal,
    wealthResult,
    riskProfile,
    riskScore,
    hasRiskAnswers,
    showToast,
    assumptionMode,
    setAssumptionMode,
    activeAssumptionSourceLabel,
    saveCurrentPlan,
    manualTargets,
    setManualTargets,
  } = useCalculator();

  const [searchParams, setSearchParams] = useSearchParams();
  const rawParam = searchParams.get('step') || searchParams.get('tab') || defaultStep;
  const initialStep = rawParam === 'assets' || rawParam === 'loans' ? 'financials' : rawParam;
  const [activeStep, setActiveStep] = useState(initialStep);

  useEffect(() => {
    const current = searchParams.get('step') || searchParams.get('tab');
    if (current) {
      const normalized = current === 'assets' || current === 'loans' ? 'financials' : current;
      setActiveStep(normalized);
    }
  }, [searchParams]);

  const handleStepChange = (newStep: string) => {
    setActiveStep(newStep);
    setSearchParams({ step: newStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [isAssumptionsModalOpen, setIsAssumptionsModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const totalLiabilities = useMemo(() => (inputs.liabilities || []).reduce((sum, liability) => sum + (Number(liability.principal) || 0), 0), [inputs.liabilities]);
  const netBalanceSheet = wealthResult.netWorth - totalLiabilities;
  const debtToAssetRatio = wealthResult.netWorth > 0 ? (totalLiabilities / wealthResult.netWorth) * 100 : 0;

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await saveCurrentPlan();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleDeleteAsset = (id: string) => {
    const assetToRemove = inputs.assets.find((a) => a.id === id);
    removeAsset(id);
    showToast(`Removed asset "${assetToRemove?.name || 'Asset'}"`, 'info');
  };

  const handleDeleteGoal = (id: string) => {
    const goalToRemove = inputs.goals.find((g) => g.id === id);
    removeGoal(id);
    showToast(`Removed goal "${goalToRemove?.name || 'Goal'}"`, 'info');
  };

  const activeStepMeta = PLAN_STEPS.find((s) => s.id === activeStep);
  const stepIndicator = activeStepMeta
    ? `Step ${Number(activeStepMeta.stepNumber)} / ${PLAN_STEPS.length} — ${activeStepMeta.label}`
    : undefined;

  return (
    <div className="pb-8">
      {/* Studio header — editable plan title, save state, plan status */}
      <header className="border-b border-border pb-5 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow">Planning studio · {activeStep === 'profile' ? 'Client profile' : activeStep === 'financials' ? 'Balance sheet' : 'Master plan'}</span>
              <StatusBadge status={planStatus(inputs)} />
            </div>
            <input
              type="text"
              value={inputs.client?.name || ''}
              onChange={(e) => updateClient({ name: e.target.value })}
              placeholder="Untitled plan — client name"
              aria-label="Plan title (client name)"
              className="mt-2 w-full max-w-xl bg-transparent border-b border-transparent hover:border-border focus:border-accent focus:outline-none font-display text-3xl sm:text-4xl text-ink placeholder:text-faint transition-colors rounded-none pb-1"
            />
            <p className="mt-2 text-sm text-muted max-w-prose leading-relaxed">
              {activeStep === 'profile' ? 'Capture the person, household context, and planning horizon.' : activeStep === 'financials' ? 'Record assets, property, liabilities, and the household net position.' : 'Build the decision record from cashflow through outlook.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <SaveIndicator status={saveStatus} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssumptionsModalOpen(true)}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span>Assumptions</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              <Save size={14} aria-hidden="true" />
              <span>{saveStatus === 'saving' ? 'Saving…' : 'Save plan'}</span>
            </Button>
            <Link
              to="/dossier?autoPrint=true"
              className="inline-flex items-center gap-1.5 px-3 min-h-8 py-1.5 text-xs font-medium rounded-md border border-border-strong text-ink hover:border-ink hover:bg-surface transition-colors"
            >
              <FileDown size={14} aria-hidden="true" />
              <span className="hidden md:inline">Export Dossier</span>
              <span className="md:hidden">Export</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Studio layout: rail · active section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10 items-start">
        {/* Left: vertical progress rail */}
        <aside className="lg:col-span-3 xl:col-span-2 lg:sticky lg:top-20 z-10">
          <MasterPlanSidebar
            activeStep={activeStep}
            onSelectStep={handleStepChange}
            inputs={inputs}
          />
        </aside>

        {/* Center: active section */}
        <main className="lg:col-span-9 xl:col-span-10 min-w-0">
          {activeStep === 'profile' && (
            <ProfileStep
              inputs={inputs}
              updateInputs={updateInputs}
              updateClient={updateClient}
            />
          )}

          {activeStep === 'financials' && (
            <FinancialsStep
              inputs={inputs}
              liabilities={inputs.liabilities}
              updateAsset={updateAsset}
              updateLiability={updateLiability}
              onAddLiability={addLiability}
              onRemoveLiability={removeLiability}
              onAddAsset={addAsset}
              onRemoveAsset={handleDeleteAsset}
            />
          )}

          {activeStep === 'cashflows' && (
            <CashflowsStep
              inputs={inputs}
              updateInputs={updateInputs}
              updateClient={updateClient}
              updateSIP={updateSIP}
              updateSTP={updateSTP}
              updateSWP={updateSWP}
            />
          )}

          {activeStep === 'goals' && (
            <GoalsStep
              inputs={inputs}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onRemoveGoal={handleDeleteGoal}
            />
          )}

          {activeStep === 'risk' && (
            <RiskStep
              inputs={inputs}
              riskProfile={riskProfile}
              riskScore={riskScore}
              hasRiskAnswers={hasRiskAnswers}
              manualTargets={manualTargets}
              setManualTargets={setManualTargets}
            />
          )}

          {activeStep === 'assumptions' && (
            <AssumptionsStep
              inputs={inputs}
              updateInputs={updateInputs}
              assumptionMode={assumptionMode}
              setAssumptionMode={setAssumptionMode}
              activeAssumptionSourceLabel={activeAssumptionSourceLabel}
            />
          )}

          {activeStep === 'results' && (
            <ResultsStep
              inputs={inputs}
              wealthResult={wealthResult}
              riskProfile={riskProfile}
            />
          )}
        </main>
      </div>

      {/* Assumptions Calibration Modal */}
      <PlanningAssumptionsModal
        isOpen={isAssumptionsModalOpen}
        onClose={() => setIsAssumptionsModalOpen(false)}
      />

      {/* Floating plan outlook */}
      <OutlookDock
        inputs={inputs}
        wealthResult={wealthResult}
        totalLiabilities={totalLiabilities}
        netBalanceSheet={netBalanceSheet}
        debtToAssetRatio={debtToAssetRatio}
        hasRiskAnswers={hasRiskAnswers}
        onSavePlan={handleSave}
        onViewDetails={() => handleStepChange('results')}
      />

      {/* Sticky workflow action bar — the single nav system */}
      <WorkflowFooter
        prev={activeStep === 'profile'
          ? undefined
          : activeStep === 'financials'
            ? { path: '/master-plan?step=profile', label: 'Profile' }
            : activeStep === 'cashflows'
              ? { path: '/master-plan?step=financials', label: 'Balance Sheet' }
              : activeStep === 'goals'
                ? { path: '/master-plan?step=cashflows', label: 'Cashflows' }
                : activeStep === 'risk'
                  ? { path: '/master-plan?step=goals', label: 'Goals' }
                  : activeStep === 'assumptions'
                    ? { path: '/master-plan?step=risk', label: 'Risk Profile' }
                    : activeStep === 'results'
                      ? { path: '/master-plan?step=assumptions', label: 'Assumptions' }
                      : undefined
        }
        next={activeStep === 'profile'
          ? { path: '/master-plan?step=financials', label: 'Balance Sheet' }
          : activeStep === 'financials'
            ? { path: '/master-plan?step=cashflows', label: 'Cashflows' }
            : activeStep === 'cashflows'
              ? { path: '/master-plan?step=goals', label: 'Goals' }
              : activeStep === 'goals'
                ? { path: '/master-plan?step=risk', label: 'Risk Profile' }
                : activeStep === 'risk'
                  ? { path: '/master-plan?step=assumptions', label: 'Assumptions' }
                  : activeStep === 'assumptions'
                    ? { path: '/master-plan?step=results', label: 'Results & Outlook' }
                    : { path: '/dossier', label: 'View Dossier' }
        }
        stepIndicator={stepIndicator}
      />
    </div>
  );
};
