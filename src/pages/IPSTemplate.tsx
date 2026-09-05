import { useReducer, useState, useEffect, useCallback, useId, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Save,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  Trash2,
  Plus,
  RotateCcw,
  Eraser,
  Link2,
  Unlink,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { NumberInput } from '../components/ui/NumberInput';
import { formatCurrency } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import { useCalculator } from '../context/CalculatorContext';
import { cn } from '../lib/utils';
import type { AssetCategory, GoalPriority, ClientProfile, MasterPlanInputs } from '../types';

const STORAGE_KEY = 'soundthesis_ips_state_v1';
const LOCAL_SAVED_DRAFTS_KEY = 'soundthesis_saved_ips_drafts';

export interface IPSGoal {
  id: string;
  name: string;
  priority: GoalPriority;
  yearsToGoal: number;
  targetAmount: number;
}

export interface IPSAsset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
}

export interface IPSState {
  client: {
    name: string;
    advisor: string;
    reviewDate: string;
    currentAge: number;
    retirementAge: number;
    lifeExpectancy: number;
    inflation: number;
  };
  returnObjective: string;
  riskTolerance: 'low' | 'moderate' | 'high';
  maxDrawdown: number;
  allocation: Record<AssetCategory, number>;
  currentAllocation: Record<AssetCategory, number>;
  baseCurrency: string;
  foreignExposure: number;
  hedgePolicy: string;
  implementationReview: string;
  goals: IPSGoal[];
  assets: IPSAsset[];
  notes: string;
}

const categoryLabels: Record<AssetCategory, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
  realestate: 'Real Estate',
  liquid: 'Liquid',
  other: 'Other',
};

const defaultState = (): IPSState => ({
  client: {
    name: 'Vikram & Ananya Sharma',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: new Date().toISOString().split('T')[0],
    currentAge: 38,
    retirementAge: 60,
    lifeExpectancy: 90,
    inflation: 6,
  },
  returnObjective:
    'Achieve long-term compounding above inflation to fully fund lifetime liabilities, maintain retirement cash flow stability, and preserve real generational purchasing power across economic regimes.',
  riskTolerance: 'moderate',
  maxDrawdown: 15,
  allocation: {
    equity: 50,
    debt: 30,
    gold: 10,
    realestate: 0,
    liquid: 5,
    other: 5,
  },
  currentAllocation: {
    equity: 52.6,
    debt: 31.6,
    gold: 10.5,
    realestate: 0,
    liquid: 5.3,
    other: 0,
  },
  baseCurrency: 'INR',
  foreignExposure: 15,
  hedgePolicy:
    'Domestic currency baseline. International allocations remain unhedged for natural diversification benefit unless tactical foreign exchange volatility breaches predefined risk thresholds.',
  implementationReview:
    'Formal portfolio rebalancing is reviewed quarterly and executed whenever any strategic asset class breaches a ±5.0% absolute corridor drift. Full fiduciary review is conducted annually or immediately upon material changes in family circumstances, tax law, or liquidity requirements.',
  goals: [
    { id: 'g1', name: 'Retirement Corpus & Core Annuity', priority: 'essential', yearsToGoal: 22, targetAmount: 10_000_000 },
    { id: 'g2', name: 'Children Higher Education Trust', priority: 'important', yearsToGoal: 12, targetAmount: 3_000_000 },
  ],
  assets: [
    { id: 'a1', name: 'Broad Market Equity Index Funds', category: 'equity', value: 2_500_000 },
    { id: 'a2', name: 'Target Maturity G-Sec Bond Portfolio', category: 'debt', value: 1_500_000 },
    { id: 'a3', name: 'Sovereign Gold Bonds (SGB)', category: 'gold', value: 500_000 },
    { id: 'a4', name: 'Treasury Bills & Overnight Liquid Fund', category: 'liquid', value: 250_000 },
  ],
  notes:
    'Client maintains a strong preference for low-cost passive index replication in equities, sovereign-backed instruments for liability hedging, and strict tax-loss harvesting discipline.',
});

type IPSAction =
  | { type: 'reset'; payload?: IPSState }
  | { type: 'updateClient'; payload: Partial<IPSState['client']> }
  | { type: 'updateField'; payload: Partial<Omit<IPSState, 'client' | 'allocation' | 'goals' | 'assets'>> }
  | { type: 'updateAllocation'; category: AssetCategory; value: number }
  | { type: 'updateCurrentAllocation'; category: AssetCategory; value: number }
  | { type: 'syncCurrentAllocationFromAssets' }
  | { type: 'addGoal'; payload?: Partial<IPSGoal> }
  | { type: 'updateGoal'; id: string; payload: Partial<IPSGoal> }
  | { type: 'removeGoal'; id: string }
  | { type: 'addAsset'; payload?: Partial<IPSAsset> }
  | { type: 'updateAsset'; id: string; payload: Partial<IPSAsset> }
  | { type: 'removeAsset'; id: string };

function ipsReducer(state: IPSState, action: IPSAction): IPSState {
  switch (action.type) {
    case 'reset':
      return action.payload ? { ...action.payload } : defaultState();
    case 'updateClient':
      return { ...state, client: { ...state.client, ...action.payload } };
    case 'updateField':
      return { ...state, ...action.payload };
    case 'updateAllocation':
      return { ...state, allocation: { ...state.allocation, [action.category]: action.value } };
    case 'updateCurrentAllocation':
      return { ...state, currentAllocation: { ...state.currentAllocation, [action.category]: action.value } };
    case 'syncCurrentAllocationFromAssets': {
      const net = state.assets.reduce((sum, a) => sum + a.value, 0);
      const next: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
      for (const cat of Object.keys(categoryLabels) as AssetCategory[]) {
        const sum = state.assets.filter((a) => a.category === cat).reduce((s, a) => s + a.value, 0);
        next[cat] = net > 0 ? parseFloat(((sum / net) * 100).toFixed(1)) : 0;
      }
      return { ...state, currentAllocation: next };
    }
    case 'addGoal': {
      const nextId = `g${Date.now()}`;
      return {
        ...state,
        goals: [
          ...state.goals,
          { id: nextId, name: 'New Goal', priority: 'important', yearsToGoal: 10, targetAmount: 0, ...action.payload },
        ],
      };
    }
    case 'updateGoal':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.payload } : g)),
      };
    case 'removeGoal':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'addAsset': {
      const nextId = `a${Date.now()}`;
      return {
        ...state,
        assets: [
          ...state.assets,
          { id: nextId, name: 'New Asset', category: 'equity', value: 0, ...action.payload },
        ],
      };
    }
    case 'updateAsset':
      return {
        ...state,
        assets: state.assets.map((a) => (a.id === action.id ? { ...a, ...action.payload } : a)),
      };
    case 'removeAsset':
      return { ...state, assets: state.assets.filter((a) => a.id !== action.id) };
    default:
      return state;
  }
}

interface SavedIPS {
  name: string;
  updatedAt: string;
  isLocal?: boolean;
}

function loadPersistedState(): IPSState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.client && parsed.allocation && Array.isArray(parsed.goals) && Array.isArray(parsed.assets)) {
      return parsed as IPSState;
    }
  } catch {
    // ignore
  }
  return null;
}

export const IPSTemplate = () => {
  const [state, dispatch] = useReducer(ipsReducer, undefined, () => loadPersistedState() || defaultState());
  const baseId = useId();
  const fieldId = (name: string) => `${baseId}-${name}`;

  const {
    inputs,
    wealthResult,
    riskProfile,
    riskScore,
    manualTargets,
    setManualTargets,
    updateClient,
    updateInputs,
    addGoal,
    updateGoal,
    removeGoal,
    addAsset,
    updateAsset,
    removeAsset,
  } = useCalculator();

  const [isLinkedToPlan, setIsLinkedToPlan] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('soundthesis_ips_linked_mode');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const handleSetLinkedMode = (linked: boolean) => {
    setIsLinkedToPlan(linked);
    try {
      localStorage.setItem('soundthesis_ips_linked_mode', String(linked));
    } catch {
      // ignore
    }
  };

  // Effective Client details
  const effectiveClient = useMemo(() => {
    if (isLinkedToPlan) {
      return {
        name: inputs.client?.name || '',
        advisor: inputs.client?.advisor || 'Sound Thesis Wealth Advisory',
        reviewDate: inputs.client?.reviewDate || new Date().toISOString().split('T')[0],
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        lifeExpectancy: inputs.lifeExpectancy,
        inflation: inputs.inflation,
      };
    }
    return state.client;
  }, [
    isLinkedToPlan,
    inputs.client?.name,
    inputs.client?.advisor,
    inputs.client?.reviewDate,
    inputs.currentAge,
    inputs.retirementAge,
    inputs.lifeExpectancy,
    inputs.inflation,
    state.client,
  ]);

  // Effective Strategic Asset Allocation targets
  const effectiveAllocation = useMemo(() => {
    if (isLinkedToPlan) {
      return manualTargets || riskProfile.targets;
    }
    return state.allocation;
  }, [isLinkedToPlan, manualTargets, riskProfile.targets, state.allocation]);

  // Effective Current Allocation percentages
  const effectiveCurrentAllocation = useMemo(() => {
    if (isLinkedToPlan) {
      const ca: Record<AssetCategory, number> = {
        equity: parseFloat(((wealthResult.currentAllocation?.equity || 0) * 100).toFixed(1)),
        debt: parseFloat(((wealthResult.currentAllocation?.debt || 0) * 100).toFixed(1)),
        gold: parseFloat(((wealthResult.currentAllocation?.gold || 0) * 100).toFixed(1)),
        realestate: parseFloat(((wealthResult.currentAllocation?.realestate || 0) * 100).toFixed(1)),
        liquid: parseFloat(((wealthResult.currentAllocation?.liquid || 0) * 100).toFixed(1)),
        other: parseFloat(((wealthResult.currentAllocation?.other || 0) * 100).toFixed(1)),
      };
      return ca;
    }
    return state.currentAllocation;
  }, [isLinkedToPlan, wealthResult.currentAllocation, state.currentAllocation]);

  // Effective Net Worth valuation
  const effectiveNetWorth = useMemo(() => {
    return isLinkedToPlan ? wealthResult.netWorth : state.assets.reduce((sum, a) => sum + a.value, 0);
  }, [isLinkedToPlan, wealthResult.netWorth, state.assets]);

  // Effective Goals
  const effectiveGoals = useMemo(() => {
    if (isLinkedToPlan) {
      return inputs.goals.map((g) => ({
        id: g.id,
        name: g.name,
        priority: g.priority,
        yearsToGoal: g.yearsToGoal,
        targetAmount: g.targetAmount,
      }));
    }
    return state.goals;
  }, [isLinkedToPlan, inputs.goals, state.goals]);

  // Effective Assets
  const effectiveAssets = useMemo(() => {
    if (isLinkedToPlan) {
      return inputs.assets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        value: a.value,
      }));
    }
    return state.assets;
  }, [isLinkedToPlan, inputs.assets, state.assets]);

  // Effective Risk Profile & Tolerance
  const effectiveRiskTolerance = useMemo(() => {
    if (isLinkedToPlan) {
      if (riskProfile.id === 'conservative') return 'low';
      if (riskProfile.id === 'moderate') return 'low';
      if (riskProfile.id === 'balanced') return 'moderate';
      return 'high';
    }
    return state.riskTolerance;
  }, [isLinkedToPlan, riskProfile.id, state.riskTolerance]);

  const effectiveMaxDrawdown = useMemo(() => {
    if (isLinkedToPlan && state.maxDrawdown === 15 && riskProfile.maxDrawdown) {
      return riskProfile.maxDrawdown;
    }
    return state.maxDrawdown;
  }, [isLinkedToPlan, state.maxDrawdown, riskProfile.maxDrawdown]);

  const totalAllocation = useMemo(
    () => Object.values(effectiveAllocation).reduce((a, b) => a + b, 0),
    [effectiveAllocation],
  );
  const allocationOk = Math.abs(totalAllocation - 100) < 0.1;

  // Check if any category has breached the ±5% rebalancing corridor
  const hasCorridorBreach = useMemo(() => {
    for (const cat of Object.keys(categoryLabels) as AssetCategory[]) {
      const target = effectiveAllocation[cat] || 0;
      const current = effectiveCurrentAllocation[cat] || 0;
      if (Math.abs(current - target) > 5.0) return true;
    }
    return false;
  }, [effectiveAllocation, effectiveCurrentAllocation]);

  const effectiveState = useMemo<IPSState>(
    () => ({
      ...state,
      client: effectiveClient,
      allocation: effectiveAllocation,
      currentAllocation: effectiveCurrentAllocation,
      goals: effectiveGoals,
      assets: effectiveAssets,
      riskTolerance: effectiveRiskTolerance,
      maxDrawdown: effectiveMaxDrawdown,
    }),
    [
      state,
      effectiveClient,
      effectiveAllocation,
      effectiveCurrentAllocation,
      effectiveGoals,
      effectiveAssets,
      effectiveRiskTolerance,
      effectiveMaxDrawdown,
    ],
  );

  // Two-way live sync handlers when linked to active plan
  const handleClientChange = (patch: Partial<IPSState['client']>) => {
    if (isLinkedToPlan) {
      const clientPatch: Partial<ClientProfile> = {};
      if (patch.name !== undefined) clientPatch.name = patch.name;
      if (patch.advisor !== undefined) clientPatch.advisor = patch.advisor;
      if (patch.reviewDate !== undefined) clientPatch.reviewDate = patch.reviewDate;
      if (Object.keys(clientPatch).length > 0) updateClient(clientPatch);

      const inputPatch: Partial<MasterPlanInputs> = {};
      if (patch.currentAge !== undefined) inputPatch.currentAge = patch.currentAge;
      if (patch.retirementAge !== undefined) inputPatch.retirementAge = patch.retirementAge;
      if (patch.lifeExpectancy !== undefined) inputPatch.lifeExpectancy = patch.lifeExpectancy;
      if (patch.inflation !== undefined) inputPatch.inflation = patch.inflation;
      if (Object.keys(inputPatch).length > 0) updateInputs(inputPatch);
    }
    dispatch({ type: 'updateClient', payload: patch });
  };

  const handleAllocationChange = (category: AssetCategory, value: number) => {
    if (isLinkedToPlan) {
      const base = manualTargets || riskProfile.targets;
      setManualTargets({ ...base, [category]: value });
    }
    dispatch({ type: 'updateAllocation', category, value });
  };

  const handleResetAllocationToRiskProfile = () => {
    if (isLinkedToPlan) {
      setManualTargets(null);
    }
    dispatch({
      type: 'reset',
      payload: {
        ...state,
        allocation: { ...riskProfile.targets },
      },
    });
    setShowToast({ message: `Reset targets to ${riskProfile.label} profile defaults.`, type: 'info' });
  };

  const handleAddGoal = () => {
    if (isLinkedToPlan) {
      addGoal({
        name: 'New Goal',
        priority: 'important',
        yearsToGoal: 5,
        targetAmount: 1_000_000,
      });
    } else {
      dispatch({ type: 'addGoal' });
    }
  };

  const handleUpdateGoal = (id: string, patch: Partial<IPSGoal>) => {
    if (isLinkedToPlan) {
      updateGoal(id, patch);
    } else {
      dispatch({ type: 'updateGoal', id, payload: patch });
    }
  };

  const handleRemoveGoal = (id: string) => {
    if (isLinkedToPlan) {
      removeGoal(id);
    } else {
      dispatch({ type: 'removeGoal', id });
    }
  };

  const handleAddAsset = () => {
    if (isLinkedToPlan) {
      addAsset({
        name: 'New Asset',
        category: 'equity',
        value: 0,
        returnRate: 8,
        currency: 'INR',
        liquidateAtRetirement: false,
      });
    } else {
      dispatch({ type: 'addAsset' });
    }
  };

  const handleUpdateAsset = (id: string, patch: Partial<IPSAsset>) => {
    if (isLinkedToPlan) {
      updateAsset(id, patch);
    } else {
      dispatch({ type: 'updateAsset', id, payload: patch });
    }
  };

  const handleRemoveAsset = (id: string) => {
    if (isLinkedToPlan) {
      removeAsset(id);
    } else {
      dispatch({ type: 'removeAsset', id });
    }
  };

  const handleCloneFromActivePlan = () => {
    dispatch({
      type: 'reset',
      payload: {
        client: { ...effectiveClient },
        returnObjective: state.returnObjective,
        riskTolerance: effectiveRiskTolerance,
        maxDrawdown: effectiveMaxDrawdown,
        allocation: { ...effectiveAllocation },
        currentAllocation: { ...effectiveCurrentAllocation },
        baseCurrency: state.baseCurrency || 'INR',
        foreignExposure: state.foreignExposure,
        hedgePolicy: state.hedgePolicy,
        implementationReview: state.implementationReview,
        goals: effectiveGoals.map((g) => ({ ...g })),
        assets: effectiveAssets.map((a) => ({ ...a })),
        notes: state.notes,
      },
    });
    setShowToast({ message: 'Cloned active plan parameters into independent draft.', type: 'success' });
  };

  // State Persistence for independent draft
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Saved files management
  const [savedFiles, setSavedFiles] = useState<SavedIPS[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(null), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  const loadSavedFiles = useCallback(async () => {
    const list: SavedIPS[] = [];

    // Local browser drafts
    try {
      const raw = localStorage.getItem(LOCAL_SAVED_DRAFTS_KEY);
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList)) {
          for (const item of localList) {
            list.push({ name: item.name, updatedAt: item.updatedAt, isLocal: true });
          }
        }
      }
    } catch {
      // ignore
    }

    // Remote server files (if backend is active)
    try {
      const res = await fetch('/api/list-ips');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          for (const f of data.files) {
            if (!list.some((existing) => existing.name === f.name)) {
              list.push({ name: f.name, updatedAt: f.updatedAt || new Date().toISOString(), isLocal: false });
            }
          }
        }
      }
    } catch {
      // Server API unavailable
    }

    setSavedFiles(list);
  }, []);

  useEffect(() => {
    loadSavedFiles();
  }, [loadSavedFiles]);

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaveStatus('saving');
    setStatusMessage(null);
    const content = generateIPSMarkdown(effectiveState, effectiveNetWorth);
    const filename = `IPS-${(effectiveClient.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_')}-${effectiveClient.reviewDate}`;

    let savedRemote = false;
    try {
      const res = await fetch('/api/save-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          savedRemote = true;
        }
      }
    } catch {
      // ignore server failure
    }

    // Persist locally as well
    try {
      const raw = localStorage.getItem(LOCAL_SAVED_DRAFTS_KEY);
      const existing: any[] = raw ? JSON.parse(raw) : [];
      const updated = [
        { name: filename, updatedAt: new Date().toISOString(), content },
        ...existing.filter((f) => f.name !== filename),
      ].slice(0, 20);
      localStorage.setItem(LOCAL_SAVED_DRAFTS_KEY, JSON.stringify(updated));

      setSaveStatus('saved');
      setStatusMessage(savedRemote ? `Saved to ips/${filename}.md` : `Saved locally (${filename})`);
      setShowToast({
        message: savedRemote ? 'IPS saved to server & local storage.' : 'IPS saved locally to browser storage.',
        type: 'success',
      });
      await loadSavedFiles();
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage(err?.message || 'Save failed');
      setShowToast({ message: err?.message || 'Save failed', type: 'error' });
    }
  };

  const handleLoad = async (filename: string) => {
    setLoadStatus('loading');
    setStatusMessage(null);

    // Try local storage first
    try {
      const raw = localStorage.getItem(LOCAL_SAVED_DRAFTS_KEY);
      if (raw) {
        const localList = JSON.parse(raw);
        const match = localList.find((f: any) => f.name === filename);
        if (match && match.content) {
          const parsed = parseIPSMarkdown(match.content);
          dispatch({ type: 'reset', payload: parsed });
          setLoadStatus('idle');
          setStatusMessage(`Loaded local document ${filename}`);
          setShowToast({ message: `Loaded ${filename}`, type: 'success' });
          return;
        }
      }
    } catch {
      // continue to remote
    }

    // Try server API
    try {
      const res = await fetch(`/api/load-ips?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (!res.ok || !data.content) throw new Error(data.error || 'Document load failed');
      const parsed = parseIPSMarkdown(data.content);
      dispatch({ type: 'reset', payload: parsed });
      setLoadStatus('idle');
      setStatusMessage(`Loaded ${filename} into the policy template`);
      setShowToast({ message: `Loaded ${filename}`, type: 'success' });
    } catch (err: any) {
      setLoadStatus('error');
      setStatusMessage(err?.message || 'Load failed');
      setShowToast({ message: err?.message || 'Load failed', type: 'error' });
    }
  };

  const handleDownload = () => {
    const content = generateIPSMarkdown(effectiveState, effectiveNetWorth);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPS-${(effectiveClient.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowToast({ message: 'Exported IPS policy document (.md)', type: 'success' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <SectionTitle
          title="Investment Policy Statement"
          subtitle="Institutional-grade governance charter codifying fiduciary objectives, asset allocation corridors, risk boundaries, and rebalancing protocols for private wealth mandates."
          badge="Policy Statement"
        />

        {/* Dual Mode Switch */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-zinc-100 p-1 rounded-xl border border-zinc-200 print:hidden shadow-2xs">
          <button
            type="button"
            onClick={() => handleSetLinkedMode(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              isLinkedToPlan
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950',
            )}
          >
            <Link2 size={13} className={isLinkedToPlan ? 'text-emerald-400' : 'text-zinc-400'} />
            Linked to Active Plan
          </button>
          <button
            type="button"
            onClick={() => handleSetLinkedMode(false)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              !isLinkedToPlan
                ? 'bg-zinc-950 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950',
            )}
          >
            <FileText size={13} className={!isLinkedToPlan ? 'text-zinc-300' : 'text-zinc-400'} />
            Independent Draft
          </button>
        </div>
      </div>

      {/* Mode Status Callout */}
      <div className="print:hidden">
        {isLinkedToPlan ? (
          <Card className="bg-white border-zinc-200 shadow-2xs p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Link2 size={16} className="text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Live Plan Synchronization Active
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Pre-filled from your active Master Plan. Edits to client profiles, asset holdings, goals, and target allocations immediately update Dashboard, Scenarios, and Reporting across the platform.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="navy" className="text-[10px]">
                  {riskProfile.label} Model ({riskScore}/100)
                </Badge>
                {manualTargets && (
                  <button
                    type="button"
                    onClick={handleResetAllocationToRiskProfile}
                    className="text-[11px] text-zinc-600 hover:text-zinc-950 underline font-medium"
                    title="Clear manual overrides and reset targets to risk model"
                  >
                    Reset Targets
                  </button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-zinc-50/70 border-zinc-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-200/80 border border-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Unlink size={16} className="text-zinc-700" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Independent Sandbox Draft Mode
                  </span>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Isolated local draft saved in your browser cache. Changes here do not modify your active Master Plan inputs or risk profile.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1.5 h-auto self-start sm:self-auto shrink-0 bg-white"
                onClick={handleCloneFromActivePlan}
              >
                <Copy size={13} className="mr-1.5" /> Clone Active Plan into Draft
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input Form Controls */}
        <Card className="lg:col-span-1 space-y-6 bg-white border-zinc-200 print:hidden p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h3 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
              <FileText size={18} className="text-zinc-900" /> Policy Parameters
            </h3>
            <span className="text-[11px] font-mono text-zinc-500">
              {isLinkedToPlan ? 'LIVE SYNC' : 'STANDALONE'}
            </span>
          </div>

          {/* Client Profile Section */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 flex items-center justify-between">
              <span>Client Identification</span>
              {isLinkedToPlan && (
                <span className="text-[10px] font-normal text-emerald-700 flex items-center gap-1">
                  <Check size={11} /> Plan Synced
                </span>
              )}
            </div>

            <LabelledInput
              id={fieldId('clientName')}
              label="Client Name(s)"
              value={effectiveClient.name}
              onChange={(v) => handleClientChange({ name: v })}
              placeholder="e.g. Vikram & Ananya Sharma"
            />
            <LabelledInput
              id={fieldId('adviser')}
              label="Fiduciary Adviser / Firm"
              value={effectiveClient.advisor}
              onChange={(v) => handleClientChange({ advisor: v })}
              placeholder="e.g. Sound Thesis Wealth Advisory"
            />
            <LabelledDate
              id={fieldId('reviewDate')}
              label="Mandate Review Date"
              value={effectiveClient.reviewDate}
              onChange={(v) => handleClientChange({ reviewDate: v })}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Current Age"
                value={effectiveClient.currentAge}
                onChange={(v) => handleClientChange({ currentAge: v })}
                min={18}
                max={100}
              />
              <NumberInput
                label="Target Retirement"
                value={effectiveClient.retirementAge}
                onChange={(v) => handleClientChange({ retirementAge: v })}
                min={30}
                max={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Life Expectancy"
                value={effectiveClient.lifeExpectancy}
                onChange={(v) => handleClientChange({ lifeExpectancy: v })}
                min={30}
                max={120}
              />
              <NumberInput
                label="Inflation Hurdle"
                value={effectiveClient.inflation}
                onChange={(v) => handleClientChange({ inflation: v })}
                suffix="%"
                min={0}
                max={20}
              />
            </div>
          </div>

          {/* Investment Objectives & Risk Policy */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
              Objectives & Risk Boundaries
            </div>

            <div>
              <label
                htmlFor={fieldId('returnObjective')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1"
              >
                Return Objective & Hurdle Rate
              </label>
              <textarea
                id={fieldId('returnObjective')}
                value={state.returnObjective}
                onChange={(e) => dispatch({ type: 'updateField', payload: { returnObjective: e.target.value } })}
                rows={3}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
                placeholder="Codify the primary target return and purchasing power preservation goals..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={fieldId('riskTolerance')}
                  className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600"
                >
                  Behavioral Risk Tolerance
                </label>
                {isLinkedToPlan && (
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Profile: {riskProfile.label}
                  </span>
                )}
              </div>
              <select
                id={fieldId('riskTolerance')}
                value={state.riskTolerance}
                onChange={(e) =>
                  dispatch({
                    type: 'updateField',
                    payload: { riskTolerance: e.target.value as IPSState['riskTolerance'] },
                  })
                }
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
              >
                <option value="low">Low (Capital Preservation Focus)</option>
                <option value="moderate">Moderate (Balanced Capital Growth)</option>
                <option value="high">High (Long-Term Capital Appreciation)</option>
              </select>
            </div>

            <NumberInput
              label="Max Drawdown Tolerance (Rolling 12M)"
              value={effectiveMaxDrawdown}
              onChange={(v) => dispatch({ type: 'updateField', payload: { maxDrawdown: v } })}
              suffix="%"
              min={0}
              max={100}
            />
          </div>

          {/* Strategic Asset Allocation Targets */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                Strategic Asset Allocation (SAA)
              </div>
              {isLinkedToPlan && manualTargets && (
                <button
                  type="button"
                  onClick={handleResetAllocationToRiskProfile}
                  className="text-[11px] text-zinc-600 hover:text-zinc-950 underline"
                >
                  Reset to {riskProfile.label}
                </button>
              )}
            </div>

            {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
              <NumberInput
                key={cat}
                label={categoryLabels[cat]}
                value={effectiveAllocation[cat]}
                onChange={(v) => handleAllocationChange(cat, v)}
                suffix="%"
                min={0}
                max={100}
              />
            ))}

            <div
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border',
                allocationOk
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200',
              )}
            >
              <span>Total SAA Target: {totalAllocation.toFixed(1)}%</span>
              {allocationOk ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle size={14} /> 100% Validated
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-700">
                  <AlertTriangle size={14} /> Must equal 100.0%
                </span>
              )}
            </div>
          </div>

          {/* Current Portfolio Holdings */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                  Holdings & Asset Inventory
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Valuation: {formatCurrency(effectiveNetWorth)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-auto bg-white"
                onClick={handleAddAsset}
              >
                <Plus size={13} className="mr-1" /> Add Asset
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {effectiveAssets.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-1.5 items-end bg-zinc-50 border border-zinc-200 rounded-xl p-2 text-xs">
                  <div className="col-span-5">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`asset-name-${a.id}`}>
                      Holding
                    </label>
                    <input
                      id={`asset-name-${a.id}`}
                      type="text"
                      value={a.name}
                      onChange={(e) => handleUpdateAsset(a.id, { name: e.target.value })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      aria-label="Asset name"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`asset-category-${a.id}`}>
                      Class
                    </label>
                    <select
                      id={`asset-category-${a.id}`}
                      value={a.category}
                      onChange={(e) => handleUpdateAsset(a.id, { category: e.target.value as AssetCategory })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      aria-label="Asset category"
                    >
                      {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`asset-value-${a.id}`}>
                      Value (₹)
                    </label>
                    <input
                      id={`asset-value-${a.id}`}
                      type="number"
                      min={0}
                      value={a.value}
                      onChange={(e) => handleUpdateAsset(a.id, { value: Number(e.target.value) })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                      aria-label="Asset value"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(a.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      aria-label="Remove asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {effectiveAssets.length === 0 && (
                <p className="text-xs text-zinc-500 italic p-2">No assets recorded in schedule.</p>
              )}
            </div>

            {!isLinkedToPlan && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs py-1 h-auto text-zinc-700 hover:text-zinc-950 border border-zinc-200"
                onClick={() => dispatch({ type: 'syncCurrentAllocationFromAssets' })}
              >
                Recalculate Current Weights from Holdings
              </Button>
            )}
          </div>

          {/* Goals & Liabilities Section */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                Goals & Target Liabilities
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-auto bg-white"
                onClick={handleAddGoal}
              >
                <Plus size={13} className="mr-1" /> Add Goal
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {effectiveGoals.map((g) => (
                <div key={g.id} className="grid grid-cols-12 gap-1.5 items-end bg-zinc-50 border border-zinc-200 rounded-xl p-2 text-xs">
                  <div className="col-span-4">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`goal-name-${g.id}`}>
                      Goal
                    </label>
                    <input
                      id={`goal-name-${g.id}`}
                      type="text"
                      value={g.name}
                      onChange={(e) => handleUpdateGoal(g.id, { name: e.target.value })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      aria-label="Goal name"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`goal-priority-${g.id}`}>
                      Tier
                    </label>
                    <select
                      id={`goal-priority-${g.id}`}
                      value={g.priority}
                      onChange={(e) => handleUpdateGoal(g.id, { priority: e.target.value as GoalPriority })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-900"
                      aria-label="Goal priority"
                    >
                      <option value="essential">Essential</option>
                      <option value="important">Important</option>
                      <option value="aspirational">Aspirational</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`goal-years-${g.id}`}>
                      Years
                    </label>
                    <input
                      id={`goal-years-${g.id}`}
                      type="number"
                      min={0}
                      value={g.yearsToGoal}
                      onChange={(e) => handleUpdateGoal(g.id, { yearsToGoal: Number(e.target.value) })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                      aria-label="Years to goal"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5" htmlFor={`goal-target-${g.id}`}>
                      Target
                    </label>
                    <input
                      id={`goal-target-${g.id}`}
                      type="number"
                      min={0}
                      value={g.targetAmount}
                      onChange={(e) => handleUpdateGoal(g.id, { targetAmount: Number(e.target.value) })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-1.5 py-1 text-xs text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                      aria-label="Goal target amount"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(g.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      aria-label="Remove goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {effectiveGoals.length === 0 && (
                <p className="text-xs text-zinc-500 italic p-2">No liabilities scheduled.</p>
              )}
            </div>
          </div>

          {/* Currency Architecture & Hedging */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
              Currency & Hedging Architecture
            </div>
            <LabelledInput
              id={fieldId('baseCurrency')}
              label="Base Currency"
              value={state.baseCurrency}
              onChange={(v) => dispatch({ type: 'updateField', payload: { baseCurrency: v } })}
              placeholder="e.g. INR"
            />
            <NumberInput
              label="Foreign Exposure Limit"
              value={state.foreignExposure}
              onChange={(v) => dispatch({ type: 'updateField', payload: { foreignExposure: v } })}
              suffix="%"
              min={0}
              max={100}
            />
            <div>
              <label
                htmlFor={fieldId('hedgePolicy')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1"
              >
                Hedging Policy Mandate
              </label>
              <textarea
                id={fieldId('hedgePolicy')}
                value={state.hedgePolicy}
                onChange={(e) => dispatch({ type: 'updateField', payload: { hedgePolicy: e.target.value } })}
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Implementation & Governance Rules */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-900">
              Rebalancing Protocols & Governance
            </div>
            <div>
              <label
                htmlFor={fieldId('implementationReview')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1"
              >
                Rebalancing Trigger Policy
              </label>
              <textarea
                id={fieldId('implementationReview')}
                value={state.implementationReview}
                onChange={(e) => dispatch({ type: 'updateField', payload: { implementationReview: e.target.value } })}
                rows={3}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor={fieldId('notes')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1"
              >
                Special Covenants & Exclusions
              </label>
              <textarea
                id={fieldId('notes')}
                value={state.notes}
                onChange={(e) => dispatch({ type: 'updateField', payload: { notes: e.target.value } })}
                rows={2}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-3 border-t border-zinc-200">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-white" onClick={handlePrint}>
                <Printer size={15} className="mr-1.5" /> Print Policy
              </Button>
              <Button className="flex-1 bg-zinc-950 hover:bg-zinc-800 text-white" onClick={handleDownload}>
                <Download size={15} className="mr-1.5" /> Export .md
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? (
                <RefreshCw size={15} className="mr-2 animate-spin" />
              ) : (
                <Save size={15} className="mr-2" />
              )}
              Save Document Snapshot
            </Button>

            {(statusMessage || showToast) && (
              <div
                className={cn(
                  'flex items-center gap-2 text-xs p-2 rounded-lg border',
                  saveStatus === 'error' || loadStatus === 'error' || showToast?.type === 'error'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200',
                )}
              >
                {saveStatus === 'error' || loadStatus === 'error' ? (
                  <AlertCircle size={14} className="shrink-0" />
                ) : (
                  <CheckCircle size={14} className="shrink-0" />
                )}
                <span>{statusMessage || showToast?.message}</span>
              </div>
            )}
          </div>

          {/* Saved Documents Drawer */}
          <div className="pt-3 border-t border-zinc-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-zinc-700" /> Saved Policy Documents
            </h4>
            {savedFiles.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No saved policy snapshots available.</p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {savedFiles.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="truncate max-w-[150px]" title={file.name}>
                      <span className="font-medium text-zinc-900">{file.name}</span>
                      {file.isLocal && (
                        <span className="ml-1 text-[9px] text-zinc-500 font-mono">(local)</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] px-2 py-0.5 h-auto bg-white"
                      onClick={() => handleLoad(file.name)}
                    >
                      Load
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reset Actions */}
          <div className="pt-3 border-t border-zinc-200 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-zinc-600 hover:text-zinc-950"
              onClick={() => dispatch({ type: 'reset', payload: defaultState() })}
            >
              <RotateCcw size={13} className="mr-1" /> Load Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50"
              onClick={() => dispatch({ type: 'reset' })}
            >
              <Eraser size={13} className="mr-1" /> Clear All
            </Button>
          </div>
        </Card>

        {/* Right Column: Institutional Policy Document Preview */}
        <Card className="lg:col-span-2 bg-white border border-zinc-200 shadow-sm rounded-2xl p-6 sm:p-8 md:p-10 text-zinc-900 print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div className="space-y-8 max-w-none">
            {/* Institutional Header Banner */}
            <div className="border-b-2 border-zinc-900 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">
                <span>Sound Thesis Wealth Advisory • Private Wealth Management</span>
                <span className="font-mono text-zinc-700">
                  REF: IPS-{effectiveClient.reviewDate.replace(/-/g, '')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-950 tracking-tight">
                Investment Policy Statement
              </h1>
              <p className="text-sm font-serif italic text-zinc-600 mt-1">
                Sound Thesis Institutional Wealth Policy Standard
              </p>

              {/* Document Meta Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-zinc-200 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] font-semibold uppercase tracking-wider">Client Mandate</span>
                  <span className="font-semibold text-zinc-950">{effectiveClient.name || 'Private Client'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-semibold uppercase tracking-wider">Fiduciary Advisor</span>
                  <span className="font-semibold text-zinc-950">{effectiveClient.advisor || 'Sound Thesis Advisory'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-semibold uppercase tracking-wider">Portfolio NAV</span>
                  <span className="font-semibold text-zinc-950 font-mono">{formatCurrency(effectiveNetWorth)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-semibold uppercase tracking-wider">Ratification Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck size={13} /> Active Mandate
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Client Profile & Governance Scope */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">1</span>
                Client Profile & Governance Scope
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Client Profile table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <tbody className="divide-y divide-zinc-100">
                    <tr className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 font-semibold text-zinc-600 w-1/3">Client Name(s)</td>
                      <td className="py-2 px-3 font-medium text-zinc-950">{effectiveClient.name || '[To be completed]'}</td>
                    </tr>
                    <tr className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 font-semibold text-zinc-600">Current Age & Target Retirement</td>
                      <td className="py-2 px-3 font-medium text-zinc-950">
                        {effectiveClient.currentAge} years (Current) / {effectiveClient.retirementAge} years (Target Retirement)
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 font-semibold text-zinc-600">Planning Longevity Horizon</td>
                      <td className="py-2 px-3 font-medium text-zinc-950">
                        Age {effectiveClient.lifeExpectancy} ({Math.max(0, effectiveClient.lifeExpectancy - effectiveClient.currentAge)} years total horizon)
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 font-semibold text-zinc-600">Lead Fiduciary Adviser</td>
                      <td className="py-2 px-3 font-medium text-zinc-950">{effectiveClient.advisor}</td>
                    </tr>
                    <tr className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 font-semibold text-zinc-600">Mandate Review Date</td>
                      <td className="py-2 px-3 font-medium text-zinc-950">{effectiveClient.reviewDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Investment Objectives & Hurdle Rates */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">2</span>
                Investment Objectives & Return Hurdle
              </h2>
              <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-4 space-y-2 text-sm text-zinc-800 leading-relaxed">
                <p>
                  <strong>Primary Return Mandate:</strong> {effectiveState.returnObjective}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white border border-zinc-200 rounded-lg p-2.5">
                    <span className="text-zinc-500 block uppercase font-semibold text-[10px]">Risk Profile</span>
                    <span className="font-bold text-zinc-950 text-sm">
                      {effectiveRiskTolerance.charAt(0).toUpperCase() + effectiveRiskTolerance.slice(1)}
                    </span>
                    {isLinkedToPlan && (
                      <span className="text-zinc-500 block text-[10px] mt-0.5 font-mono">
                        {riskProfile.label} Model
                      </span>
                    )}
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg p-2.5">
                    <span className="text-zinc-500 block uppercase font-semibold text-[10px]">Max Tolerable Drawdown</span>
                    <span className="font-bold text-zinc-950 text-sm font-mono">
                      -{effectiveMaxDrawdown}% (12M Peak-to-Trough)
                    </span>
                    <span className="text-zinc-500 block text-[10px] mt-0.5">Rolling stress ceiling</span>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg p-2.5">
                    <span className="text-zinc-500 block uppercase font-semibold text-[10px]">Core Inflation Hurdle</span>
                    <span className="font-bold text-zinc-950 text-sm font-mono">
                      {effectiveClient.inflation}% Per Annum
                    </span>
                    <span className="text-zinc-500 block text-[10px] mt-0.5">Purchasing power baseline</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Portfolio Constraints & Liquidity Architecture */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">3</span>
                Portfolio Constraints & Liquidity Horizons
              </h2>
              <div className="space-y-2 text-sm text-zinc-700 leading-relaxed">
                <p>
                  <strong>Liquidity & Reserve Requirement:</strong> Current total liquid and investable net worth stands at{' '}
                  <span className="font-semibold text-zinc-950">{formatCurrency(effectiveNetWorth)}</span>. An emergency
                  liquidity reserve equal to 6–12 months of non-discretionary living expenses is maintained in overnight
                  and ultra-short instruments, isolated from market volatility.
                </p>
                <p>
                  <strong>Time Horizon & Life Phases:</strong> The accumulation phase extends for{' '}
                  <span className="font-semibold text-zinc-950">
                    {Math.max(0, effectiveClient.retirementAge - effectiveClient.currentAge)} years
                  </span>{' '}
                  until age {effectiveClient.retirementAge}, followed by a distribution and capital preservation phase
                  projected at{' '}
                  <span className="font-semibold text-zinc-950">
                    {Math.max(0, effectiveClient.lifeExpectancy - effectiveClient.retirementAge)} years
                  </span>.
                </p>
                <p>
                  <strong>Tax Governance & Location:</strong> Asset location is structured to maximize post-tax compound
                  returns. Long-term capital gains harvesting, dividend efficiency, and sovereign tax-free allocations
                  are reviewed systematically prior to each financial year-end.
                </p>
              </div>
            </div>

            {/* Section 4: Priority-Tiered Goals & Liabilities */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">4</span>
                Priority-Tiered Goals & Liabilities
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Goals and Liabilities table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-50 text-zinc-600 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Goal Objective</th>
                      <th className="py-2.5 px-3">Priority Tier</th>
                      <th className="py-2.5 px-3 text-right">Horizon</th>
                      <th className="py-2.5 px-3 text-right">Target Liability (Today)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {effectiveGoals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-zinc-500 italic text-xs">
                          No specific liabilities or goal targets defined.
                        </td>
                      </tr>
                    )}
                    {effectiveGoals.map((g) => (
                      <tr key={g.id} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3 font-medium text-zinc-950">{g.name || '[Unnamed Goal]'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                              g.priority === 'essential'
                                ? 'bg-zinc-900 text-white'
                                : g.priority === 'important'
                                ? 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                                : 'bg-zinc-50 text-zinc-600 border border-zinc-200',
                            )}
                          >
                            {g.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-700">{g.yearsToGoal} yrs</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-950">
                          {formatCurrency(g.targetAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 5: Strategic Asset Allocation (SAA) & Rebalancing Corridors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">5</span>
                  Strategic Asset Allocation (SAA) & Rebalancing Corridors
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  {hasCorridorBreach ? (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                      <AlertTriangle size={12} /> Drift Breach Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle size={12} /> All Corridors Compliant
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Strategic Asset Allocation table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-50 text-zinc-600 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Asset Class</th>
                      <th className="py-2.5 px-3 text-right">Policy Target</th>
                      <th className="py-2.5 px-3 text-right">Current Weight</th>
                      <th className="py-2.5 px-3 text-right">Tolerance Corridor (±5%)</th>
                      <th className="py-2.5 px-3 text-right">Corridor Drift</th>
                      <th className="py-2.5 px-3 text-center">Policy Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => {
                      const target = effectiveAllocation[cat] || 0;
                      const current = effectiveCurrentAllocation[cat] || 0;
                      const drift = current - target;
                      const isTargetMet = Math.abs(drift) <= 2.0;
                      const isWithinCorridor = Math.abs(drift) <= 5.0;

                      return (
                        <tr key={cat} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-3 font-semibold text-zinc-950">{categoryLabels[cat]}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-950 font-medium">
                            {target.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-950 font-medium">
                            {current.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-zinc-500 font-mono">
                            {Math.max(0, target - 5).toFixed(0)}% – {(target + 5).toFixed(0)}%
                          </td>
                          <td
                            className={cn(
                              'py-2.5 px-3 text-right font-mono text-xs font-bold',
                              isTargetMet
                                ? 'text-emerald-700'
                                : isWithinCorridor
                                ? 'text-zinc-700'
                                : 'text-rose-700',
                            )}
                          >
                            {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isTargetMet ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Target Met
                              </span>
                            ) : isWithinCorridor ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                                Within Corridor
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                                {drift > 0 ? 'Overweight' : 'Deficit / Rebalance'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-zinc-50/80 font-semibold border-t-2 border-zinc-300 text-xs">
                    <tr>
                      <td className="py-2.5 px-3 text-zinc-950">Total SAA Weight</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-950">
                        {totalAllocation.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-950">
                        {Object.values(effectiveCurrentAllocation).reduce((a, b) => a + b, 0).toFixed(1)}%
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-right">
                        {hasCorridorBreach ? (
                          <span className="text-rose-700 font-bold">Rebalancing Trigger Breached (±5.0% Rule)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Strategic Portfolio Within Policy Corridors</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasCorridorBreach ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                            Action Triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Compliant
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Section 6: Balance Sheet Inventory & Holdings Schedule */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">6</span>
                Balance Sheet Inventory & Asset Schedule
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Current Holdings table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-zinc-50 text-zinc-600 text-[11px] font-semibold uppercase tracking-wider border-b border-zinc-200">
                    <tr>
                      <th className="py-2.5 px-3">Instrument / Asset Name</th>
                      <th className="py-2.5 px-3">Asset Category</th>
                      <th className="py-2.5 px-3 text-right">Present Market Value</th>
                      <th className="py-2.5 px-3 text-right">Portfolio Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {effectiveAssets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-zinc-500 italic text-xs">
                          No asset holdings entered into balance sheet.
                        </td>
                      </tr>
                    )}
                    {effectiveAssets.map((a) => {
                      const share = effectiveNetWorth > 0 ? (a.value / effectiveNetWorth) * 100 : 0;
                      return (
                        <tr key={a.id} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3 font-medium text-zinc-950">{a.name || '[Unnamed Instrument]'}</td>
                          <td className="py-2 px-3 text-zinc-600">{categoryLabels[a.category]}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-950">
                            {formatCurrency(a.value)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-zinc-500 text-xs">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-zinc-50 font-semibold border-t border-zinc-200 text-xs">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-zinc-950">Total Portfolio Valuation</td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-950 text-sm">
                        {formatCurrency(effectiveNetWorth)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-zinc-500">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Section 7: Currency Policy & Hedging Architecture */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">7</span>
                Currency Architecture & Hedging Mandate
              </h2>
              <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-4 space-y-2 text-sm text-zinc-800 leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-zinc-200 text-xs">
                  <div>
                    <span className="text-zinc-500 block uppercase font-semibold text-[10px]">Base Reporting Currency</span>
                    <span className="font-bold text-zinc-950 text-sm">{effectiveState.baseCurrency || 'INR'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block uppercase font-semibold text-[10px]">Offshore Exposure Cap</span>
                    <span className="font-bold text-zinc-950 text-sm font-mono">{effectiveState.foreignExposure}% Maximum</span>
                  </div>
                </div>
                <p className="pt-1">
                  <strong>Hedging Directive:</strong> {effectiveState.hedgePolicy}
                </p>
              </div>
            </div>

            {/* Section 8: Rebalancing Protocols & Governance Rules */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">8</span>
                Execution Protocols & Rebalancing Rules
              </h2>
              <div className="space-y-2.5 text-sm text-zinc-700 leading-relaxed">
                <p>
                  <strong>1. Corridor Drift Monitoring:</strong> Asset allocation is tracked on a continuous basis. A formal
                  rebalancing execution is triggered whenever any strategic asset class deviates by more than ±5.0% absolute
                  from its target policy weighting.
                </p>
                <p>
                  <strong>2. Cash Flow Directed Rebalancing:</strong> Regular monthly SIP contributions, incoming dividend
                  yields, and interest coupons are directed toward underweight asset classes to minimize unnecessary transaction
                  friction and capital gains realization.
                </p>
                <p>
                  <strong>3. Fiduciary Review Cycle:</strong> A comprehensive review of suitability, capital market assumptions,
                  and life liabilities is conducted annually, or immediately upon significant client life events (e.g. liquidity
                  events, employment changes, or risk profile shifts).
                </p>
                {effectiveState.implementationReview && (
                  <div className="bg-zinc-50 border-l-2 border-zinc-900 p-3 rounded-r-xl text-xs text-zinc-800 italic mt-2">
                    "{effectiveState.implementationReview}"
                  </div>
                )}
              </div>
            </div>

            {/* Section 9: Special Covenants & Mandate Exclusions */}
            {effectiveState.notes && (
              <div className="space-y-3">
                <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">9</span>
                  Special Covenants & Mandate Exclusions
                </h2>
                <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-4 text-sm text-zinc-800 leading-relaxed">
                  <p>{effectiveState.notes}</p>
                </div>
              </div>
            )}

            {/* Section 10: Fiduciary Execution & Ratification */}
            <div className="pt-6 border-t-2 border-zinc-900 space-y-6">
              <div>
                <h2 className="text-base font-serif font-bold text-zinc-950 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] flex items-center justify-center font-sans font-bold">10</span>
                  Fiduciary Execution & Ratification
                </h2>
                <p className="text-xs text-zinc-500 mt-1 italic">
                  By signing below, the Client and the Lead Fiduciary Adviser acknowledge and ratify the governance
                  corridors, return hurdles, and asset allocation parameters set forth in this Investment Policy Statement.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="space-y-5 bg-zinc-50/50 border border-zinc-200 rounded-xl p-4">
                  <div className="border-b border-zinc-300 pb-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Primary Client</span>
                    <span className="font-semibold text-zinc-950 text-sm">
                      {effectiveClient.name || 'Client Name(s)'}
                    </span>
                  </div>
                  <div className="h-10 flex items-end">
                    <div className="w-full border-b border-zinc-400 border-dashed" />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Signature</span>
                    <span>Date: {effectiveClient.reviewDate}</span>
                  </div>
                </div>

                <div className="space-y-5 bg-zinc-50/50 border border-zinc-200 rounded-xl p-4">
                  <div className="border-b border-zinc-300 pb-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Fiduciary Adviser</span>
                    <span className="font-semibold text-zinc-950 text-sm">
                      {effectiveClient.advisor || 'Sound Thesis Wealth Advisory'}
                    </span>
                  </div>
                  <div className="h-10 flex items-end">
                    <div className="w-full border-b border-zinc-400 border-dashed" />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Authorized Fiduciary Signature</span>
                    <span>Date: {effectiveClient.reviewDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="print:hidden">
        <WorkflowFooter
          prev={{ path: '/reports', label: 'Reports' }}
          next={{ path: '/calculators', label: 'Calculators' }}
          flowHint="A formal Investment Policy Statement institutionalizes your strategic asset allocation, corridor tolerances, and rebalancing rules."
        />
      </div>
    </div>
  );
};

function LabelledInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
      />
    </div>
  );
}

function LabelledDate({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none transition-colors"
      />
    </div>
  );
}

export function generateIPSMarkdown(state: IPSState, netWorth: number): string {
  const goalsMd =
    state.goals.length === 0
      ? '_No specific goals entered._'
      : state.goals
          .map(
            (g) =>
              `- **${g.name || '[Unnamed Goal]'}** (${g.priority.toUpperCase()} priority): ${g.yearsToGoal} years horizon, ₹${g.targetAmount.toLocaleString('en-IN')}`,
          )
          .join('\n');

  const assetsMd =
    state.assets.length === 0
      ? '_No asset holdings recorded._'
      : state.assets
          .map(
            (a) =>
              `- **${a.name || '[Unnamed Holding]'}** (${categoryLabels[a.category]}): ₹${a.value.toLocaleString('en-IN')}`,
          )
          .join('\n');

  return `# Investment Policy Statement
_Sound Thesis Institutional Wealth Policy Standard_

## 1. Client Identification & Governance Scope

- **Client Name(s):** ${state.client.name || '[To be completed]'}
- **Current Age:** ${state.client.currentAge}
- **Retirement Age:** ${state.client.retirementAge}
- **Life Expectancy Horizon:** ${state.client.lifeExpectancy}
- **Fiduciary Adviser / Firm:** ${state.client.advisor}
- **Review Date:** ${state.client.reviewDate}

## 2. Investment Objectives & Hurdle Rates

- **Return Objective:** ${state.returnObjective}
- **Risk Tolerance:** ${state.riskTolerance.charAt(0).toUpperCase() + state.riskTolerance.slice(1)}
- **Maximum Acceptable Drawdown:** ${state.maxDrawdown}% (12-month peak-to-trough corridor)
- **Inflation Baseline Assumption:** ${state.client.inflation}%

## 3. Portfolio Constraints & Liquidity Architecture

- **Liquidity:** Current total investable valuation is ₹${netWorth.toLocaleString('en-IN')}.
- **Planning Horizons:** ${Math.max(0, state.client.retirementAge - state.client.currentAge)} years accumulation phase; ${Math.max(0, state.client.lifeExpectancy - state.client.retirementAge)} years distribution phase.
- **Tax Governance:** Asset location and tax-loss harvesting reviewed systematically prior to fiscal year-end.

## 4. Priority-Tiered Goals & Liabilities

${goalsMd}

## 5. Strategic Asset Allocation (SAA) & Rebalancing Corridors

| Asset Class | Policy Target | Current Weight | Corridor (±5%) | Drift | Policy Status |
|-------------|---------------|----------------|----------------|-------|---------------|
| Equity | ${state.allocation.equity}% | ${state.currentAllocation.equity.toFixed(1)}% | ${Math.max(0, state.allocation.equity - 5)}% – ${state.allocation.equity + 5}% | ${(state.currentAllocation.equity - state.allocation.equity).toFixed(1)}% | ${Math.abs(state.currentAllocation.equity - state.allocation.equity) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.equity - state.allocation.equity) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Debt | ${state.allocation.debt}% | ${state.currentAllocation.debt.toFixed(1)}% | ${Math.max(0, state.allocation.debt - 5)}% – ${state.allocation.debt + 5}% | ${(state.currentAllocation.debt - state.allocation.debt).toFixed(1)}% | ${Math.abs(state.currentAllocation.debt - state.allocation.debt) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.debt - state.allocation.debt) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Gold | ${state.allocation.gold}% | ${state.currentAllocation.gold.toFixed(1)}% | ${Math.max(0, state.allocation.gold - 5)}% – ${state.allocation.gold + 5}% | ${(state.currentAllocation.gold - state.allocation.gold).toFixed(1)}% | ${Math.abs(state.currentAllocation.gold - state.allocation.gold) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.gold - state.allocation.gold) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Real Estate | ${state.allocation.realestate}% | ${state.currentAllocation.realestate.toFixed(1)}% | ${Math.max(0, state.allocation.realestate - 5)}% – ${state.allocation.realestate + 5}% | ${(state.currentAllocation.realestate - state.allocation.realestate).toFixed(1)}% | ${Math.abs(state.currentAllocation.realestate - state.allocation.realestate) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.realestate - state.allocation.realestate) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Liquid | ${state.allocation.liquid}% | ${state.currentAllocation.liquid.toFixed(1)}% | ${Math.max(0, state.allocation.liquid - 5)}% – ${state.allocation.liquid + 5}% | ${(state.currentAllocation.liquid - state.allocation.liquid).toFixed(1)}% | ${Math.abs(state.currentAllocation.liquid - state.allocation.liquid) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.liquid - state.allocation.liquid) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Other | ${state.allocation.other}% | ${state.currentAllocation.other.toFixed(1)}% | ${Math.max(0, state.allocation.other - 5)}% – ${state.allocation.other + 5}% | ${(state.currentAllocation.other - state.allocation.other).toFixed(1)}% | ${Math.abs(state.currentAllocation.other - state.allocation.other) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.other - state.allocation.other) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |

## 6. Balance Sheet Inventory & Asset Schedule

${assetsMd}

## 7. Currency Architecture & Hedging Mandate

- **Base Reporting Currency:** ${state.baseCurrency || 'INR'}
- **Offshore Exposure Limit:** ${state.foreignExposure}%
- **Hedging Directive:** ${state.hedgePolicy}

## 8. Execution Protocols & Rebalancing Rules

${state.implementationReview}

## 9. Special Covenants & Mandate Exclusions

${state.notes || 'No specific restrictions or covenants registered.'}

## 10. Fiduciary Execution & Ratification

- **Client Signature:** ____________________________________ Date: ${state.client.reviewDate}
- **Fiduciary Adviser Signature:** ____________________________ Date: ${state.client.reviewDate}
`;
}

export function parseIPSMarkdown(md: string): IPSState {
  const next = defaultState();
  const field = (label: string) => {
    const m = md.match(new RegExp(`^\\s*-\\s*\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const num = (raw: string | null) => {
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  };

  const clientName = field('Client [Nn]ame\\(s\\)');
  if (clientName && clientName !== '[To be completed]') next.client.name = clientName;
  const adviser = field('(?:Adviser / firm|Fiduciary Adviser / Firm)');
  if (adviser) next.client.advisor = adviser;
  const reviewDate = field('(?:Next review date|Review Date)');
  if (reviewDate && /^\d{4}-\d{2}-\d{2}/.test(reviewDate)) next.client.reviewDate = reviewDate.slice(0, 10);

  const currentAge = num(field('Current [Aa]ge'));
  if (currentAge !== null) next.client.currentAge = Math.round(currentAge);
  const retirementAge = num(field('Retirement [Aa]ge'));
  if (retirementAge !== null) next.client.retirementAge = Math.round(retirementAge);
  const lifeExpectancy = num(field('(?:Life [Ee]xpectancy|Life Expectancy Horizon)'));
  if (lifeExpectancy !== null) next.client.lifeExpectancy = Math.round(lifeExpectancy);

  const returnObjective = field('Return [Oo]bjective');
  if (returnObjective) next.returnObjective = returnObjective;
  const riskTolerance = field('Risk [Tt]olerance')?.toLowerCase();
  if (riskTolerance?.includes('low')) next.riskTolerance = 'low';
  else if (riskTolerance?.includes('moderate')) next.riskTolerance = 'moderate';
  else if (riskTolerance?.includes('high')) next.riskTolerance = 'high';

  const maxDrawdown = num(field('(?:Maximum acceptable drawdown|Maximum Acceptable Drawdown)'));
  if (maxDrawdown !== null) next.maxDrawdown = maxDrawdown;

  const inflation = num(field('(?:Inflation assumption|Inflation Baseline Assumption)'));
  if (inflation !== null) next.client.inflation = inflation;

  // Table row parser for SAA targets
  const row = (label: string) => {
    const m = md.match(new RegExp(`^\\s*\\|\\s*${label}\\s*\\|\\s*([\\d.]+)%\\s*\\|\\s*([\\d.]+)%`, 'm'));
    return m ? { target: parseFloat(m[1]), current: parseFloat(m[2]) } : null;
  };

  const equity = row('Equity');
  if (equity) {
    next.allocation.equity = equity.target;
    next.currentAllocation.equity = equity.current;
  }
  const debt = row('Debt');
  if (debt) {
    next.allocation.debt = debt.target;
    next.currentAllocation.debt = debt.current;
  }
  const gold = row('Gold');
  if (gold) {
    next.allocation.gold = gold.target;
    next.currentAllocation.gold = gold.current;
  }
  const realestate = row('Real Estate');
  if (realestate) {
    next.allocation.realestate = realestate.target;
    next.currentAllocation.realestate = realestate.current;
  }
  const liquid = row('Liquid');
  if (liquid) {
    next.allocation.liquid = liquid.target;
    next.currentAllocation.liquid = liquid.current;
  }
  const other = row('Other');
  if (other) {
    next.allocation.other = other.target;
    next.currentAllocation.other = other.current;
  }

  const foreignExposure = num(field('(?:Foreign exposure limit|Offshore Exposure Limit)'));
  if (foreignExposure !== null) next.foreignExposure = foreignExposure;
  const hedgePolicy = field('(?:Hedging policy|Hedging Directive)');
  if (hedgePolicy) next.hedgePolicy = hedgePolicy;

  const baseCurrency = field('(?:Base currency|Base Reporting Currency)');
  if (baseCurrency) next.baseCurrency = baseCurrency;

  const implementationMatch = md.match(/##\s*(?:8\.\s*)?(?:Implementation & Review|Execution Protocols & Rebalancing Rules)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (implementationMatch) {
    next.implementationReview = implementationMatch[1].trim();
  }

  const notesMatch = md.match(/##\s*(?:9\.\s*)?(?:Special Notes|Special Covenants & Mandate Exclusions)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (notesMatch) {
    const notes = notesMatch[1].trim();
    next.notes = notes === 'None.' || notes.startsWith('No specific restrictions') ? '' : notes;
  }

  // Parse goals
  const goalsMatch = md.match(/##\s*(?:4\.\s*)?(?:Goals|Priority-Tiered Goals & Liabilities)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (goalsMatch) {
    const parsedGoals: IPSGoal[] = [];
    const lines = goalsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(?:\*\*)?(.+?)(?:\*\*)?\s+\((?:(essential|important|aspirational)(?:\s+priority)?)\):\s+(\d+)\s+years?(?:\s+horizon)?,\s*₹?([\d,]+)/i);
      if (m) {
        parsedGoals.push({
          id: `g${idx++}`,
          name: m[1].trim(),
          priority: m[2].toLowerCase() as GoalPriority,
          yearsToGoal: parseInt(m[3], 10),
          targetAmount: parseInt(m[4].replace(/,/g, ''), 10),
        });
      }
    }
    if (parsedGoals.length > 0) next.goals = parsedGoals;
  }

  // Parse assets
  const assetsMatch = md.match(/##\s*(?:6\.\s*)?(?:Current Holdings|Balance Sheet Inventory & Asset Schedule)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (assetsMatch) {
    const parsedAssets: IPSAsset[] = [];
    const lines = assetsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(?:\*\*)?(.+?)(?:\*\*)?\s+\((Equity|Debt|Gold|Real Estate|Liquid|Other)\):\s*₹?([\d,]+)/i);
      if (m) {
        const catMap: Record<string, AssetCategory> = {
          Equity: 'equity',
          Debt: 'debt',
          Gold: 'gold',
          'Real Estate': 'realestate',
          Liquid: 'liquid',
          Other: 'other',
        };
        parsedAssets.push({
          id: `a${idx++}`,
          name: m[1].trim(),
          category: catMap[m[2]],
          value: parseInt(m[3].replace(/,/g, ''), 10),
        });
      }
    }
    if (parsedAssets.length > 0) next.assets = parsedAssets;
  }

  return next;
}
