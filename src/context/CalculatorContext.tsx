import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import type { MasterPlanInputs, Scenario, Goal, RiskProfile, RiskAnswers, AssetCategory, ClientProfile } from '../types';
import { defaultClientInputs, defaultScenarios } from '../lib/scenarios';
import { loadAssumptions, type AssumptionSet } from '../lib/assumptions';
import { runWealthEngine, type WealthEngineResult } from '../lib/wealthEngine';
import { calculateRiskScore, getRiskProfile } from '../lib/riskQuestionnaire';
import { loadClientData, saveClientData, resetClientData } from '../lib/persistenceUtils';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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
  addGoal: (goal?: Partial<Goal>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  wealthResult: WealthEngineResult;
  scenarios: Scenario[];
  loadScenario: (scenario: Scenario) => void;
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
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

const RISK_ANSWERS_KEY = 'soundthesis_risk_answers';
const MANUAL_TARGETS_KEY = 'soundthesis_manual_targets';

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

/** Generate a unique ID that won't collide on rapid creation */
function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [inputs, setInputs] = useState<MasterPlanInputs>(() => loadClientData() ?? defaultClientInputs());
  const [scenarios] = useState<Scenario[]>(defaultScenarios());
  const [assumptions, setAssumptions] = useState<AssumptionSet>(() => loadAssumptions());
  const [riskAnswers, setRiskAnswersState] = useState<RiskAnswers>(() => loadRiskAnswers());
  const [manualTargets, setManualTargetsState] = useState<Record<AssetCategory, number> | null>(() => loadManualTargets());

  // Debounced persistence for client inputs
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveClientData(inputs), 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [inputs]);

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

  const updateInputs = useCallback((patch: Partial<MasterPlanInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }));
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
    setInputs((prev) => ({
      ...prev,
      goals: [
        ...prev.goals,
        {
          id: generateId('goal'),
          name: 'New Goal',
          targetAmount: 1000000,
          yearsToGoal: 5,
          priority: 'important',
          inflation: prev.inflation,
          recurring: false,
          ...goal,
        },
      ],
    }));
  }, []);

  const updateGoal = useCallback((id:string, patch: Partial<Goal>) => {
    setInputs((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setInputs((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  const loadScenario = useCallback((scenario: Scenario) => {
    setInputs(scenario.inputs);
  }, []);

  // Defer the heavy Monte Carlo recomputation so keystrokes stay responsive.
  // Memoize the profile object first so useDeferredValue can actually defer it.
  const riskProfileBundle = useMemo(
    () => ({ profile: riskProfile, score: riskScore }),
    [riskProfile, riskScore],
  );
  const deferredInputs = useDeferredValue(inputs);
  const deferredAssumptions = useDeferredValue(assumptions);
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
        scenarios,
        loadScenario,
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
                ? 'bg-navy text-white border-gold/40'
                : t.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : t.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-stone-900 text-white border-stone-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="text-gold shrink-0 mt-0.5" size={18} />}
            {t.type === 'error' && <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />}
            {t.type === 'warning' && <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />}
            {t.type === 'info' && <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />}
            <div className="flex-1 font-medium leading-snug">{t.message}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-300 hover:text-white shrink-0 ml-1"
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
