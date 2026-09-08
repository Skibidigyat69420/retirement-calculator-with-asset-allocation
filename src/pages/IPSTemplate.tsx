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
import {
  categoryLabels,
  defaultState,
  generateIPSMarkdown,
  parseIPSMarkdown,
  type IPSAsset,
  type IPSGoal,
  type IPSState,
} from '../lib/ipsMarkdown';

const STORAGE_KEY = 'soundthesis_ips_state_v1';
const LOCAL_SAVED_DRAFTS_KEY = 'soundthesis_saved_ips_drafts';

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

  const loadSavedFiles = useCallback(async (): Promise<SavedIPS[]> => {
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

    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSavedFiles().then((list) => {
      if (!cancelled) setSavedFiles(list);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSavedFiles]);

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaveStatus('saving');
    setStatusMessage(null);
    const content = generateIPSMarkdown(effectiveState, effectiveNetWorth);
    const filename = `IPS-${(effectiveClient.name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_')}-${effectiveClient.reviewDate}`;

    // The API layer is read-only; the IPS draft persists to browser storage
    // and can be exported via the .md download.
    try {
      const raw = localStorage.getItem(LOCAL_SAVED_DRAFTS_KEY);
      const existing: any[] = raw ? JSON.parse(raw) : [];
      const updated = [
        { name: filename, updatedAt: new Date().toISOString(), content },
        ...existing.filter((f) => f.name !== filename),
      ].slice(0, 20);
      localStorage.setItem(LOCAL_SAVED_DRAFTS_KEY, JSON.stringify(updated));

      setSaveStatus('saved');
      setStatusMessage(`Saved locally (${filename})`);
      setShowToast({ message: 'IPS saved locally to browser storage.', type: 'success' });
      setSavedFiles(await loadSavedFiles());
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
        <div className="flex items-center gap-2 self-start md:self-auto bg-sunken p-1 rounded-xl border border-border print:hidden shadow-2xs">
          <button
            type="button"
            onClick={() => handleSetLinkedMode(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              isLinkedToPlan
                ? 'bg-sunken text-ink shadow-xs'
                : 'text-muted hover:text-ink',
            )}
          >
            <Link2 size={13} className={isLinkedToPlan ? 'text-emerald-400' : 'text-faint'} />
            Linked to Active Plan
          </button>
          <button
            type="button"
            onClick={() => handleSetLinkedMode(false)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              !isLinkedToPlan
                ? 'bg-sunken text-ink shadow-xs'
                : 'text-muted hover:text-ink',
            )}
          >
            <FileText size={13} className={!isLinkedToPlan ? 'text-ink-soft' : 'text-faint'} />
            Independent Draft
          </button>
        </div>
      </div>

      {/* Mode Status Callout */}
      <div className="print:hidden">
        {isLinkedToPlan ? (
          <Card className="bg-surface border-border shadow-2xs p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-positive/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Link2 size={16} className="text-positive" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-positive">
                      Live Plan Synchronization Active
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs text-muted mt-0.5">
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
                    className="text-[11px] text-muted hover:text-ink underline font-medium"
                    title="Clear manual overrides and reset targets to risk model"
                  >
                    Reset Targets
                  </button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-sunken/70 border-border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sunken border border-border-strong flex items-center justify-center shrink-0 mt-0.5">
                  <Unlink size={16} className="text-ink-soft" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Independent Sandbox Draft Mode
                  </span>
                  <p className="text-xs text-muted mt-0.5">
                    Isolated local draft saved in your browser cache. Changes here do not modify your active Master Plan inputs or risk profile.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1.5 h-auto self-start sm:self-auto shrink-0 bg-surface"
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
        <Card className="lg:col-span-1 space-y-6 bg-surface border-border print:hidden p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold text-ink flex items-center gap-2">
              <FileText size={18} className="text-ink" /> Policy Parameters
            </h3>
            <span className="text-[11px] font-mono text-muted">
              {isLinkedToPlan ? 'LIVE SYNC' : 'STANDALONE'}
            </span>
          </div>

          {/* Client Profile Section */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center justify-between">
              <span>Client Identification</span>
              {isLinkedToPlan && (
                <span className="text-[10px] font-normal text-positive flex items-center gap-1">
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
              label="Fiduciary Advisor / Firm"
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
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
              Objectives & Risk Boundaries
            </div>

            <div>
              <label
                htmlFor={fieldId('returnObjective')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Return Objective & Hurdle Rate
              </label>
              <textarea
                id={fieldId('returnObjective')}
                value={state.returnObjective}
                onChange={(e) => dispatch({ type: 'updateField', payload: { returnObjective: e.target.value } })}
                rows={3}
                className="w-full bg-sunken border border-border rounded-xl p-3 text-sm text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
                placeholder="Codify the primary target return and purchasing power preservation goals..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={fieldId('riskTolerance')}
                  className="block text-[11px] font-semibold uppercase tracking-wider text-muted"
                >
                  Behavioral Risk Tolerance
                </label>
                {isLinkedToPlan && (
                  <span className="text-[10px] text-muted font-medium">
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
                className="w-full px-3 py-2 bg-sunken border border-border rounded-xl text-sm text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none"
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
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
                Strategic Asset Allocation (SAA)
              </div>
              {isLinkedToPlan && manualTargets && (
                <button
                  type="button"
                  onClick={handleResetAllocationToRiskProfile}
                  className="text-[11px] text-muted hover:text-ink underline"
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
                  ? 'bg-positive-soft text-positive border-positive/40'
                  : 'bg-rose-50 text-negative border-negative/40',
              )}
            >
              <span>Total SAA Target: {totalAllocation.toFixed(1)}%</span>
              {allocationOk ? (
                <span className="flex items-center gap-1 text-positive">
                  <CheckCircle size={14} /> 100% Validated
                </span>
              ) : (
                <span className="flex items-center gap-1 text-negative">
                  <AlertTriangle size={14} /> Must equal 100.0%
                </span>
              )}
            </div>
          </div>

          {/* Current Portfolio Holdings */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
                  Holdings & Asset Inventory
                </div>
                <div className="text-[11px] text-muted font-mono">
                  Valuation: {formatCurrency(effectiveNetWorth)}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-auto bg-surface"
                onClick={handleAddAsset}
              >
                <Plus size={13} className="mr-1" /> Add Asset
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {effectiveAssets.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-1.5 items-end bg-sunken border border-border rounded-xl p-2 text-xs">
                  <div className="col-span-5">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`asset-name-${a.id}`}>
                      Holding
                    </label>
                    <input
                      id={`asset-name-${a.id}`}
                      type="text"
                      value={a.name}
                      onChange={(e) => handleUpdateAsset(a.id, { name: e.target.value })}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-border"
                      aria-label="Asset name"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`asset-category-${a.id}`}>
                      Class
                    </label>
                    <select
                      id={`asset-category-${a.id}`}
                      value={a.category}
                      onChange={(e) => handleUpdateAsset(a.id, { category: e.target.value as AssetCategory })}
                      className="w-full bg-surface border border-border rounded-lg px-1.5 py-1 text-xs text-ink focus:outline-none focus:border-border"
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
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`asset-value-${a.id}`}>
                      Value (₹)
                    </label>
                    <input
                      id={`asset-value-${a.id}`}
                      type="number"
                      min={0}
                      value={a.value}
                      onChange={(e) => handleUpdateAsset(a.id, { value: Number(e.target.value) })}
                      className="w-full bg-surface border border-border rounded-lg px-1.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-border"
                      aria-label="Asset value"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(a.id)}
                      className="p-1 text-faint hover:text-negative hover:bg-rose-50 rounded transition-colors"
                      aria-label="Remove asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {effectiveAssets.length === 0 && (
                <p className="text-xs text-muted italic p-2">No assets recorded in schedule.</p>
              )}
            </div>

            {!isLinkedToPlan && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs py-1 h-auto text-ink-soft hover:text-ink border border-border"
                onClick={() => dispatch({ type: 'syncCurrentAllocationFromAssets' })}
              >
                Recalculate Current Weights from Holdings
              </Button>
            )}
          </div>

          {/* Goals & Liabilities Section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
                Goals & Target Liabilities
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-auto bg-surface"
                onClick={handleAddGoal}
              >
                <Plus size={13} className="mr-1" /> Add Goal
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {effectiveGoals.map((g) => (
                <div key={g.id} className="grid grid-cols-12 gap-1.5 items-end bg-sunken border border-border rounded-xl p-2 text-xs">
                  <div className="col-span-4">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`goal-name-${g.id}`}>
                      Goal
                    </label>
                    <input
                      id={`goal-name-${g.id}`}
                      type="text"
                      value={g.name}
                      onChange={(e) => handleUpdateGoal(g.id, { name: e.target.value })}
                      className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-border"
                      aria-label="Goal name"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`goal-priority-${g.id}`}>
                      Tier
                    </label>
                    <select
                      id={`goal-priority-${g.id}`}
                      value={g.priority}
                      onChange={(e) => handleUpdateGoal(g.id, { priority: e.target.value as GoalPriority })}
                      className="w-full bg-surface border border-border rounded-lg px-1.5 py-1 text-xs text-ink focus:outline-none focus:border-border"
                      aria-label="Goal priority"
                    >
                      <option value="essential">Essential</option>
                      <option value="important">Important</option>
                      <option value="aspirational">Aspirational</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`goal-years-${g.id}`}>
                      Years
                    </label>
                    <input
                      id={`goal-years-${g.id}`}
                      type="number"
                      min={0}
                      value={g.yearsToGoal}
                      onChange={(e) => handleUpdateGoal(g.id, { yearsToGoal: Number(e.target.value) })}
                      className="w-full bg-surface border border-border rounded-lg px-1.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-border"
                      aria-label="Years to goal"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[9px] font-semibold uppercase tracking-wider text-muted mb-0.5" htmlFor={`goal-target-${g.id}`}>
                      Target
                    </label>
                    <input
                      id={`goal-target-${g.id}`}
                      type="number"
                      min={0}
                      value={g.targetAmount}
                      onChange={(e) => handleUpdateGoal(g.id, { targetAmount: Number(e.target.value) })}
                      className="w-full bg-surface border border-border rounded-lg px-1.5 py-1 text-xs text-ink font-mono focus:outline-none focus:border-border"
                      aria-label="Goal target amount"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveGoal(g.id)}
                      className="p-1 text-faint hover:text-negative hover:bg-rose-50 rounded transition-colors"
                      aria-label="Remove goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {effectiveGoals.length === 0 && (
                <p className="text-xs text-muted italic p-2">No liabilities scheduled.</p>
              )}
            </div>
          </div>

          {/* Currency Architecture & Hedging */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
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
                className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Hedging Policy Mandate
              </label>
              <textarea
                id={fieldId('hedgePolicy')}
                value={state.hedgePolicy}
                onChange={(e) => dispatch({ type: 'updateField', payload: { hedgePolicy: e.target.value } })}
                rows={2}
                className="w-full bg-sunken border border-border rounded-xl p-3 text-sm text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Implementation & Governance Rules */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink">
              Rebalancing Protocols & Governance
            </div>
            <div>
              <label
                htmlFor={fieldId('implementationReview')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Rebalancing Trigger Policy
              </label>
              <textarea
                id={fieldId('implementationReview')}
                value={state.implementationReview}
                onChange={(e) => dispatch({ type: 'updateField', payload: { implementationReview: e.target.value } })}
                rows={3}
                className="w-full bg-sunken border border-border rounded-xl p-3 text-sm text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor={fieldId('notes')}
                className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Special Covenants & Exclusions
              </label>
              <textarea
                id={fieldId('notes')}
                value={state.notes}
                onChange={(e) => dispatch({ type: 'updateField', payload: { notes: e.target.value } })}
                rows={2}
                className="w-full bg-sunken border border-border rounded-xl p-3 text-sm text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-surface" onClick={handlePrint}>
                <Printer size={15} className="mr-1.5" /> Print Policy
              </Button>
              <Button className="flex-1 bg-sunken hover:bg-raised text-ink" onClick={handleDownload}>
                <Download size={15} className="mr-1.5" /> Export .md
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full bg-sunken hover:bg-raised text-ink border-border"
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
                    ? 'text-negative bg-rose-50 border-negative/40'
                    : 'text-positive bg-emerald-50 border-positive/40',
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
          <div className="pt-3 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 mb-2">
              <FolderOpen size={14} className="text-ink-soft" /> Saved Policy Documents
            </h4>
            {savedFiles.length === 0 ? (
              <p className="text-xs text-muted italic">No saved policy snapshots available.</p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {savedFiles.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between text-xs bg-sunken border border-border rounded-lg px-2.5 py-1.5"
                  >
                    <div className="truncate max-w-[150px]" title={file.name}>
                      <span className="font-medium text-ink">{file.name}</span>
                      {file.isLocal && (
                        <span className="ml-1 text-[9px] text-muted font-mono">(local)</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] px-2 py-0.5 h-auto bg-surface"
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
          <div className="pt-3 border-t border-border flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-muted hover:text-ink"
              onClick={() => dispatch({ type: 'reset', payload: defaultState() })}
            >
              <RotateCcw size={13} className="mr-1" /> Load Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-negative hover:text-negative hover:bg-rose-50"
              onClick={() => dispatch({ type: 'reset' })}
            >
              <Eraser size={13} className="mr-1" /> Clear All
            </Button>
          </div>
        </Card>

        {/* Right Column: Institutional Policy Document Preview */}
        <Card className="lg:col-span-2 bg-surface border border-border shadow-sm rounded-2xl p-6 sm:p-8 md:p-10 text-ink print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div className="space-y-8 max-w-none">
            {/* Institutional Header Banner */}
            <div className="border-b-2 border-border-strong pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs uppercase tracking-widest text-muted font-semibold mb-2">
                <span>Sound Thesis Wealth Advisory • Private Wealth Management</span>
                <span className="font-mono text-ink-soft">
                  REF: IPS-{effectiveClient.reviewDate.replace(/-/g, '')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink tracking-tight">
                Investment Policy Statement
              </h1>
              <p className="text-sm font-serif italic text-muted mt-1">
                Sound Thesis Institutional Wealth Policy Standard
              </p>

              {/* Document Meta Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border text-xs">
                <div>
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Client Mandate</span>
                  <span className="font-semibold text-ink">{effectiveClient.name || 'Private Client'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Fiduciary Advisor</span>
                  <span className="font-semibold text-ink">{effectiveClient.advisor || 'Sound Thesis Advisory'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Portfolio NAV</span>
                  <span className="font-semibold text-ink font-mono">{formatCurrency(effectiveNetWorth)}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] font-semibold uppercase tracking-wider">Ratification Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-positive">
                    <ShieldCheck size={13} /> Active Mandate
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Client Profile & Governance Scope */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">1</span>
                Client Profile & Governance Scope
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Client Profile table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-sunken/50">
                      <td className="py-2 px-3 font-semibold text-muted w-1/3">Client Name(s)</td>
                      <td className="py-2 px-3 font-medium text-ink">{effectiveClient.name || '[To be completed]'}</td>
                    </tr>
                    <tr className="hover:bg-sunken/50">
                      <td className="py-2 px-3 font-semibold text-muted">Current Age & Target Retirement</td>
                      <td className="py-2 px-3 font-medium text-ink">
                        {effectiveClient.currentAge} years (Current) / {effectiveClient.retirementAge} years (Target Retirement)
                      </td>
                    </tr>
                    <tr className="hover:bg-sunken/50">
                      <td className="py-2 px-3 font-semibold text-muted">Planning Longevity Horizon</td>
                      <td className="py-2 px-3 font-medium text-ink">
                        Age {effectiveClient.lifeExpectancy} ({Math.max(0, effectiveClient.lifeExpectancy - effectiveClient.currentAge)} years total horizon)
                      </td>
                    </tr>
                    <tr className="hover:bg-sunken/50">
                      <td className="py-2 px-3 font-semibold text-muted">Lead Fiduciary Advisor</td>
                      <td className="py-2 px-3 font-medium text-ink">{effectiveClient.advisor}</td>
                    </tr>
                    <tr className="hover:bg-sunken/50">
                      <td className="py-2 px-3 font-semibold text-muted">Mandate Review Date</td>
                      <td className="py-2 px-3 font-medium text-ink">{effectiveClient.reviewDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Investment Objectives & Hurdle Rates */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">2</span>
                Investment Objectives & Return Hurdle
              </h2>
              <div className="bg-sunken/70 border border-border rounded-xl p-4 space-y-2 text-sm text-ink-soft leading-relaxed">
                <p>
                  <strong>Primary Return Mandate:</strong> {effectiveState.returnObjective}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-surface border border-border rounded-lg p-2.5">
                    <span className="text-muted block uppercase font-semibold text-[10px]">Risk Profile</span>
                    <span className="font-bold text-ink text-sm">
                      {effectiveRiskTolerance.charAt(0).toUpperCase() + effectiveRiskTolerance.slice(1)}
                    </span>
                    {isLinkedToPlan && (
                      <span className="text-muted block text-[10px] mt-0.5 font-mono">
                        {riskProfile.label} Model
                      </span>
                    )}
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-2.5">
                    <span className="text-muted block uppercase font-semibold text-[10px]">Max Tolerable Drawdown</span>
                    <span className="font-bold text-ink text-sm font-mono">
                      -{effectiveMaxDrawdown}% (12M Peak-to-Trough)
                    </span>
                    <span className="text-muted block text-[10px] mt-0.5">Rolling stress ceiling</span>
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-2.5">
                    <span className="text-muted block uppercase font-semibold text-[10px]">Core Inflation Hurdle</span>
                    <span className="font-bold text-ink text-sm font-mono">
                      {effectiveClient.inflation}% Per Annum
                    </span>
                    <span className="text-muted block text-[10px] mt-0.5">Purchasing power baseline</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Portfolio Constraints & Liquidity Architecture */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">3</span>
                Portfolio Constraints & Liquidity Horizons
              </h2>
              <div className="space-y-2 text-sm text-ink-soft leading-relaxed">
                <p>
                  <strong>Liquidity & Reserve Requirement:</strong> Current total liquid and investable net worth stands at{' '}
                  <span className="font-semibold text-ink">{formatCurrency(effectiveNetWorth)}</span>. An emergency
                  liquidity reserve equal to 6–12 months of non-discretionary living expenses is maintained in overnight
                  and ultra-short instruments, isolated from market volatility.
                </p>
                <p>
                  <strong>Time Horizon & Life Phases:</strong> The accumulation phase extends for{' '}
                  <span className="font-semibold text-ink">
                    {Math.max(0, effectiveClient.retirementAge - effectiveClient.currentAge)} years
                  </span>{' '}
                  until age {effectiveClient.retirementAge}, followed by a distribution and capital preservation phase
                  projected at{' '}
                  <span className="font-semibold text-ink">
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
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">4</span>
                Priority-Tiered Goals & Liabilities
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Goals and Liabilities table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-sunken text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Goal Objective</th>
                      <th className="py-2.5 px-3">Priority Tier</th>
                      <th className="py-2.5 px-3 text-right">Horizon</th>
                      <th className="py-2.5 px-3 text-right">Target Liability (Today)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {effectiveGoals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted italic text-xs">
                          No specific liabilities or goal targets defined.
                        </td>
                      </tr>
                    )}
                    {effectiveGoals.map((g) => (
                      <tr key={g.id} className="hover:bg-sunken/50">
                        <td className="py-2 px-3 font-medium text-ink">{g.name || '[Unnamed Goal]'}</td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                              g.priority === 'essential'
                                ? 'bg-sunken text-ink'
                                : g.priority === 'important'
                                ? 'bg-sunken text-ink-soft border border-border-strong'
                                : 'bg-sunken text-muted border border-border',
                            )}
                          >
                            {g.priority}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-ink-soft">{g.yearsToGoal} yrs</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-ink">
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
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">5</span>
                  Strategic Asset Allocation (SAA) & Rebalancing Corridors
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  {hasCorridorBreach ? (
                    <span className="inline-flex items-center gap-1 text-negative font-semibold bg-rose-50 border border-negative/40 px-2 py-0.5 rounded-full text-[10px]">
                      <AlertTriangle size={12} /> Drift Breach Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-positive font-semibold bg-emerald-50 border border-positive/40 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle size={12} /> All Corridors Compliant
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Strategic Asset Allocation table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-sunken text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Asset Class</th>
                      <th className="py-2.5 px-3 text-right">Policy Target</th>
                      <th className="py-2.5 px-3 text-right">Current Weight</th>
                      <th className="py-2.5 px-3 text-right">Tolerance Corridor (±5%)</th>
                      <th className="py-2.5 px-3 text-right">Corridor Drift</th>
                      <th className="py-2.5 px-3 text-center">Policy Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => {
                      const target = effectiveAllocation[cat] || 0;
                      const current = effectiveCurrentAllocation[cat] || 0;
                      const drift = current - target;
                      const isTargetMet = Math.abs(drift) <= 2.0;
                      const isWithinCorridor = Math.abs(drift) <= 5.0;

                      return (
                        <tr key={cat} className="hover:bg-sunken/50">
                          <td className="py-2.5 px-3 font-semibold text-ink">{categoryLabels[cat]}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-ink font-medium">
                            {target.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-ink font-medium">
                            {current.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-muted font-mono">
                            {Math.max(0, target - 5).toFixed(0)}% – {(target + 5).toFixed(0)}%
                          </td>
                          <td
                            className={cn(
                              'py-2.5 px-3 text-right font-mono text-xs font-bold',
                              isTargetMet
                                ? 'text-positive'
                                : isWithinCorridor
                                ? 'text-ink-soft'
                                : 'text-negative',
                            )}
                          >
                            {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isTargetMet ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-positive-soft text-positive border border-positive/40">
                                Target Met
                              </span>
                            ) : isWithinCorridor ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sunken text-ink-soft border border-border">
                                Within Corridor
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-negative border border-negative/40">
                                {drift > 0 ? 'Overweight' : 'Deficit / Rebalance'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-sunken/80 font-semibold border-t-2 border-border-strong text-xs">
                    <tr>
                      <td className="py-2.5 px-3 text-ink">Total SAA Weight</td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink">
                        {totalAllocation.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink">
                        {Object.values(effectiveCurrentAllocation).reduce((a, b) => a + b, 0).toFixed(1)}%
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-right">
                        {hasCorridorBreach ? (
                          <span className="text-negative font-bold">Rebalancing Trigger Breached (±5.0% Rule)</span>
                        ) : (
                          <span className="text-positive font-bold">Strategic Portfolio Within Policy Corridors</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasCorridorBreach ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-negative border border-negative/40">
                            Action Triggered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-positive-soft text-positive border border-positive/40">
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
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">6</span>
                Balance Sheet Inventory & Asset Schedule
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Current Holdings table">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-sunken text-muted text-[11px] font-semibold uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Instrument / Asset Name</th>
                      <th className="py-2.5 px-3">Asset Category</th>
                      <th className="py-2.5 px-3 text-right">Present Market Value</th>
                      <th className="py-2.5 px-3 text-right">Portfolio Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {effectiveAssets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted italic text-xs">
                          No asset holdings entered into balance sheet.
                        </td>
                      </tr>
                    )}
                    {effectiveAssets.map((a) => {
                      const share = effectiveNetWorth > 0 ? (a.value / effectiveNetWorth) * 100 : 0;
                      return (
                        <tr key={a.id} className="hover:bg-sunken/50">
                          <td className="py-2 px-3 font-medium text-ink">{a.name || '[Unnamed Instrument]'}</td>
                          <td className="py-2 px-3 text-muted">{categoryLabels[a.category]}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-ink">
                            {formatCurrency(a.value)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-muted text-xs">
                            {share.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-sunken font-semibold border-t border-border text-xs">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-ink">Total Portfolio Valuation</td>
                      <td className="py-2 px-3 text-right font-mono text-ink text-sm">
                        {formatCurrency(effectiveNetWorth)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Section 7: Currency Policy & Hedging Architecture */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">7</span>
                Currency Architecture & Hedging Mandate
              </h2>
              <div className="bg-sunken/70 border border-border rounded-xl p-4 space-y-2 text-sm text-ink-soft leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-border text-xs">
                  <div>
                    <span className="text-muted block uppercase font-semibold text-[10px]">Base Reporting Currency</span>
                    <span className="font-bold text-ink text-sm">{effectiveState.baseCurrency || 'INR'}</span>
                  </div>
                  <div>
                    <span className="text-muted block uppercase font-semibold text-[10px]">Offshore Exposure Cap</span>
                    <span className="font-bold text-ink text-sm font-mono">{effectiveState.foreignExposure}% Maximum</span>
                  </div>
                </div>
                <p className="pt-1">
                  <strong>Hedging Directive:</strong> {effectiveState.hedgePolicy}
                </p>
              </div>
            </div>

            {/* Section 8: Rebalancing Protocols & Governance Rules */}
            <div className="space-y-3">
              <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">8</span>
                Execution Protocols & Rebalancing Rules
              </h2>
              <div className="space-y-2.5 text-sm text-ink-soft leading-relaxed">
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
                  <div className="bg-sunken border-l-2 border-border-strong p-3 rounded-r-xl text-xs text-ink-soft italic mt-2">
                    "{effectiveState.implementationReview}"
                  </div>
                )}
              </div>
            </div>

            {/* Section 9: Special Covenants & Mandate Exclusions */}
            {effectiveState.notes && (
              <div className="space-y-3">
                <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">9</span>
                  Special Covenants & Mandate Exclusions
                </h2>
                <div className="bg-sunken/70 border border-border rounded-xl p-4 text-sm text-ink-soft leading-relaxed">
                  <p>{effectiveState.notes}</p>
                </div>
              </div>
            )}

            {/* Section 10: Fiduciary Execution & Ratification */}
            <div className="pt-6 border-t-2 border-border-strong space-y-6">
              <div>
                <h2 className="text-base font-serif font-bold text-ink flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sunken text-ink text-[10px] flex items-center justify-center font-sans font-bold">10</span>
                  Fiduciary Execution & Ratification
                </h2>
                <p className="text-xs text-muted mt-1 italic">
                  By signing below, the Client and the Lead Fiduciary Advisor acknowledge and ratify the governance
                  corridors, return hurdles, and asset allocation parameters set forth in this Investment Policy Statement.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                <div className="space-y-5 bg-sunken/50 border border-border rounded-xl p-4">
                  <div className="border-b border-border-strong pb-2">
                    <span className="text-[10px] uppercase font-bold text-muted block">Primary Client</span>
                    <span className="font-semibold text-ink text-sm">
                      {effectiveClient.name || 'Client Name(s)'}
                    </span>
                  </div>
                  <div className="h-10 flex items-end">
                    <div className="w-full border-b border-zinc-400 border-dashed" />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>Signature</span>
                    <span>Date: {effectiveClient.reviewDate}</span>
                  </div>
                </div>

                <div className="space-y-5 bg-sunken/50 border border-border rounded-xl p-4">
                  <div className="border-b border-border-strong pb-2">
                    <span className="text-[10px] uppercase font-bold text-muted block">Fiduciary Advisor</span>
                    <span className="font-semibold text-ink text-sm">
                      {effectiveClient.advisor || 'Sound Thesis Wealth Advisory'}
                    </span>
                  </div>
                  <div className="h-10 flex items-end">
                    <div className="w-full border-b border-zinc-400 border-dashed" />
                  </div>
                  <div className="flex justify-between text-xs text-muted">
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
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-sunken border border-border rounded-xl px-3 py-2 text-sm font-medium text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
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
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-sunken border border-border rounded-xl px-3 py-2 text-sm font-medium text-ink focus:bg-surface focus:border-border focus:ring-1 focus:ring-focus-ring focus:outline-none transition-colors"
      />
    </div>
  );
}
