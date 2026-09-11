import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, Save, FileDown } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { planStatus } from '../lib/planState';
import { SaveIndicator } from '../components/ui/SaveIndicator';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { PlanningAssumptionsModal } from '../components/analytics/PlanningAssumptionsModal';
import { MasterPlanSidebar } from '../components/master-plan/MasterPlanSidebar';
import { MasterPlanSummary } from '../components/master-plan/MasterPlanSummary';
import { ProfileStep } from '../components/master-plan/ProfileStep';
import { FinancialsStep, type LoanLiability } from '../components/master-plan/FinancialsStep';
import { CashflowsStep } from '../components/master-plan/CashflowsStep';
import { GoalsStep } from '../components/master-plan/GoalsStep';
import { RiskStep } from '../components/master-plan/RiskStep';
import { AssumptionsStep } from '../components/master-plan/AssumptionsStep';
import { ResultsStep } from '../components/master-plan/ResultsStep';
import { calculateEMI } from '../lib/calculators';

const LOANS_STORAGE_KEY = 'soundthesis_master_plan_loans';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const MasterPlan = () => {
  const {
    inputs,
    updateInputs,
    updateClient,
    addAsset,
    removeAsset,
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
  const rawParam = searchParams.get('step') || searchParams.get('tab') || 'profile';
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

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await saveCurrentPlan();
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  // Dedicated Loan Liabilities state, synced reactively with monthly expenditure and localStorage
  const [loans, setLoans] = useState<LoanLiability[]>(() => {
    try {
      const saved = localStorage.getItem(LOANS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
    } catch {
      // ignore
    }
  }, [loans]);

  // Compute amortized values for each loan
  const activeLoansWithEMI = useMemo(() => {
    return loans.map((loan) => {
      const p = Math.max(0, Number(loan.principal) || 0);
      const r = Math.max(0, Number(loan.rate) || 0);
      const t = Math.max(1, Number(loan.tenureYears) || 1);
      const res = p > 0 ? calculateEMI(p, r, t) : { emi: 0, totalPayment: 0, totalInterest: 0, principal: 0, yearlyData: [] };
      return {
        ...loan,
        emi: res.emi,
        totalPayment: res.totalPayment,
        totalInterest: res.totalInterest,
      };
    });
  }, [loans]);

  const totalLiabilities = useMemo(() => {
    return loans.reduce((sum, loan) => sum + (Number(loan.principal) || 0), 0);
  }, [loans]);

  const netBalanceSheet = useMemo(() => {
    return wealthResult.netWorth - totalLiabilities;
  }, [wealthResult.netWorth, totalLiabilities]);

  const debtToAssetRatio = useMemo(() => {
    if (wealthResult.netWorth <= 0) return totalLiabilities > 0 ? 100 : 0;
    return (totalLiabilities / wealthResult.netWorth) * 100;
  }, [totalLiabilities, wealthResult.netWorth]);

  const handleUpdateLoans = (newLoans: LoanLiability[]) => {
    const oldActiveEMI = activeLoansWithEMI.filter((l) => l.includeInExpenses).reduce((s, l) => s + l.emi, 0);
    setLoans(newLoans);

    const newActiveEMI = newLoans
      .filter((l) => l.includeInExpenses)
      .reduce((sum, l) => {
        const p = Math.max(0, Number(l.principal) || 0);
        const r = Math.max(0, Number(l.rate) || 0);
        const t = Math.max(1, Number(l.tenureYears) || 1);
        return sum + (p > 0 ? calculateEMI(p, r, t).emi : 0);
      }, 0);

    const currentBase = Math.max(0, inputs.monthlyExpenditure - Math.round(oldActiveEMI));
    updateInputs({ monthlyExpenditure: currentBase + Math.round(newActiveEMI) });
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

  return (
    <div className="pb-8">
      {/* Studio header — editable plan title, save state, plan status */}
      <header className="border-b border-border pb-5 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow">Master Plan · Planning Studio</span>
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
              Demographics, balance sheet, cashflows, and stochastic projections — composed as one editorial plan.
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

      {/* Studio layout: rail · active section · outlook */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10 items-start">
        {/* Left: vertical progress rail */}
        <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 z-10">
          <MasterPlanSidebar
            activeStep={activeStep}
            onSelectStep={handleStepChange}
            inputs={inputs}
          />
        </aside>

        {/* Center: active section */}
        <main className="lg:col-span-8 xl:col-span-6 min-w-0">
          {activeStep === 'profile' && (
            <ProfileStep
              inputs={inputs}
              updateInputs={updateInputs}
              updateClient={updateClient}
              onNext={() => handleStepChange('financials')}
            />
          )}

          {activeStep === 'financials' && (
            <FinancialsStep
              inputs={inputs}
              loans={loans}
              onUpdateLoans={handleUpdateLoans}
              onAddAsset={addAsset}
              onRemoveAsset={handleDeleteAsset}
              onNext={() => handleStepChange('cashflows')}
              onBack={() => handleStepChange('profile')}
            />
          )}

          {activeStep === 'cashflows' && (
            <CashflowsStep
              inputs={inputs}
              updateInputs={updateInputs}
              updateSIP={updateSIP}
              updateSTP={updateSTP}
              updateSWP={updateSWP}
              onNext={() => handleStepChange('goals')}
              onBack={() => handleStepChange('financials')}
            />
          )}

          {activeStep === 'goals' && (
            <GoalsStep
              inputs={inputs}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onRemoveGoal={handleDeleteGoal}
              onNext={() => handleStepChange('risk')}
              onBack={() => handleStepChange('cashflows')}
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
              onNext={() => handleStepChange('assumptions')}
              onBack={() => handleStepChange('goals')}
            />
          )}

          {activeStep === 'assumptions' && (
            <AssumptionsStep
              inputs={inputs}
              updateInputs={updateInputs}
              assumptionMode={assumptionMode}
              setAssumptionMode={setAssumptionMode}
              activeAssumptionSourceLabel={activeAssumptionSourceLabel}
              onNext={() => handleStepChange('results')}
              onBack={() => handleStepChange('risk')}
            />
          )}

          {activeStep === 'results' && (
            <ResultsStep
              inputs={inputs}
              wealthResult={wealthResult}
              riskProfile={riskProfile}
              onBack={() => handleStepChange('assumptions')}
            />
          )}
        </main>

        {/* Right: persistent plan outlook (desktop xl+) */}
        <aside className="hidden xl:block xl:col-span-3 xl:sticky xl:top-20 z-10">
          <MasterPlanSummary
            inputs={inputs}
            wealthResult={wealthResult}
            totalLiabilities={totalLiabilities}
            netBalanceSheet={netBalanceSheet}
            debtToAssetRatio={debtToAssetRatio}
            hasRiskAnswers={hasRiskAnswers}
            onSavePlan={handleSave}
            onViewDetails={() => handleStepChange('results')}
          />
        </aside>
      </div>

      {/* Assumptions Calibration Modal */}
      <PlanningAssumptionsModal
        isOpen={isAssumptionsModalOpen}
        onClose={() => setIsAssumptionsModalOpen(false)}
      />

      {/* Modern Workflow Footer */}
      <WorkflowFooter
        prev={{ path: '/', label: 'Dashboard' }}
        next={{ path: '/risk', label: 'Step 2: Risk Profile' }}
        flowHint="Master plan assets, balance sheet liabilities, and cashflows feed the simulation and allocation engine."
      />
    </div>
  );
};
