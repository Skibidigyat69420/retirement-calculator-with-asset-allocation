import { createContext, useContext, useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import type {
  MasterPlanInputs,
  Goal,
  RiskProfile,
  RiskAnswers,
  AssetCategory,
  ClientProfile,
  DecisionLogEntry,
  ClientMeetingState,
  ClientMeetingStageId,
  AssumptionMode,
} from '../types';
import { defaultClientInputs } from '../lib/scenarios';
import {
  loadAssumptions,
  buildAssumptionsFromMarketData,
  getAssumptionsForMode,
  getAssumptionSourceLabel,
  type AssumptionSet,
} from '../lib/assumptions';
import { fetchMarketDataFromBackend } from '../lib/marketData';
import { runWealthEngine, type WealthEngineResult } from '../lib/wealthEngine';
import { calculateRiskScore, getRiskProfile } from '../lib/riskQuestionnaire';

import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { StoredPlan } from '../lib/store';
import { savePlan, loadPlan, listPlans, deletePlan } from '../lib/planStorage';
import { getActivePlanId, setActivePlanId } from '../lib/store/localStorageStore';
import { generateId } from '../lib/utils';

export const DEFAULT_MEETING_STATE: ClientMeetingState = {
  currentStage: 1,
  completedStages: [],
  stageChecklists: {},
  notes: {},
  lastUpdated: new Date().toISOString(),
};

const computeCompletedStages = (_checklists: Record<string, boolean>): ClientMeetingStageId[] => {
  return [];
};

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface CalculatorContextType {
  inputs: MasterPlanInputs;
  setInputs: React.Dispatch<React.SetStateAction<MasterPlanInputs>>;
  updateInputs: (patch: Partial<MasterPlanInputs>) => void;
  updateClient: (patch: Partial<ClientProfile>) => void;
  updateAsset: (id: string, patch: Partial<MasterPlanInputs['assets'][number]>) => void;
  addAsset: (asset?: Partial<MasterPlanInputs['assets'][number]>) => void;
  removeAsset: (id: string) => void;
  updateSIP: (patch: Partial<MasterPlanInputs['sip']>) => void;
  updateSTP: (patch: Partial<MasterPlanInputs['stp']>) => void;
  updateSWP: (patch: Partial<MasterPlanInputs['swp']>) => void;
  addLoan: (loan?: Partial<MasterPlanInputs['loans'][number]>) => void;
  updateLoan: (id: string, patch: Partial<MasterPlanInputs['loans'][number]>) => void;
  removeLoan: (id: string) => void;
  addGoal: (goal?: Partial<Goal>) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  wealthResult: WealthEngineResult;
  assumptions: AssumptionSet;
  setAssumptions: React.Dispatch<React.SetStateAction<AssumptionSet>>;
  riskAnswers: RiskAnswers;
  setRiskAnswers: React.Dispatch<React.SetStateAction<RiskAnswers>>;
  riskProfile: RiskProfile;
  riskScore: number;
  applyRiskProfileToPlan: () => void;
  manualTargets: Record<AssetCategory, number> | null;
  setManualTargets: React.Dispatch<React.SetStateAction<Record<AssetCategory, number> | null>>;
  resetToDefaults: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  savedPlans: StoredPlan[];
  refreshSavedPlans: () => Promise<void>;
  saveCurrentPlan: (name?: string) => Promise<void>;
  loadSavedPlan: (id: string) => Promise<void>;
  deleteSavedPlan: (id: string) => Promise<void>;
  decisionHistory: DecisionLogEntry[];
  logDecision: (entry: Omit<DecisionLogEntry, 'id' | 'timestamp' | 'dateFormatted'>) => void;
  revertDecision: (id: string) => void;
  clearDecisionHistory: () => void;
  meetingState: ClientMeetingState;
  updateMeetingStage: (stageId: ClientMeetingStageId) => void;
  toggleMeetingChecklist: (checklistId: string) => void;
  saveMeetingNotes: (stageId: ClientMeetingStageId, notes: string) => void;
  assumptionMode: AssumptionMode;
  setAssumptionMode: (mode: AssumptionMode) => void;
  customCategoryReturns: Partial<Record<AssetCategory, number>>;
  setCustomCategoryReturns: React.Dispatch<React.SetStateAction<Partial<Record<AssetCategory, number>>>>;
  activeAssumptionSourceLabel: string;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

// LocalStorage removed in favor of API backend.

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [savedPlans, setSavedPlans] = useState<StoredPlan[]>([]);
  const [, setActivePlanIdState] = useState<string | null>(null);

  const [inputs, setInputs] = useState<MasterPlanInputs>(defaultClientInputs());
  const [assumptions, setAssumptions] = useState<AssumptionSet>(loadAssumptions());
  const [riskAnswers, setRiskAnswersState] = useState<RiskAnswers>({});
  const [manualTargets, setManualTargetsState] = useState<Record<AssetCategory, number> | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<DecisionLogEntry[]>([]);
  const [meetingState, setMeetingState] = useState<ClientMeetingState>(DEFAULT_MEETING_STATE);
  const [assumptionMode, setAssumptionModeState] = useState<AssumptionMode>('market');
  const [customCategoryReturns, setCustomCategoryReturns] = useState<Partial<Record<AssetCategory, number>>>({});

  const activeAssumptions = useMemo(() => {
    return getAssumptionsForMode(assumptionMode, assumptions, customCategoryReturns);
  }, [assumptionMode, assumptions, customCategoryReturns]);

  const activeAssumptionSourceLabel = useMemo(() => {
    return getAssumptionSourceLabel(assumptionMode);
  }, [assumptionMode]);

  const setAssumptionMode = useCallback((mode: AssumptionMode) => {
    setAssumptionModeState(mode);
  }, []);

  const logDecision = useCallback((entry: Omit<DecisionLogEntry, 'id' | 'timestamp' | 'dateFormatted'>) => {
    const newEntry: DecisionLogEntry = {
      ...entry,
      id: generateId('dec'),
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setDecisionHistory((prev) => [newEntry, ...prev]);
  }, []);

  const clearDecisionHistory = useCallback(() => {
    setDecisionHistory([]);
  }, []);

  const revertDecision = useCallback((id: string) => {
    setDecisionHistory((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.revertPatch) {
        setInputs((inputs) => ({ ...inputs, ...entry.revertPatch }));
      }
      const next = prev.filter((e) => e.id !== id);
      return next;
    });
  }, []);

  const updateMeetingStage = useCallback((stageId: ClientMeetingStageId) => {
    setMeetingState((prev) => {
      const next = {
        ...prev,
        currentStage: stageId,
        lastUpdated: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  const toggleMeetingChecklist = useCallback((checklistId: string) => {
    setMeetingState((prev) => {
      const nextChecklists = { ...prev.stageChecklists, [checklistId]: !prev.stageChecklists[checklistId] };
      const next = {
        ...prev,
        stageChecklists: nextChecklists,
        completedStages: computeCompletedStages(nextChecklists),
        lastUpdated: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  const saveMeetingNotes = useCallback((stageId: ClientMeetingStageId, notes: string) => {
    setMeetingState((prev) => {
      const next = {
        ...prev,
        notes: { ...prev.notes, [stageId]: notes },
        lastUpdated: new Date().toISOString(),
      };
      return next;
    });
  }, []);


  // Auto-calibrate assumptions using extracted historical market-data CSV bundle
  useEffect(() => {
    let active = true;
    fetchMarketDataFromBackend()
      .then((marketData) => {
        if (!active || !marketData) return;
        const empiricalAssumptions = buildAssumptionsFromMarketData(marketData);
        setAssumptions(empiricalAssumptions);
      })
      .catch((err) => {
        console.warn('Could not auto-calibrate assumptions from CSV bundle:', err);
      });
    return () => { active = false; };
  }, []);

  const setManualTargets = useCallback((update: React.SetStateAction<Record<AssetCategory, number> | null>) => {
    setManualTargetsState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return next;
    });
  }, []);

  const setRiskAnswers = useCallback((update: React.SetStateAction<RiskAnswers>) => {
    setRiskAnswersState((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return next;
    });
  }, []);

  const riskScore = useMemo(() => {
    if (Object.keys(riskAnswers).length === 0) return 50;
    return calculateRiskScore(riskAnswers);
  }, [riskAnswers]);

  const riskProfile = useMemo(() => {
    return getRiskProfile(riskScore);
  }, [riskScore]);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback((message: string, type: ToastNotification['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const updateClient = useCallback((patch: Partial<ClientProfile>) => {
    setInputs((prev) => ({
      ...prev,
      client: { ...prev.client, ...patch },
    }));
  }, []);

  const applyRiskProfileToPlan = useCallback(() => {
    const targets = riskProfile.targets;
    const total = targets.equity + targets.debt;
    const equitySplit = total > 0 ? Math.round((targets.equity / total) * 100) : 50;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
    setManualTargets(null); 
    showToast(`Applied ${riskProfile.label} profile (${targets.equity}% Equity / ${targets.debt}% Debt) to allocation & SIP/STP!`, 'success');
  }, [riskProfile, setManualTargets, showToast]);

  const resetToDefaults = useCallback(() => {
    setInputs(defaultClientInputs());
    setRiskAnswers({});
    setManualTargets(null);
    setDecisionHistory([]);
    setMeetingState(DEFAULT_MEETING_STATE);
    setActivePlanIdState(null);
    setActivePlanId(null);
    showToast('Plan inputs and risk profile reset to defaults.', 'info');
  }, [setRiskAnswers, setManualTargets, showToast]);

  const refreshSavedPlans = useCallback(async () => {
    try {
      const plans = await listPlans();
      setSavedPlans(plans);
    } catch (err) {
      console.error('Failed to refresh saved plans:', err);
    }
  }, []);

  const saveCurrentPlan = useCallback(async (name?: string) => {
    try {
      const result = await savePlan({ inputs, assumptions, riskAnswers, manualTargets }, undefined, name);
      if (result.success) {
        showToast(name ? `Saved plan: ${name}` : 'Plan saved to cloud', 'success');
        await refreshSavedPlans();
      } else {
        showToast(result.error || 'Failed to save plan', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save plan', 'error');
    }
  }, [inputs, assumptions, riskAnswers, manualTargets, showToast, refreshSavedPlans]);

  const loadSavedPlan = useCallback(async (id: string) => {
    try {
      const plan = await loadPlan(id);
      if (!plan) {
        showToast('Plan not found', 'error');
        return;
      }
      if (plan.inputs) setInputs(plan.inputs as MasterPlanInputs);
      if (plan.assumptions) setAssumptions(plan.assumptions as AssumptionSet);
      if (plan.riskAnswers) setRiskAnswers(plan.riskAnswers as RiskAnswers);
      if (plan.manualTargets !== undefined) setManualTargets(plan.manualTargets as Record<AssetCategory, number> | null);
      setActivePlanIdState(plan.id);
      setActivePlanId(plan.id);
      showToast(`Loaded plan: ${plan.name}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load plan', 'error');
    }
  }, [showToast, setRiskAnswers, setManualTargets]);

  const deleteSavedPlan = useCallback(async (id: string) => {
    try {
      await deletePlan(id);
      // Clear the active-plan marker both in state and persistent storage
      // when the deleted plan was the active one (functional check avoids a
      // stale closure on the active plan id).
      setActivePlanIdState((prev) => (prev === id ? null : prev));
      setActivePlanId(getActivePlanId() === id ? null : getActivePlanId());
      showToast('Plan deleted', 'info');
      await refreshSavedPlans();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete plan', 'error');
    }
  }, [showToast, refreshSavedPlans]);

  // Load saved plans from local storage on mount
  useEffect(() => {
    const timer = setTimeout(() => refreshSavedPlans(), 0);
    return () => clearTimeout(timer);
  }, [refreshSavedPlans]);

  const updateInputs = useCallback((patch: Partial<MasterPlanInputs>) => {
    setInputs((prev) => ({
      ...prev,
      ...patch,
      sip: patch.sip ? { ...prev.sip, ...patch.sip } : prev.sip,
      stp: patch.stp ? { ...prev.stp, ...patch.stp } : prev.stp,
      swp: patch.swp ? { ...prev.swp, ...patch.swp } : prev.swp,
      client: patch.client ? { ...prev.client, ...patch.client } : prev.client,
    }));
  }, []);

  const updateAsset = useCallback((id: string, patch: Partial<MasterPlanInputs['assets'][number]>) => {
    setInputs((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const addAsset = useCallback((asset?: Partial<MasterPlanInputs['assets'][number]>) => {
    setInputs((prev) => ({
      ...prev,
      assets: [
        ...prev.assets,
        {
          id: generateId('asset'),
          name: 'New Asset',
          value: 0,
          returnRate: 8,
          category: 'other' as AssetCategory,
          currency: 'INR',
          liquidateAtRetirement: false,
          ...asset,
        },
      ],
    }));
  }, []);

  const removeAsset = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
    }));
  }, []);

  const updateSIP = useCallback((patch: Partial<MasterPlanInputs['sip']>) => {
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, ...patch },
    }));
  }, []);

  const updateSTP = useCallback((patch: Partial<MasterPlanInputs['stp']>) => {
    setInputs((prev) => ({
      ...prev,
      stp: { ...prev.stp, ...patch },
    }));
  }, []);

  const updateSWP = useCallback((patch: Partial<MasterPlanInputs['swp']>) => {
    setInputs((prev) => ({
      ...prev,
      swp: { ...prev.swp, ...patch },
    }));
  }, []);

  const addLoan = useCallback((loan?: Partial<MasterPlanInputs['loans'][number]>) => {
    const id = loan?.id || generateId('loan');
    setInputs((prev) => {
      const newLoan = {
        name: 'New Loan',
        principal: 1000000,
        rate: 8.5,
        tenureYears: 15,
        includeInExpenses: true,
        ...loan,
        id,
      };
      return {
        ...prev,
        loans: [...(prev.loans || []), newLoan],
      };
    });
  }, []);

  const updateLoan = useCallback((id: string, patch: Partial<MasterPlanInputs['loans'][number]>) => {
    setInputs((prev) => ({
      ...prev,
      loans: (prev.loans || []).map((l) => (l.id === id ? { ...l, ...patch, id: l.id } : l)),
    }));
  }, []);

  const removeLoan = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      loans: (prev.loans || []).filter((l) => l.id !== id),
    }));
  }, []);


  const addGoal = useCallback((goal?: Partial<Goal>) => {
    const id = goal?.id || generateId('goal');
    setInputs((prev) => {
      const newGoal: Goal = {
        name: 'New Goal',
        targetAmount: 1000000,
        yearsToGoal: 5,
        priority: 'important',
        inflation: prev.inflation ?? 5,
        recurring: false,
        ...goal,
        id,
      };
      return {
        ...prev,
        goals: [...prev.goals, newGoal],
      };
    });
    return id;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setInputs((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch, id: g.id } : g)),
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  // Defer the heavy Monte Carlo recomputation so keystrokes stay responsive.
  // Memoize the profile object first so useDeferredValue can actually defer it.
  const riskProfileBundle = useMemo(
    () => ({ profile: riskProfile, score: riskScore }),
    [riskProfile, riskScore],
  );
  const deferredInputs = useDeferredValue(inputs);
  const deferredAssumptions = useDeferredValue(activeAssumptions);
  const deferredProfile = useDeferredValue(riskProfileBundle);
  const deferredManualTargets = useDeferredValue(manualTargets);

  const wealthResult = useMemo(
    () => runWealthEngine(deferredInputs, deferredAssumptions, deferredProfile, deferredManualTargets),
    [deferredInputs, deferredAssumptions, deferredProfile, deferredManualTargets],
  );

  return (
    <CalculatorContext.Provider
      value={{
        inputs,
        setInputs,
        updateInputs,
        updateClient,
        updateAsset,
        addAsset,
        removeAsset,
        updateSIP,
        updateSTP,
        updateSWP,
        addLoan,
        updateLoan,
        removeLoan,
        addGoal,
        updateGoal,
        removeGoal,
        wealthResult,
        assumptions,
        setAssumptions,
        riskAnswers,
        setRiskAnswers,
        riskProfile,
        riskScore,
        applyRiskProfileToPlan,
        manualTargets,
        setManualTargets,
        resetToDefaults,
        showToast,
        savedPlans,
        refreshSavedPlans,
        saveCurrentPlan,
        loadSavedPlan,
        deleteSavedPlan,
        decisionHistory,
        logDecision,
        revertDecision,
        clearDecisionHistory,
        meetingState,
        updateMeetingStage,
        toggleMeetingChecklist,
        saveMeetingNotes,
        assumptionMode,
        setAssumptionMode,
        customCategoryReturns,
        setCustomCategoryReturns,
        activeAssumptionSourceLabel,
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border text-sm transition-all duration-300 transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-navy text-white border-amber-500/40'
                : t.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : t.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="text-amber-500 shrink-0 mt-0.5" size={18} />}
            {t.type === 'error' && <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />}
            {t.type === 'warning' && <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />}
            {t.type === 'info' && <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />}
            <div className="flex-1 font-medium leading-snug">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-300 hover:text-white shrink-0 ml-1"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </CalculatorContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useCalculator = () => {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used within CalculatorProvider');
  return ctx;
};
