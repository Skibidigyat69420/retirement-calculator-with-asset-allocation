import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { MasterPlanInputs, Scenario, Goal, RiskProfile, RiskAnswers } from '../types';
import { defaultClientInputs, defaultScenarios } from '../lib/scenarios';
import { calculateMasterPlan } from '../lib/calculations';
import { loadAssumptions, type AssumptionSet } from '../lib/assumptions';
import { runWealthEngine, type WealthEngineResult } from '../lib/wealthEngine';
import { calculateRiskScore, getRiskProfile, isComplete } from '../lib/riskQuestionnaire';

interface CalculatorContextType {
  inputs: MasterPlanInputs;
  setInputs: React.Dispatch<React.SetStateAction<MasterPlanInputs>>;
  updateInputs: (patch: Partial<MasterPlanInputs>) => void;
  updateAsset: (id: string, patch: Partial<MasterPlanInputs['assets'][number]>) => void;
  addAsset: (asset?: Partial<MasterPlanInputs['assets'][number]>) => void;
  removeAsset: (id: string) => void;
  updateSIP: (patch: Partial<MasterPlanInputs['sip']>) => void;
  updateSTP: (patch: Partial<MasterPlanInputs['stp']>) => void;
  updateSWP: (patch: Partial<MasterPlanInputs['swp']>) => void;
  addGoal: (goal?: Partial<Goal>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  result: ReturnType<typeof calculateMasterPlan>;
  wealthResult: WealthEngineResult;
  scenarios: Scenario[];
  loadScenario: (scenario: Scenario) => void;
  assumptions: AssumptionSet;
  setAssumptions: React.Dispatch<React.SetStateAction<AssumptionSet>>;
  riskAnswers: RiskAnswers;
  setRiskAnswers: React.Dispatch<React.SetStateAction<RiskAnswers>>;
  riskProfile: RiskProfile;
  applyRiskProfileToPlan: () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

const RISK_ANSWERS_KEY = 'soundthesis_risk_answers';

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

export const CalculatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [inputs, setInputs] = useState<MasterPlanInputs>(defaultClientInputs());
  const [scenarios] = useState<Scenario[]>(defaultScenarios());
  const [assumptions, setAssumptions] = useState<AssumptionSet>(() => loadAssumptions());
  const [riskAnswers, setRiskAnswersState] = useState<RiskAnswers>(() => loadRiskAnswers());

  const setRiskAnswers = useCallback((value: React.SetStateAction<RiskAnswers>) => {
    setRiskAnswersState((prev) => {
      const next = typeof value === 'function' ? (value as (prev: RiskAnswers) => RiskAnswers)(prev) : value;
      saveRiskAnswers(next);
      return next;
    });
  }, []);

  const riskProfile = useMemo(() => {
    const score = isComplete(riskAnswers) ? calculateRiskScore(riskAnswers) : 50;
    return getRiskProfile(score);
  }, [riskAnswers]);

  const applyRiskProfileToPlan = useCallback(() => {
    const targets = riskProfile.targets;
    const total = targets.equity + targets.debt;
    const equitySplit = total > 0 ? Math.round((targets.equity / total) * 100) : 50;
    setInputs((prev) => ({
      ...prev,
      sip: { ...prev.sip, equitySplit, debtSplit: 100 - equitySplit },
      stp: { ...prev.stp, equitySplit, debtSplit: 100 - equitySplit },
    }));
  }, [riskProfile]);

  useEffect(() => {
    saveRiskAnswers(riskAnswers);
  }, [riskAnswers]);

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
          id: `asset-${Date.now()}`,
          name: 'New Asset',
          value: 0,
          returnRate: 8,
          category: 'other',
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
          id: `goal-${Date.now()}`,
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

  const result = useMemo(() => calculateMasterPlan(inputs), [inputs]);
  const wealthResult = useMemo(
    () => runWealthEngine(inputs, assumptions, { profile: riskProfile, score: calculateRiskScore(riskAnswers) }),
    [inputs, assumptions, riskProfile, riskAnswers],
  );

  return (
    <CalculatorContext.Provider
      value={{
        inputs,
        setInputs,
        updateInputs,
        updateAsset,
        addAsset,
        removeAsset,
        updateSIP,
        updateSTP,
        updateSWP,
        addGoal,
        updateGoal,
        removeGoal,
        result,
        wealthResult,
        scenarios,
        loadScenario,
        assumptions,
        setAssumptions,
        riskAnswers,
        setRiskAnswers,
        riskProfile,
        applyRiskProfileToPlan,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator must be used within CalculatorProvider');
  return ctx;
};
