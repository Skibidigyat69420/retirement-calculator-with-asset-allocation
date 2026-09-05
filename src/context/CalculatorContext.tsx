import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
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
import { loadClientData, saveClientData, resetClientData } from '../lib/persistenceUtils';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { StoredPlan } from '../lib/store';
import { savePlan, loadPlan, listPlans, deletePlan } from '../lib/planStorage';

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

const RISK_ANSWERS_KEY = 'soundthesis_risk_answers';
const MANUAL_TARGETS_KEY = 'soundthesis_manual_targets';
const DECISION_HISTORY_KEY = 'soundthesis_decision_history';
const MEETING_STATE_KEY = 'soundthesis_meeting_state';
const ASSUMPTION_MODE_KEY = 'soundthesis_assumption_mode';
const CUSTOM_RETURNS_KEY = 'soundthesis_custom_returns';

const DEFAULT_DECISIONS: DecisionLogEntry[] = [
  {
    id: 'dec-1',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    dateFormatted: new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    category: 'retirement',
    actionTitle: 'Retirement Age Calibrated',
    summary: 'Adjusted target retirement age from 55 to 58.',
    previousValue: 'Age 55',
    newValue: 'Age 58',
    rationale: 'Moving retirement age allows 3 additional years of compounding and lifts Monte Carlo probability from 82% to 94%.',
    author: 'Adviser',
    revertPatch: { retirementAge: 55 },
  },
  {
    id: 'dec-2',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    dateFormatted: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    category: 'allocation',
    actionTitle: 'Strategic Equity Target Trimmed',
    summary: 'Rebalanced strategic equity allocation from 72% down to 65%.',
    previousValue: '72% Equity',
    newValue: '65% Equity',
    rationale: 'Drawdown stress testing revealed -24% downside vulnerability. Trimming to 65% aligns with Balanced risk tolerance.',
    author: 'Adviser',
    revertManualTargets: { equity: 72, debt: 28, gold: 0, realestate: 0, liquid: 0, other: 0 },
    revertPatch: {
      sip: {
        ...defaultClientInputs().sip,
        equitySplit: 72,
        debtSplit: 28,
      },
    },
  },
  {
    id: 'dec-3',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    dateFormatted: new Date(Date.now() - 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    category: 'sip',
    actionTitle: 'Education Goal SIP Boost',
    summary: 'Allocated ₹15,000/month incremental SIP toward Child Foreign Education.',
    previousValue: '₹35,000/mo',
    newValue: '₹50,000/mo',
    rationale: 'Current goal funding probability was only 67%. Increasing monthly SIP ensures 90%+ probability of funding.',
    author: 'Adviser',
    revertPatch: {
      sip: {
        ...defaultClientInputs().sip,
        amount: 35000,
      },
    },
  },
];

const STAGE_CHECKLIST_MAP: Record<ClientMeetingStageId, string[]> = {
  1: ['m1-profile', 'm1-assets', 'm1-cashflow', 'm1-goals', 'm1-risk'],
  2: ['m2-networth', 'm2-readiness', 'm2-conflicts', 'm2-scenarios'],
  3: ['m3-allocation', 'm3-waterfall', 'm3-rebalance', 'm3-transition'],
  4: ['m4-dossier', 'm4-ips', 'm4-actions'],
};

function computeCompletedStages(checklists: Record<string, boolean>): ClientMeetingStageId[] {
  const result: ClientMeetingStageId[] = [];
  ([1, 2, 3, 4] as ClientMeetingStageId[]).forEach((stageId) => {
    const ids = STAGE_CHECKLIST_MAP[stageId];
    if (ids && ids.every((id) => Boolean(checklists[id]))) {
      result.push(stageId);
    }
  });
  return result;
}

const DEFAULT_MEETING_STATE: ClientMeetingState = {
  currentStage: 1,
  completedStages: [],
  stageChecklists: {
    'm1-profile': true,
    'm1-assets': true,
    'm1-cashflow': true,
    'm1-goals': false,
    'm1-risk': false,
    'm2-networth': true,
    'm2-readiness': false,
    'm2-conflicts': false,
    'm2-scenarios': false,
    'm3-allocation': false,
    'm3-waterfall': false,
    'm3-rebalance': false,
    'm3-transition': false,
    'm4-dossier': false,
    'm4-ips': false,
    'm4-actions': false,
  },
  notes: {
    1: 'Client expressed preference for early retirement at 58 with comfortable lifestyle and funding child higher education abroad.',
    2: 'Identified ₹1.4Cr projected corpus gap under conservative return scenario. Equity allocation is currently overweight by 8%.',
    3: 'Recommended shifting ₹25,000/mo into diversified debt, rebalancing equity back to 60%, and locking in emergency reserves.',
    4: 'Delivered customized Investment Policy Statement and 24-month execution trade roadmap.',
  },
  lastUpdated: new Date().toISOString(),
};

function loadRiskAnswers(): RiskAnswers {
  try {
    const raw = localStorage.getItem(RISK_ANSWERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveRiskAnswers(answers: RiskAnswers): void {
  localStorage.setItem(RISK_ANSWERS_KEY, JSON.stringify(answers));
}

function loadManualTargets(): Record<AssetCategory, number> | null {
  try {
    const raw = localStorage.getItem(MANUAL_TARGETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function loadDecisionHistory(): DecisionLogEntry[] {
  try {
    const raw = localStorage.getItem(DECISION_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_DECISIONS;
}

function loadMeetingState(): ClientMeetingState {
  try {
    const raw = localStorage.getItem(MEETING_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const mergedChecklists = { ...DEFAULT_MEETING_STATE.stageChecklists, ...(parsed.stageChecklists || {}) };
      return {
        ...DEFAULT_MEETING_STATE,
        ...parsed,
        notes: { ...DEFAULT_MEETING_STATE.notes, ...(parsed.notes || {}) },
        stageChecklists: mergedChecklists,
        completedStages: computeCompletedStages(mergedChecklists),
      };
    }
  } catch {
    // ignore
  }
  return {
    ...DEFAULT_MEETING_STATE,
    completedStages: computeCompletedStages(DEFAULT_MEETING_STATE.stageChecklists),
  };
}

function loadAssumptionMode(): AssumptionMode {
  try {
    const raw = localStorage.getItem(ASSUMPTION_MODE_KEY);
    if (raw && ['market', 'conservative', 'historical', 'override'].includes(raw)) {
      return raw as AssumptionMode;
    }
  } catch {
    // ignore
  }
  return 'market';
}

function loadCustomCategoryReturns(): Partial<Record<AssetCategory, number>> {
  try {
    const raw = localStorage.getItem(CUSTOM_RETURNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

/** Generate a unique ID that won't collide on rapid creation */
function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [savedPlans, setSavedPlans] = useState<StoredPlan[]>([]);

  const [inputs, setInputs] = useState<MasterPlanInputs>(() => loadClientData() ?? defaultClientInputs());
  const [assumptions, setAssumptions] = useState<AssumptionSet>(() => loadAssumptions());
  const [riskAnswers, setRiskAnswersState] = useState<RiskAnswers>(() => loadRiskAnswers());
  const [manualTargets, setManualTargetsState] = useState<Record<AssetCategory, number> | null>(() => loadManualTargets());
  const [decisionHistory, setDecisionHistory] = useState<DecisionLogEntry[]>(() => loadDecisionHistory());
  const [meetingState, setMeetingState] = useState<ClientMeetingState>(() => loadMeetingState());
  const [assumptionMode, setAssumptionModeState] = useState<AssumptionMode>(() => loadAssumptionMode());
  const [customCategoryReturns, setCustomCategoryReturns] = useState<Partial<Record<AssetCategory, number>>>(() => loadCustomCategoryReturns());

  const activeAssumptions = useMemo(() => {
    return getAssumptionsForMode(assumptionMode, assumptions, customCategoryReturns);
  }, [assumptionMode, assumptions, customCategoryReturns]);

  const activeAssumptionSourceLabel = useMemo(() => {
    return getAssumptionSourceLabel(assumptionMode);
  }, [assumptionMode]);

  const setAssumptionMode = useCallback((mode: AssumptionMode) => {
    setAssumptionModeState(mode);
    localStorage.setItem(ASSUMPTION_MODE_KEY, mode);
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_RETURNS_KEY, JSON.stringify(customCategoryReturns));
  }, [customCategoryReturns]);

  const logDecision = useCallback((entry: Omit<DecisionLogEntry, 'id' | 'timestamp' | 'dateFormatted'>) => {
    const newEntry: DecisionLogEntry = {
      ...entry,
      id: generateId('dec'),
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setDecisionHistory((prev) => {
      const next = [newEntry, ...prev];
      localStorage.setItem(DECISION_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearDecisionHistory = useCallback(() => {
    setDecisionHistory([]);
    localStorage.removeItem(DECISION_HISTORY_KEY);
  }, []);

  const revertDecision = useCallback((id: string) => {
    setDecisionHistory((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.revertPatch) {
        setInputs((inputs) => ({ ...inputs, ...entry.revertPatch }));
      }
      const next = prev.filter((e) => e.id !== id);
      localStorage.setItem(DECISION_HISTORY_KEY, JSON.stringify(next));
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
      localStorage.setItem(MEETING_STATE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleMeetingChecklist = useCallback((checklistId: string) => {
    setMeetingState((prev) => {
      const isDone = !prev.stageChecklists[checklistId];
      const nextChecklists = { ...prev.stageChecklists, [checklistId]: isDone };
      const completedStages = computeCompletedStages(nextChecklists);
      const next = {
        ...prev,
        stageChecklists: nextChecklists,
        completedStages,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(MEETING_STATE_KEY, JSON.stringify(next));
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
      localStorage.setItem(MEETING_STATE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Debounced persistence for client inputs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveClientData(inputs), 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [inputs]);

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

  const setManualTargets = useCallback((value: React.SetStateAction<Record<AssetCategory, number> | null>) => {
    setManualTargetsState((prev) => {
      const next = typeof value === 'function'
        ? (value as (prev: Record<AssetCategory, number> | null) => Record<AssetCategory, number> | null)(prev)
        : value;
      if (next) localStorage.setItem(MANUAL_TARGETS_KEY, JSON.stringify(next));
      else localStorage.removeItem(MANUAL_TARGETS_KEY);
      return next;
    });
  }, []);

  const setRiskAnswers = useCallback((value: React.SetStateAction<RiskAnswers>) => {
    setRiskAnswersState((prev) => {
      const next = typeof value === 'function' ? (value as (prev: RiskAnswers) => RiskAnswers)(prev) : value;
      saveRiskAnswers(next);
      return next;
    });
  }, []);

  const riskScore = useMemo(() => {
    // Same computation as the RiskQuestionnaire page (partial answers score
    // unanswered questions as 0); only fall back to a neutral Balanced score
    // when no answers exist at all.
    if (Object.keys(riskAnswers).length === 0) return 50;
    return calculateRiskScore(riskAnswers);
  }, [riskAnswers]);

  const riskProfile = useMemo(() => {
    return getRiskProfile(riskScore);
  }, [riskScore]);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const showToast = useCallback((message: string, type: ToastNotification['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
    setManualTargets(null); // Reset manual overrides to match risk profile
    showToast(`Applied ${riskProfile.label} profile (${targets.equity}% Equity / ${targets.debt}% Debt) to allocation & SIP/STP!`, 'success');
  }, [riskProfile, setManualTargets, showToast]);

  const resetToDefaults = useCallback(() => {
    setInputs(defaultClientInputs());
    setRiskAnswers({});
    setManualTargets(null);
    resetClientData();
    localStorage.removeItem(RISK_ANSWERS_KEY);
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
      showToast(`Loaded plan: ${plan.name}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load plan', 'error');
    }
  }, [showToast, setRiskAnswers, setManualTargets]);

  const deleteSavedPlan = useCallback(async (id: string) => {
    try {
      await deletePlan(id);
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
