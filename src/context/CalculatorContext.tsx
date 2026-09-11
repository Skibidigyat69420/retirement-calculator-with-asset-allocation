import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import type {
  MasterPlanInputs,
  Goal,
  RiskProfile,
  RiskAnswers,
  AssetCategory,
  ClientProfile,
  Liability,
  DecisionLogEntry,
  ClientMeetingState,
  ClientMeetingStageId,
  AssumptionMode,
} from '../types';
import { defaultClientInputs, demoClientInputs } from '../lib/scenarios';
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
import { getActivePlanId, setActivePlanId } from '../lib/store/localStorageStore';
import { useAuth } from './AuthContext';
import {
  archiveFinancialResource,
  createFinancialResource,
  createPlanVersion,
  getClient,
  getClientProfile,
  getPlan,
  listPlans as listBackendPlans,
  patchClient,
  patchFinancialResource,
} from '../lib/api';

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
  updateLiability: (id: string, patch: Partial<Liability>) => void;
  addLiability: (liability?: Partial<Liability>) => void;
  removeLiability: (id: string) => void;
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
  hasRiskAnswers: boolean;
  applyRiskProfileToPlan: () => void;
  manualTargets: Record<AssetCategory, number> | null;
  setManualTargets: React.Dispatch<React.SetStateAction<Record<AssetCategory, number> | null>>;
  resetToDefaults: () => void;
  loadDemoWorkspace: () => void;
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
    'm1-profile': false,
    'm1-assets': false,
    'm1-cashflow': false,
    'm1-goals': false,
    'm1-risk': false,
    'm2-networth': false,
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
  notes: {},
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
  return [];
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

function liabilityEmi(liability: Liability): number {
  const principal = Math.max(0, Number(liability.principal) || 0);
  const rate = Math.max(0, Number(liability.rate) || 0);
  const years = Math.max(1, Number(liability.tenureYears) || 1);
  if (Number(liability.monthlyPayment) > 0) return Number(liability.monthlyPayment);
  if (!principal) return 0;
  const monthlyRate = rate / 1200;
  return monthlyRate === 0
    ? principal / (years * 12)
    : principal * monthlyRate * Math.pow(1 + monthlyRate, years * 12) / (Math.pow(1 + monthlyRate, years * 12) - 1);
}

function linkedMonthlyExpenditure(inputs: MasterPlanInputs): number {
  const living = Number(inputs.monthlyLivingExpenses ?? inputs.monthlyExpenditure) || 0;
  const emi = (inputs.liabilities || [])
    .filter((liability) => liability.includeInExpenses)
    .reduce((sum, liability) => sum + liabilityEmi(liability), 0);
  return Math.max(0, Math.round(living + emi));
}

function normalizePlan(saved: Partial<MasterPlanInputs>): MasterPlanInputs {
  const blank = defaultClientInputs();
  return {
    ...blank,
    ...saved,
    client: { ...blank.client, ...(saved.client || {}) },
    assets: saved.assets || [],
    liabilities: saved.liabilities || [],
    goals: saved.goals || [],
    monthlyLivingExpenses: saved.monthlyLivingExpenses ?? saved.monthlyExpenditure ?? 0,
  };
}

function numberValue(value: unknown): number { return Number(value ?? 0) || 0; }

function mapServerAsset(row: Record<string, unknown>) {
  return {
    id: String(row.id), name: String(row.name || 'Asset'), value: numberValue(row.currentValue),
    returnRate: numberValue(row.expectedReturn), category: (row.assetCategory || 'other') as AssetCategory,
    currency: String(row.currency || 'INR'), liquidateAtRetirement: Boolean(row.liquidateAtRetirement),
  };
}

function mapServerLiability(row: Record<string, unknown>): Liability {
  const metadata = (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>;
  return {
    id: String(row.id), name: String(row.name || 'Liability'), principal: numberValue(row.outstandingAmount),
    rate: numberValue(row.interestRate), tenureYears: Math.max(1, numberValue(metadata.tenureYears) || 1),
    monthlyPayment: numberValue(row.monthlyPayment), includeInExpenses: metadata.includeInExpenses !== false,
  };
}

function mapServerGoal(row: Record<string, unknown>): Goal {
  return {
    id: String(row.id), name: String(row.name || 'Goal'), targetAmount: numberValue(row.targetAmount),
    yearsToGoal: numberValue(row.yearsToGoal), priority: (row.priority || 'important') as Goal['priority'],
    inflation: numberValue(row.inflationRate), recurring: Boolean(row.recurring),
  };
}

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, organizationId } = useAuth();
  const [savedPlans, setSavedPlans] = useState<StoredPlan[]>([]);
  const [, setActivePlanIdState] = useState<string | null>(() => getActivePlanId());

  const [inputs, setInputs] = useState<MasterPlanInputs>(() => {
    const saved = loadClientData();
    if (!saved) return defaultClientInputs();
    return normalizePlan(saved);
  });
  const [assumptions, setAssumptions] = useState<AssumptionSet>(() => loadAssumptions());
  const [riskAnswers, setRiskAnswersState] = useState<RiskAnswers>(() => loadRiskAnswers());
  const [manualTargets, setManualTargetsState] = useState<Record<AssetCategory, number> | null>(() => loadManualTargets());
  const [decisionHistory, setDecisionHistory] = useState<DecisionLogEntry[]>(() => loadDecisionHistory());
  const [meetingState, setMeetingState] = useState<ClientMeetingState>(() => loadMeetingState());
  const [assumptionMode, setAssumptionModeState] = useState<AssumptionMode>(() => loadAssumptionMode());
  const [customCategoryReturns, setCustomCategoryReturns] = useState<Partial<Record<AssetCategory, number>>>(() => loadCustomCategoryReturns());
  const [activeClientId, setActiveClientId] = useState<string | null>(() => localStorage.getItem('stw.activeClientId'));
  const backendPlanIdRef = useRef<string | null>(null);
  const backendLoadedRef = useRef(false);
  const backendHydratingRef = useRef(false);

  useEffect(() => {
    if (!user || !organizationId || !activeClientId) return;
    let cancelled = false;
    backendHydratingRef.current = true;
    backendLoadedRef.current = false;
    (async () => {
      try {
        const [client, profile, plans] = await Promise.all([
          getClient(activeClientId),
          getClientProfile(activeClientId),
          listBackendPlans(activeClientId),
        ]);
        const plan = plans.data[0] ? await getPlan(plans.data[0].id) : null;
        if (cancelled) return;
        backendPlanIdRef.current = plan?.id ?? null;
        const snapshot = (plan?.currentVersion?.inputSnapshot || {}) as Partial<MasterPlanInputs>;
        const incomeRule = profile.cashflows.find((row) => row.type === 'income');
        const expenseRule = profile.cashflows.find((row) => row.type === 'expense');
        const sipRule = profile.cashflows.find((row) => row.type === 'sip');
        setInputs(normalizePlan({
          ...snapshot,
          client: {
            ...defaultClientInputs().client,
            ...(snapshot.client || {}),
            name: [client.firstName, client.lastName].filter(Boolean).join(' '),
            email: client.email || '', phone: client.phone || '', notes: client.notes || '',
          },
          annualIncome: incomeRule ? numberValue(incomeRule.annualAmount) : snapshot.annualIncome,
          monthlyLivingExpenses: expenseRule ? numberValue(expenseRule.monthlyAmount) : snapshot.monthlyLivingExpenses,
          assets: profile.assets.map(mapServerAsset),
          liabilities: profile.liabilities.map(mapServerLiability),
          goals: profile.goals.map(mapServerGoal),
          sip: { ...defaultClientInputs().sip, ...(snapshot.sip || {}), amount: sipRule ? numberValue(sipRule.monthlyAmount) : numberValue(snapshot.sip?.amount) },
        }));
        backendLoadedRef.current = true;
      } catch (error) {
        console.warn('Could not hydrate the selected client from the backend:', error);
      } finally {
        backendHydratingRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [activeClientId, organizationId, user]);

  useEffect(() => {
    const syncActiveClient = () => setActiveClientId(localStorage.getItem('stw.activeClientId'));
    window.addEventListener('stw:active-client-changed', syncActiveClient);
    return () => window.removeEventListener('stw:active-client-changed', syncActiveClient);
  }, []);

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
    if (activeClientId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveClientData(inputs), 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [inputs, activeClientId]);

  // The database is authoritative for an advisor-selected client. Scalar
  // planning assumptions are versioned on the plan; row-shaped financial
  // records are written through their table endpoints above.
  useEffect(() => {
    if (!activeClientId || !backendLoadedRef.current || backendHydratingRef.current || !backendPlanIdRef.current) return;
    const timer = setTimeout(() => {
      const { assets: _assets, liabilities: _liabilities, goals: _goals, monthlyExpenditure: _total, ...scalarSnapshot } = inputs;
      void createPlanVersion(backendPlanIdRef.current as string, scalarSnapshot as unknown as Record<string, unknown>)
        .catch((error) => console.warn('Plan version save failed:', error));
    }, 700);
    return () => clearTimeout(timer);
  }, [activeClientId, inputs]);

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

  const hasRiskAnswers = useMemo(() => Object.keys(riskAnswers).length > 0, [riskAnswers]);

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
    if (activeClientId) {
      const nameParts = String(patch.name || '').trim().split(/\s+/).filter(Boolean);
      const body: Record<string, unknown> = { ...patch };
      if (patch.name !== undefined) {
        body.firstName = nameParts.shift() || '';
        body.lastName = nameParts.join(' ') || 'Client';
        delete body.name;
      }
      void patchClient(activeClientId, body).catch((error) => console.warn('Client profile save failed:', error));
    }
  }, [activeClientId]);

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
    setActivePlanIdState(null);
    setActivePlanId(null);
    showToast('Workspace reset to a blank planning state.', 'info');
  }, [setRiskAnswers, setManualTargets, showToast]);

  const loadDemoWorkspace = useCallback(() => {
    setInputs(demoClientInputs());
    showToast('Demo workspace loaded', 'info');
  }, [showToast]);

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
      if (plan.inputs) setInputs(normalizePlan(plan.inputs as Partial<MasterPlanInputs>));
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
      monthlyLivingExpenses: patch.monthlyLivingExpenses !== undefined
        ? patch.monthlyLivingExpenses
        : patch.monthlyExpenditure !== undefined
          ? Math.max(0, patch.monthlyExpenditure - (prev.liabilities || []).filter((l) => l.includeInExpenses).reduce((s, l) => s + liabilityEmi(l), 0))
          : prev.monthlyLivingExpenses ?? prev.monthlyExpenditure,
      sip: patch.sip ? { ...prev.sip, ...patch.sip } : prev.sip,
      stp: patch.stp ? { ...prev.stp, ...patch.stp } : prev.stp,
      swp: patch.swp ? { ...prev.swp, ...patch.swp } : prev.swp,
      client: patch.client ? { ...prev.client, ...patch.client } : prev.client,
    }));
  }, []);

  const updateLiability = useCallback((id: string, patch: Partial<Liability>) => {
    setInputs((prev) => ({
      ...prev,
      liabilities: (prev.liabilities || []).map((liability) => liability.id === id ? { ...liability, ...patch } : liability),
    }));
    if (activeClientId && id.length > 20) {
      const metadata: Record<string, unknown> = {};
      if (patch.tenureYears !== undefined) metadata.tenureYears = patch.tenureYears;
      if (patch.includeInExpenses !== undefined) metadata.includeInExpenses = patch.includeInExpenses;
      const apiPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) apiPatch.name = patch.name;
      if (patch.principal !== undefined) apiPatch.outstandingAmount = patch.principal;
      if (patch.rate !== undefined) apiPatch.interestRate = patch.rate;
      if (patch.monthlyPayment !== undefined) apiPatch.monthlyPayment = patch.monthlyPayment;
      if (Object.keys(metadata).length) apiPatch.metadata = metadata;
      void patchFinancialResource(activeClientId, 'liabilities', id, apiPatch).catch((error) => console.warn('Liability save failed:', error));
    }
  }, [activeClientId]);

  const addLiability = useCallback((liability?: Partial<Liability>) => {
    const localLiability: Liability = { id: generateId('liability'), name: 'New liability', principal: 0, rate: 0, tenureYears: 1, includeInExpenses: true, ...liability };
    setInputs((prev) => ({
      ...prev,
      liabilities: [...(prev.liabilities || []), localLiability],
    }));
    if (activeClientId) void createFinancialResource(activeClientId, 'liabilities', { name: localLiability.name, liabilityType: 'loan', outstandingAmount: localLiability.principal, interestRate: localLiability.rate, monthlyPayment: localLiability.monthlyPayment, metadata: { tenureYears: localLiability.tenureYears, includeInExpenses: localLiability.includeInExpenses } })
      .then((row) => setInputs((prev) => ({ ...prev, liabilities: prev.liabilities.map((item) => item.id === localLiability.id ? mapServerLiability(row) : item) })))
      .catch((error) => console.warn('Liability create failed:', error));
  }, [activeClientId]);

  const removeLiability = useCallback((id: string) => {
    setInputs((prev) => ({ ...prev, liabilities: (prev.liabilities || []).filter((liability) => liability.id !== id) }));
    if (activeClientId && id.length > 20) void archiveFinancialResource(activeClientId, 'liabilities', id).catch((error) => console.warn('Liability archive failed:', error));
  }, [activeClientId]);

  const updateAsset = useCallback((id: string, patch: Partial<MasterPlanInputs['assets'][number]>) => {
    setInputs((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    if (activeClientId && id.length > 20) {
      const apiPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) apiPatch.name = patch.name;
      if (patch.value !== undefined) apiPatch.currentValue = patch.value;
      if (patch.returnRate !== undefined) apiPatch.expectedReturn = patch.returnRate;
      if (patch.category !== undefined) { apiPatch.assetCategory = patch.category; apiPatch.assetType = patch.category; }
      if (patch.currency !== undefined) apiPatch.currency = patch.currency;
      if (patch.liquidateAtRetirement !== undefined) apiPatch.liquidateAtRetirement = patch.liquidateAtRetirement;
      void patchFinancialResource(activeClientId, 'assets', id, apiPatch).catch((error) => console.warn('Asset save failed:', error));
    }
  }, [activeClientId]);

  const addAsset = useCallback((asset?: Partial<MasterPlanInputs['assets'][number]>) => {
    const localAsset = { id: generateId('asset'), name: 'New Asset', value: 0, returnRate: 0, category: 'other' as AssetCategory, currency: 'INR', liquidateAtRetirement: false, ...asset };
    setInputs((prev) => ({
      ...prev,
      assets: [...prev.assets, localAsset],
    }));
    if (activeClientId) void createFinancialResource(activeClientId, 'assets', { name: localAsset.name, assetType: localAsset.category, assetCategory: localAsset.category, currency: localAsset.currency, currentValue: localAsset.value, expectedReturn: localAsset.returnRate, liquidateAtRetirement: localAsset.liquidateAtRetirement })
      .then((row) => setInputs((prev) => ({ ...prev, assets: prev.assets.map((item) => item.id === localAsset.id ? mapServerAsset(row) : item) })))
      .catch((error) => console.warn('Asset create failed:', error));
  }, [activeClientId]);

  const removeAsset = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== id),
    }));
    if (activeClientId && id.length > 20) void archiveFinancialResource(activeClientId, 'assets', id).catch((error) => console.warn('Asset archive failed:', error));
  }, [activeClientId]);

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
        targetAmount: 0,
        yearsToGoal: 0,
        priority: 'important',
        inflation: 0,
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
  const linkedInputs = useMemo(() => ({ ...inputs, monthlyExpenditure: linkedMonthlyExpenditure(inputs) }), [inputs]);
  const deferredInputs = useDeferredValue(linkedInputs);
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
        inputs: linkedInputs,
        setInputs,
        updateInputs,
        updateClient,
        updateAsset,
        addAsset,
        removeAsset,
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
        assumptions,
        setAssumptions,
        riskAnswers,
        setRiskAnswers,
        riskProfile,
        riskScore,
        hasRiskAnswers,
        applyRiskProfileToPlan,
        manualTargets,
        setManualTargets,
        resetToDefaults,
        loadDemoWorkspace,
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
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-md shadow-popover border text-sm transition-all duration-300 transform translate-y-0 bg-raised text-ink ${
              t.type === 'success'
                ? 'border-positive/40'
                : t.type === 'error'
                ? 'border-negative/40'
                : t.type === 'warning'
                ? 'border-warning/40'
                : 'border-border'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="text-positive shrink-0 mt-0.5" size={18} />}
            {t.type === 'error' && <AlertCircle className="text-negative shrink-0 mt-0.5" size={18} />}
            {t.type === 'warning' && <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />}
            {t.type === 'info' && <Info className="text-info shrink-0 mt-0.5" size={18} />}
            <div className="flex-1 font-medium leading-snug">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-ink shrink-0 ml-1"
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
