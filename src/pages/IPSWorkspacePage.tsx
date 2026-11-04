import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Mail,
  PencilLine,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Tag,
  UserRound,
  WalletCards,
  X,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { categoryLabels, defaultState, generateIPSMarkdown, type IPSState } from '../lib/ipsMarkdown';
import type { AssetCategory } from '../types';
import { formatCurrency, formatCurrencyCompact } from '../lib/formatters';
import {
  type CRMClient,
  type CRMInteraction,
  type CRMStage,
  type CRMTier,
  CRM_STAGES,
  CRM_TIERS,
  getCRMClients,
  getActiveCRMClient,
  setActiveCRMClient,
  saveCRMClient,
  createCRMClient,
  addCRMInteraction,
  toggleCRMActionCompleted,
} from '../lib/crm';

type StepId = 'client' | 'position' | 'policy' | 'document';

interface StepMeta {
  id: StepId;
  number: string;
  label: string;
  description: string;
  icon: typeof UserRound;
}

const steps: StepMeta[] = [
  { id: 'client', number: '01', label: 'Client CRM & Household', description: 'Relationship context, contact & history', icon: UserRound },
  { id: 'position', number: '02', label: 'Wealth Position & Balance Sheet', description: 'Cashflows, reserves & asset inventory', icon: WalletCards },
  { id: 'policy', number: '03', label: 'Policy Corridors & Allocation', description: 'Strategic corridors & governance rules', icon: SlidersHorizontal },
  { id: 'document', number: '04', label: 'IPS Document & Ratification', description: 'Institutional charter & sign-off', icon: FileText },
];

const categories: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const riskText = (id: string): 'low' | 'moderate' | 'high' => {
  if (id === 'conservative' || id === 'moderate') return 'low';
  if (id === 'balanced') return 'moderate';
  return 'high';
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function IPSWorkspacePage() {
  const {
    inputs,
    updateInputs,
    updateClient,
    addGoal,
    updateGoal,
    manualTargets,
    setManualTargets,
    riskProfile,
    hasRiskAnswers,
    wealthResult,
    saveCurrentPlan,
    showToast,
    manualAllocationPolicy,
  } = useCalculator();
  const [searchParams] = useSearchParams();

  // Active wizard step
  const [step, setStep] = useState<StepId>('client');
  const [saving, setSaving] = useState(false);
  const [docViewMode, setDocViewMode] = useState<'formatted' | 'markdown'>('formatted');

  // CRM State
  const [clients, setClients] = useState<CRMClient[]>(() => getCRMClients());
  const [activeClient, setActiveClient] = useState<CRMClient | null>(() => getActiveCRMClient());
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    pan: '',
    tier: 'HNI' as CRMTier,
    stage: 'Discovery' as CRMStage,
    currentAge: 42,
    retirementAge: 60,
  });

  // Local form state
  const [primaryGoal, setPrimaryGoal] = useState(() => inputs.goals[0]?.name ?? '');
  const [policyNote, setPolicyNote] = useState(() => inputs.client.notes ?? '');
  const [tagInput, setTagInput] = useState('');

  // Log interaction modal / form
  const [interactionModalOpen, setInteractionModalOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: 'meeting' as CRMInteraction['type'],
    title: '',
    notes: '',
    nextAction: '',
  });

  useEffect(() => {
    if (searchParams.get('step') === 'document') setStep('document');
  }, [searchParams]);

  // Refresh clients on external changes
  const refreshClientList = useCallback(() => {
    const list = getCRMClients();
    setClients(list);
    const active = getActiveCRMClient();
    if (active) {
      setActiveClient(active);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('stw:clients-updated', refreshClientList);
    window.addEventListener('stw:active-client-changed', refreshClientList);
    return () => {
      window.removeEventListener('stw:clients-updated', refreshClientList);
      window.removeEventListener('stw:active-client-changed', refreshClientList);
    };
  }, [refreshClientList]);

  // Sync active CRM client into CalculatorContext when switched
  const handleSelectClient = (client: CRMClient) => {
    setActiveClient(client);
    setActiveCRMClient(client.id);
    setClientSearchOpen(false);

    // Sync into CalculatorContext inputs
    updateClient({
      name: client.name,
      email: client.email,
      phone: client.phone,
      advisor: client.assignedPractitioners[0]?.fullName || inputs.client.advisor,
      reviewDate: client.reviewDate || inputs.client.reviewDate,
      notes: client.policyNotes || inputs.client.notes,
    });

    if (client.currentAge) updateInputs({ currentAge: client.currentAge });
    if (client.retirementAge) updateInputs({ retirementAge: client.retirementAge });
    if (client.lifeExpectancy) updateInputs({ lifeExpectancy: client.lifeExpectancy });
    if (client.annualIncome) updateInputs({ annualIncome: client.annualIncome });
    if (client.monthlyLivingExpenses) {
      updateInputs({
        monthlyLivingExpenses: client.monthlyLivingExpenses,
        monthlyExpenditure: client.monthlyLivingExpenses,
      });
    }
    if (client.inflation) updateInputs({ inflation: client.inflation });
    if (client.primaryGoal) setPrimaryGoal(client.primaryGoal);
    if (client.policyNotes) setPolicyNote(client.policyNotes);
    if (client.targetAllocation) setManualTargets({ ...client.targetAllocation });

    showToast(`Loaded ${client.name} relationship record.`, 'info');
  };

  // Sync changes to active CRM client record
  const updateActiveCRMClient = (patch: Partial<CRMClient>) => {
    if (!activeClient) return;
    const updated: CRMClient = { ...activeClient, ...patch };
    setActiveClient(updated);
    saveCRMClient(updated);
  };

  // Create new client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name.trim()) return;

    const created = createCRMClient({
      name: newClientForm.name.trim(),
      email: newClientForm.email.trim(),
      phone: newClientForm.phone.trim(),
      pan: newClientForm.pan.trim(),
      tier: newClientForm.tier,
      stage: newClientForm.stage,
      currentAge: newClientForm.currentAge,
      retirementAge: newClientForm.retirementAge,
    });

    setAddClientOpen(false);
    setNewClientForm({
      name: '',
      email: '',
      phone: '',
      pan: '',
      tier: 'HNI',
      stage: 'Discovery',
      currentAge: 42,
      retirementAge: 60,
    });

    handleSelectClient(created);
    showToast(`Created new client ${created.name}`, 'success');
  };

  // Log interaction
  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || !interactionForm.title.trim()) return;

    addCRMInteraction(activeClient.id, {
      clientId: activeClient.id,
      date: new Date().toISOString().slice(0, 10),
      type: interactionForm.type,
      title: interactionForm.title.trim(),
      notes: interactionForm.notes.trim(),
      nextAction: interactionForm.nextAction.trim() || undefined,
      actionCompleted: false,
      advisorName: inputs.client.advisor || 'SoundThesis Capital',
    });

    setInteractionModalOpen(false);
    setInteractionForm({ type: 'meeting', title: '', notes: '', nextAction: '' });
    refreshClientList();
    showToast('Logged interaction in CRM timeline.', 'success');
  };

  const handleToggleTask = (interactionId: string) => {
    if (!activeClient) return;
    toggleCRMActionCompleted(activeClient.id, interactionId);
    refreshClientList();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = activeClient?.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        const nextTags = [...currentTags, tagInput.trim()];
        updateActiveCRMClient({ tags: nextTags });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeClient) return;
    const nextTags = (activeClient.tags || []).filter((t) => t !== tagToRemove);
    updateActiveCRMClient({ tags: nextTags });
  };

  // Calculations
  const allocation = manualTargets ?? riskProfile.targets;
  const allocationTotal = categories.reduce((total, category) => total + (allocation[category] || 0), 0);
  const clientReady = Boolean(
    (inputs.client.name.trim() || activeClient?.name.trim()) &&
      inputs.currentAge > 0 &&
      inputs.retirementAge > inputs.currentAge,
  );
  const positionReady = inputs.assets.length > 0 || inputs.monthlyLivingExpenses > 0 || inputs.goals.length > 0;
  const policyReady = Math.abs(allocationTotal - 100) < 0.1;

  const completed: Record<StepId, boolean> = {
    client: clientReady,
    position: clientReady && positionReady,
    policy: clientReady && policyReady,
    document: clientReady && policyReady,
  };

  const completedStepsCount = steps.filter((s) => completed[s.id]).length;
  const progressPercent = Math.round((completedStepsCount / steps.length) * 100);

  // Computed current allocation percentages from wealthResult
  const currentAllocation = useMemo(() => {
    return categories.reduce<Record<AssetCategory, number>>((result, category) => {
      result[category] = Number(((wealthResult.currentAllocation?.[category] || 0) * 100).toFixed(1));
      return result;
    }, { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 });
  }, [wealthResult.currentAllocation]);

  // IPS State for document generation
  const ipsState = useMemo<IPSState>(() => {
    const base = defaultState();
    return {
      ...base,
      client: {
        name: inputs.client.name || activeClient?.name || 'Private Client',
        advisor: inputs.client.advisor || 'SoundThesis Capital',
        reviewDate: inputs.client.reviewDate || activeClient?.reviewDate || new Date().toISOString().slice(0, 10),
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        lifeExpectancy: inputs.lifeExpectancy,
        inflation: inputs.inflation,
      },
      riskTolerance: riskText(riskProfile.id),
      maxDrawdown: riskProfile.maxDrawdown,
      allocation,
      currentAllocation,
      goals: inputs.goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        priority: goal.priority,
        yearsToGoal: goal.yearsToGoal,
        targetAmount: goal.targetAmount,
      })),
      assets: inputs.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        value: asset.value,
      })),
      notes: policyNote || activeClient?.policyNotes || '',
    };
  }, [activeClient, allocation, currentAllocation, inputs, policyNote, riskProfile]);

  const documentText = useMemo(
    () => generateIPSMarkdown(ipsState, wealthResult.netWorth),
    [ipsState, wealthResult.netWorth],
  );

  const advance = (next: StepId) => {
    if (step === 'position') persistGoal();
    if (step === 'policy') {
      updateClient({ notes: policyNote });
      updateActiveCRMClient({ policyNotes: policyNote, targetAllocation: allocation });
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persistGoal = () => {
    if (!primaryGoal.trim()) return;
    const current = inputs.goals[0];
    if (current) updateGoal(current.id, { name: primaryGoal.trim() });
    else {
      addGoal({
        name: primaryGoal.trim(),
        priority: 'essential',
        yearsToGoal: Math.max(1, inputs.retirementAge - inputs.currentAge),
        targetAmount: 0,
      });
    }
    updateActiveCRMClient({ primaryGoal: primaryGoal.trim() });
  };

  const setManualTarget = (category: AssetCategory, val: number) => {
    const updated = { ...allocation, [category]: Math.max(0, val) };
    setManualTargets(updated);
    updateActiveCRMClient({ targetAllocation: updated });
  };

  const saveAndNotify = async () => {
    setSaving(true);
    try {
      const clientName = inputs.client.name || activeClient?.name || 'Untitled';
      await saveCurrentPlan(`${clientName} IPS Mandate`);
      updateActiveCRMClient({
        name: clientName,
        currentAge: inputs.currentAge,
        retirementAge: inputs.retirementAge,
        annualIncome: inputs.annualIncome,
        monthlyLivingExpenses: inputs.monthlyLivingExpenses,
        policyNotes: policyNote,
        targetAllocation: allocation,
      });
      showToast('Client relationship and IPS mandate saved successfully.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleRatify = () => {
    const today = new Date().toISOString().slice(0, 10);
    updateActiveCRMClient({
      stage: 'Active Mandate',
      ratifiedDate: today,
    });
    addCRMInteraction(activeClient?.id || 'default', {
      clientId: activeClient?.id || 'default',
      date: today,
      type: 'review',
      title: 'Investment Policy Statement Ratified',
      notes: `Institutional IPS ratified by client and ${inputs.client.advisor || 'SoundThesis Capital'}. Mandate is active.`,
      nextAction: 'Schedule 6-month portfolio rebalancing check',
      actionCompleted: false,
      advisorName: inputs.client.advisor || 'SoundThesis Capital',
    });
    refreshClientList();
    showToast('IPS officially ratified! Client stage updated to Active Mandate.', 'success');
  };

  const download = () => {
    const safeName = (inputs.client.name || activeClient?.name || 'client')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const file = new Blob([documentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName || 'client'}-investment-policy-statement.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('IPS downloaded as Markdown.', 'success');
  };

  const exportPdf = () => {
    const previousTitle = document.title;
    const safeName = (inputs.client.name || activeClient?.name || 'client')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    document.title = `${safeName || 'client'}-investment-policy-statement`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    window.setTimeout(restore, 1500);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(documentText);
      showToast('IPS Markdown copied to clipboard.', 'success');
    } catch {
      showToast('Could not copy to clipboard.', 'error');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) =>
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.tags?.some((t) => t.toLowerCase().includes(clientSearchQuery.toLowerCase())),
    );
  }, [clients, clientSearchQuery]);

  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-ink">
      {/* ═══ Header & Client Relationship Bar (Horizontal Top) ═══ */}
      <header className="border-b border-border pb-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Client Mandate & Investment Policy
            </h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">
              Unified CRM relationship management, asset allocation governance, and institutional IPS issuance.
            </p>
          </div>

          {/* Client Switcher & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Client selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setClientSearchOpen(!clientSearchOpen)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-surface hover:border-border-strong text-xs font-medium cursor-pointer shadow-xs transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center font-mono font-bold text-[10px]">
                  {initials(activeClient?.name || 'CL')}
                </span>
                <div className="text-left">
                  <span className="block text-ink font-semibold max-w-[140px] truncate">
                    {activeClient?.name || 'Select Client'}
                  </span>
                  <span className="block text-[10px] text-muted leading-tight">
                    {activeClient?.stage || 'Discovery'}
                  </span>
                </div>
                <Search size={13} className="text-muted ml-1" />
              </button>

              {/* Client search & switch modal / popover */}
              {clientSearchOpen && (
                <div className="absolute right-0 top-12 w-80 z-50 rounded-xl border border-border bg-surface shadow-popover p-2">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border mb-2">
                    <Search size={14} className="text-faint shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search relationships..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none text-xs text-ink placeholder:text-faint"
                    />
                    {clientSearchQuery && (
                      <button onClick={() => setClientSearchQuery('')} className="text-faint hover:text-ink">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          activeClient?.id === c.id ? 'bg-accent-soft text-accent-strong font-semibold' : 'hover:bg-sunken text-ink'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-[10px] text-muted truncate">
                            {c.tier || 'Affluent'} • {c.stage || 'Discovery'}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted shrink-0">
                          {formatCurrencyCompact(c.financialSummary.netWorth)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClientSearchOpen(false);
                        setAddClientOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Add New Relationship
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick add client button */}
            <button
              type="button"
              onClick={() => setAddClientOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New Client</span>
            </button>

            {/* Save button */}
            <button
              type="button"
              onClick={() => void saveAndNotify()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'Saving…' : 'Save Mandate'}</span>
            </button>
          </div>
        </div>

        {/* Client Sub-Banner / Relationship Kicker */}
        {activeClient && (
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-ink">{activeClient.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent-strong border border-accent/20">
                {activeClient.tier || 'HNI'}
              </span>

              {/* Stage selector chip */}
              <div className="flex items-center gap-1 bg-sunken px-2 py-0.5 rounded-md border border-border text-[11px]">
                <span className="text-muted">Stage:</span>
                <select
                  value={activeClient.stage || 'Discovery'}
                  onChange={(e) => updateActiveCRMClient({ stage: e.target.value as CRMStage })}
                  className="bg-transparent border-0 font-semibold text-ink cursor-pointer focus:outline-none"
                >
                  {CRM_STAGES.map((stg) => (
                    <option key={stg} value={stg} className="bg-surface text-ink">
                      {stg}
                    </option>
                  ))}
                </select>
              </div>

              {activeClient.email && (
                <span className="text-muted flex items-center gap-1">
                  <Mail size={12} /> {activeClient.email}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-muted text-[11px]">
              <span>Next Review: <strong className="text-ink font-mono">{activeClient.reviewDate || 'Not set'}</strong></span>
              <span>Net Worth: <strong className="text-ink font-mono">{formatCurrencyCompact(wealthResult.netWorth || activeClient.financialSummary.netWorth)}</strong></span>
            </div>
          </div>
        )}
      </header>

      {/* ═══ Horizontal Progress Stepper Across Top ═══ */}
      <section className="mb-8" aria-label="Workflow progress">
        <div className="flex items-center justify-between text-xs text-muted mb-2 px-1">
          <span className="font-medium">
            Phase {activeIndex + 1} of {steps.length}:{' '}
            <strong className="text-ink">{steps[activeIndex]?.label}</strong>
          </span>
          <span className="font-mono text-[11px]">
            {completedStepsCount} of {steps.length} Phases Ready ({progressPercent}%)
          </span>
        </div>

        {/* Visual progress track */}
        <div className="w-full h-1 bg-sunken rounded-full overflow-hidden mb-4 border border-border/50">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${Math.max(10, progressPercent)}%` }}
          />
        </div>

        {/* Horizontal step pills */}
        <nav className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {steps.map((item) => {
            const active = step === item.id;
            const isDone = completed[item.id];
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-3 ${
                  active
                    ? 'border-accent bg-accent-soft/30 shadow-xs'
                    : isDone
                      ? 'border-border bg-surface hover:bg-sunken'
                      : 'border-border/70 bg-surface/50 hover:bg-sunken opacity-80'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-semibold border transition-colors ${
                    isDone
                      ? 'bg-positive-soft border-positive/40 text-positive'
                      : active
                        ? 'bg-accent text-white border-accent'
                        : 'bg-raised border-border text-faint'
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={2.5} /> : item.number}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <strong className={`block text-xs leading-tight truncate ${active ? 'text-ink font-bold' : 'text-ink-soft'}`}>
                      {item.label}
                    </strong>
                    <Icon size={13} className={active ? 'text-accent shrink-0' : 'text-faint shrink-0'} />
                  </div>
                  <small className="block text-[11px] text-muted truncate mt-0.5">
                    {item.description}
                  </small>
                </div>
              </button>
            );
          })}
        </nav>
      </section>

      {/* ═══ Main Step Content (Full Width Horizontal Grid) ═══ */}
      <main className="w-full">
        {/* ───────────────────────────────────────────────────────────
            STEP 01: CLIENT CRM & HOUSEHOLD MANDATE
        ─────────────────────────────────────────────────────────── */}
        {step === 'client' && (
          <div className="space-y-6">
            {/* Top Row: Relationship & Household Basics (Horizontal 2-Column Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Client Contact & Profile Card (7 cols) */}
              <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                      <UserRound size={17} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink">Client Contact & KYC Profile</h2>
                      <p className="text-xs text-muted">Primary identity, contact coordinates, and governance tier</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted">ID: {activeClient?.id || 'LOCAL'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="font-semibold text-ink-soft">Client or Household Name *</span>
                    <input
                      type="text"
                      value={inputs.client.name}
                      onChange={(e) => {
                        updateClient({ name: e.target.value });
                        updateActiveCRMClient({ name: e.target.value });
                      }}
                      placeholder="e.g. Rhea and Karan Shah"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-medium focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Email Address</span>
                    <input
                      type="email"
                      value={inputs.client.email || activeClient?.email || ''}
                      onChange={(e) => {
                        updateClient({ email: e.target.value });
                        updateActiveCRMClient({ email: e.target.value });
                      }}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Phone Number</span>
                    <input
                      type="tel"
                      value={inputs.client.phone || activeClient?.phone || ''}
                      onChange={(e) => {
                        updateClient({ phone: e.target.value });
                        updateActiveCRMClient({ phone: e.target.value });
                      }}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">PAN / Tax ID</span>
                    <input
                      type="text"
                      value={activeClient?.pan || ''}
                      onChange={(e) => updateActiveCRMClient({ pan: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs font-mono uppercase focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Client Tier / Segment</span>
                    <select
                      value={activeClient?.tier || 'HNI'}
                      onChange={(e) => updateActiveCRMClient({ tier: e.target.value as CRMTier })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none cursor-pointer"
                    >
                      {CRM_TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="font-semibold text-ink-soft">Lead Adviser / Wealth Manager</span>
                    <input
                      type="text"
                      value={inputs.client.advisor}
                      onChange={(e) => {
                        updateClient({ advisor: e.target.value });
                        updateActiveCRMClient({
                          assignedPractitioners: [{ userId: 'lead', fullName: e.target.value, assignmentRole: 'Lead Adviser' }],
                        });
                      }}
                      placeholder="Adviser name or firm"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                    />
                  </label>

                  {/* Relationship Tags */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <span className="font-semibold text-ink-soft flex items-center gap-1.5">
                      <Tag size={13} /> Relationship Tags
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(activeClient?.tags || []).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sunken border border-border text-[11px] text-ink font-medium"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="text-faint hover:text-ink cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="+ Add tag (Press Enter)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="px-2.5 py-1 rounded-md border border-dashed border-border bg-transparent text-[11px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Demographics & Horizon (5 cols) */}
              <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-info-soft text-info flex items-center justify-center">
                      <Calendar size={17} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink">Household Horizon</h2>
                      <p className="text-xs text-muted">Ages, lifecycle windows and review schedule</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Current Age *</span>
                    <input
                      type="number"
                      min="18"
                      max="120"
                      value={inputs.currentAge || ''}
                      onChange={(e) => {
                        const val = number(e.target.value);
                        updateInputs({ currentAge: val });
                        updateActiveCRMClient({ currentAge: val });
                      }}
                      placeholder="42"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-mono focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Retirement Age *</span>
                    <input
                      type="number"
                      min="20"
                      max="120"
                      value={inputs.retirementAge || ''}
                      onChange={(e) => {
                        const val = number(e.target.value);
                        updateInputs({ retirementAge: val });
                        updateActiveCRMClient({ retirementAge: val });
                      }}
                      placeholder="60"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-mono focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Life Expectancy</span>
                    <input
                      type="number"
                      min="50"
                      max="120"
                      value={inputs.lifeExpectancy || ''}
                      onChange={(e) => {
                        const val = number(e.target.value);
                        updateInputs({ lifeExpectancy: val });
                        updateActiveCRMClient({ lifeExpectancy: val });
                      }}
                      placeholder="88"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-mono focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Next Annual Review</span>
                    <input
                      type="date"
                      value={inputs.client.reviewDate || activeClient?.reviewDate || ''}
                      onChange={(e) => {
                        updateClient({ reviewDate: e.target.value });
                        updateActiveCRMClient({ reviewDate: e.target.value });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                    />
                  </label>
                </div>

                {/* Horizon Analytics Pills */}
                <div className="bg-sunken rounded-xl p-3 border border-border/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Accumulation Window:</span>
                    <strong className="text-ink font-mono">
                      {Math.max(0, inputs.retirementAge - inputs.currentAge)} years
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Retirement Distribution:</span>
                    <strong className="text-ink font-mono">
                      {Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} years
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Total Planning Span:</span>
                    <strong className="text-ink font-mono">
                      {Math.max(0, inputs.lifeExpectancy - inputs.currentAge)} years
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: CRM Interaction History & Action Items (Full Width Card) */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-positive-soft text-positive flex items-center justify-center">
                    <ShieldCheck size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">CRM Activity & Meeting History</h2>
                    <p className="text-xs text-muted">
                      Chronological advisory audit log, client consultations, and follow-up tasks
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInteractionModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-sunken hover:bg-raised text-xs font-semibold text-accent transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={14} /> Log Consultation / Meeting
                </button>
              </div>

              {/* Timeline list */}
              <div className="space-y-3">
                {(!activeClient?.interactions || activeClient.interactions.length === 0) ? (
                  <div className="text-center py-6 text-muted text-xs">
                    No client consultations recorded yet. Click &quot;Log Consultation&quot; to add your first advisory note.
                  </div>
                ) : (
                  activeClient.interactions.map((int) => (
                    <div
                      key={int.id}
                      className="p-3.5 rounded-xl border border-border bg-raised/50 hover:bg-raised transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium font-mono bg-accent-soft text-accent capitalize">
                            {int.type}
                          </span>
                          <strong className="text-ink font-semibold">{int.title}</strong>
                          <span className="text-faint font-mono text-[11px]">{int.date}</span>
                        </div>
                        <p className="text-muted leading-relaxed">{int.notes}</p>
                      </div>

                      {int.nextAction && (
                        <div className="md:w-72 bg-sunken border border-border/80 rounded-lg p-2.5 shrink-0 flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(int.id)}
                            className="mt-0.5 text-accent cursor-pointer hover:opacity-80"
                            aria-label="Toggle task completed"
                          >
                            {int.actionCompleted ? (
                              <CheckSquare size={15} className="text-positive" />
                            ) : (
                              <Square size={15} className="text-muted" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-muted block">Follow-up Task</span>
                            <span className={`text-xs ${int.actionCompleted ? 'line-through text-muted' : 'text-ink font-medium'}`}>
                              {int.nextAction}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Step Navigation Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <p className="text-xs text-muted">
                {clientReady
                  ? 'Client identity and demographics are configured.'
                  : 'Enter client name, current age, and retirement age to continue.'}
              </p>
              <button
                type="button"
                onClick={() => advance('position')}
                disabled={!clientReady}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                <span>Continue to Wealth Position</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            STEP 02: WEALTH POSITION & BALANCE SHEET
        ─────────────────────────────────────────────────────────── */}
        {step === 'position' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cashflow & Reserves Card (6 cols) */}
              <div className="lg:col-span-6 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                    <WalletCards size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Household Cashflow & Runway</h2>
                    <p className="text-xs text-muted">Income, living burn rate, and liquid safety buffer</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="font-semibold text-ink-soft">Annual Household Income</span>
                    <input
                      type="number"
                      min="0"
                      value={inputs.annualIncome || ''}
                      onChange={(e) => {
                        const val = number(e.target.value);
                        updateInputs({ annualIncome: val });
                        updateActiveCRMClient({ annualIncome: val });
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-mono focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Monthly Living Expenses</span>
                    <input
                      type="number"
                      min="0"
                      value={inputs.monthlyLivingExpenses || ''}
                      onChange={(e) => {
                        const val = number(e.target.value);
                        updateInputs({ monthlyLivingExpenses: val, monthlyExpenditure: val });
                        updateActiveCRMClient({ monthlyLivingExpenses: val });
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm font-mono focus:border-accent focus:outline-none"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="font-semibold text-ink-soft">Inflation Expectation</span>
                    <div className="flex items-center border border-border rounded-lg bg-raised px-3 focus-within:border-accent">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        step="0.1"
                        value={inputs.inflation || ''}
                        onChange={(e) => {
                          const val = number(e.target.value);
                          updateInputs({ inflation: val });
                          updateActiveCRMClient({ inflation: val });
                        }}
                        placeholder="6.0"
                        className="w-full py-2 bg-transparent text-ink text-sm font-mono focus:outline-none"
                      />
                      <span className="text-muted font-mono text-xs">%</span>
                    </div>
                  </label>

                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="font-semibold text-ink-soft">Primary Financial Goal / Milestone</span>
                    <input
                      type="text"
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      onBlur={persistGoal}
                      placeholder="e.g. Retirement income & intergenerational legacy"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                    />
                  </label>
                </div>

                {/* Runway benchmark */}
                <div className="bg-sunken rounded-xl p-3 border border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Annualized Expense Burn:</span>
                    <strong className="text-ink font-mono">
                      {formatCurrency((inputs.monthlyLivingExpenses || 0) * 12)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Target 12-Month Liquid Buffer:</span>
                    <strong className="text-ink font-mono text-accent">
                      {formatCurrency((inputs.monthlyLivingExpenses || 0) * 12)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Net Worth & Balance Sheet Overview (6 cols) */}
              <div className="lg:col-span-6 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brass-soft text-brass-strong flex items-center justify-center">
                      <TrendingUp size={17} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink">Recorded Wealth & Holdings</h2>
                      <p className="text-xs text-muted">Current asset allocation across asset classes</p>
                    </div>
                  </div>
                  <Link
                    to="/master-plan?step=financials"
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                  >
                    Edit Line Items <ArrowRight size={12} />
                  </Link>
                </div>

                {/* Net Worth Card */}
                <div className="bg-raised rounded-xl p-4 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted block">Total Net Worth</span>
                    <strong className="text-2xl font-bold font-mono text-ink tracking-tight mt-0.5 block">
                      {formatCurrency(wealthResult.netWorth || activeClient?.financialSummary.netWorth || 0)}
                    </strong>
                    <small className="text-[11px] text-muted">
                      {inputs.assets.length} itemized holding{inputs.assets.length === 1 ? '' : 's'} recorded
                    </small>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted block">Investable Assets</span>
                    <strong className="text-sm font-mono text-ink">
                      {formatCurrency(wealthResult.investableNetWorth || activeClient?.financialSummary.investableAssets || 0)}
                    </strong>
                  </div>
                </div>

                {/* Asset Category Distribution Table */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-ink-soft block">Current Asset Category Mix</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => {
                      const pct = currentAllocation[cat] || 0;
                      return (
                        <div key={cat} className="p-2.5 rounded-lg border border-border bg-raised/50">
                          <span className="text-[11px] text-muted block capitalize">{categoryLabels[cat]}</span>
                          <strong className="text-xs font-mono text-ink mt-0.5 block">{pct.toFixed(1)}%</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step Navigation Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setStep('client')}
                className="px-4 py-2 rounded-xl border border-border hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
              >
                Back to CRM Profile
              </button>
              <button
                type="button"
                onClick={() => advance('policy')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue to Policy Corridors</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            STEP 03: POLICY CORRIDORS & STRATEGIC ALLOCATION
        ─────────────────────────────────────────────────────────── */}
        {step === 'policy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Strategic Allocation Targets (7 cols) */}
              <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                      <SlidersHorizontal size={17} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-ink">Strategic Asset Allocation Corridors</h2>
                      <p className="text-xs text-muted">Define governance target weights across asset classes</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualTargets(manualTargets ? null : { ...riskProfile.targets })}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    {manualTargets ? 'Reset to Recommended Profile' : 'Enable Manual Mandate Override'}
                  </button>
                </div>

                {/* Source status alert */}
                <div className="p-3 rounded-xl border border-border bg-sunken text-xs flex items-center justify-between">
                  <div>
                    <strong className="text-ink font-semibold">
                      {manualTargets ? 'Manual Mandate Active' : `${riskProfile.label} Risk Model`}
                    </strong>
                    <p className="text-muted text-[11px] mt-0.5">
                      {manualTargets
                        ? 'Adviser custom weights will govern the portfolio rebalancing mandate.'
                        : hasRiskAnswers
                          ? 'Derived automatically from completed client risk questionnaire.'
                          : 'Standard starter baseline. Complete risk questionnaire for personalized weights.'}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-surface border border-border text-ink">
                    Max DD: {riskProfile.maxDrawdown}%
                  </span>
                </div>

                {/* Allocation Inputs (Horizontal 3-Col Grid) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((category) => (
                    <label key={category} className="p-3 rounded-xl border border-border bg-raised space-y-1.5 block">
                      <span className="text-[11px] font-semibold text-muted block capitalize">
                        {categoryLabels[category]}
                      </span>
                      <div className="flex items-center border border-border rounded-lg bg-surface px-2.5 focus-within:border-accent">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={allocation[category] || 0}
                          onChange={(e) => setManualTarget(category, number(e.target.value))}
                          disabled={!manualTargets}
                          className="w-full py-1.5 bg-transparent text-sm font-mono font-semibold text-ink focus:outline-none disabled:opacity-80"
                        />
                        <span className="text-muted font-mono text-xs">%</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Allocation Total Indicator */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    policyReady
                      ? 'border-positive/40 bg-positive-soft text-positive'
                      : 'border-negative/40 bg-negative-soft text-negative'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {policyReady ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>
                      {policyReady
                        ? 'Policy corridor sums to 100% exactly.'
                        : 'Total allocation must equal 100% before issuance.'}
                    </span>
                  </div>
                  <strong className="font-mono text-sm font-bold">{allocationTotal.toFixed(0)}%</strong>
                </div>

                {/* Policy Constraints Notes */}
                <label className="space-y-1.5 block">
                  <span className="text-xs font-semibold text-ink-soft block">
                    Investment Constraints, Mandate Exclusions & Rebalancing Directives
                  </span>
                  <textarea
                    rows={4}
                    value={policyNote}
                    onChange={(e) => setPolicyNote(e.target.value)}
                    onBlur={() => {
                      updateClient({ notes: policyNote });
                      updateActiveCRMClient({ policyNotes: policyNote });
                    }}
                    placeholder="e.g. Exclude speculative micro-caps; rebalance when equity drifts by >5%; maintain minimum ₹10L liquid buffer at all times."
                    className="w-full p-3 rounded-xl border border-border bg-raised text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              {/* Right Column: Visual Comparison Current vs Target (5 cols) */}
              <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 shadow-card space-y-5">
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <div className="w-8 h-8 rounded-lg bg-info-soft text-info flex items-center justify-center">
                    <TrendingUp size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Corridor Comparison</h2>
                    <p className="text-xs text-muted">Current allocation vs strategic policy targets</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {categories.map((cat) => {
                    const currentPct = currentAllocation[cat] || 0;
                    const targetPct = allocation[cat] || 0;
                    const drift = currentPct - targetPct;

                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink capitalize">{categoryLabels[cat]}</span>
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-muted">Now: {currentPct.toFixed(1)}%</span>
                            <span className="text-ink font-semibold">Target: {targetPct}%</span>
                            <span
                              className={`text-[10px] font-bold ${
                                Math.abs(drift) > 5 ? 'text-negative' : 'text-positive'
                              }`}
                            >
                              ({drift > 0 ? `+${drift.toFixed(1)}` : drift.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* Dual bar chart */}
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${Math.min(100, targetPct)}%` }} />
                          </div>
                          <div className="w-full h-1.5 bg-sunken rounded-full overflow-hidden opacity-60">
                            <div className="h-full bg-slate-400" style={{ width: `${Math.min(100, currentPct)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-sunken border border-border text-[11px] text-muted space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-1.5 bg-accent rounded-full inline-block" />
                    <span>Target Policy Corridor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-1.5 bg-slate-400 rounded-full inline-block opacity-60" />
                    <span>Current Portfolio Position</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step Navigation Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setStep('position')}
                className="px-4 py-2 rounded-xl border border-border hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
              >
                Back to Wealth Position
              </button>
              <button
                type="button"
                onClick={() => advance('document')}
                disabled={!policyReady}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                <span>Review & Issue IPS Document</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────
            STEP 04: IPS DOCUMENT & RATIFICATION SUITE
        ─────────────────────────────────────────────────────────── */}
        {step === 'document' && (
          <div className="space-y-6">
            {/* Document Header & Ratification Controls */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">
                      {inputs.client.name || activeClient?.name || 'Client'} — Investment Policy Statement
                    </h2>
                    {activeClient?.ratifiedDate && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium font-mono bg-positive-soft text-positive border border-positive/30">
                        Ratified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Governing fiduciary charter formulated on{' '}
                    {activeClient?.reviewDate || new Date().toISOString().slice(0, 10)} by{' '}
                    {inputs.client.advisor || 'SoundThesis Capital'}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* View Mode Toggle */}
                <div className="flex items-center p-1 rounded-lg border border-border bg-sunken text-xs">
                  <button
                    type="button"
                    onClick={() => setDocViewMode('formatted')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      docViewMode === 'formatted' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Institutional View
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode('markdown')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      docViewMode === 'markdown' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
                    }`}
                  >
                    Markdown Source
                  </button>
                </div>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
                  title="Copy Markdown"
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={download}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
                  title="Download .md file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={exportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
                  title="Export IPS as a PDF"
                >
                  <Printer size={14} />
                  <span>Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleRatify}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-positive hover:bg-positive/90 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ShieldCheck size={14} />
                  <span>{activeClient?.ratifiedDate ? 'Re-Ratify Mandate' : 'Ratify Policy'}</span>
                </button>
              </div>
            </div>

            {/* Document Body */}
            {docViewMode === 'formatted' ? (
              <div className="bg-surface border border-border rounded-2xl p-8 sm:p-12 shadow-card max-w-4xl mx-auto space-y-8 font-sans">
                {/* Formal Document Title Block */}
                <div className="border-b-2 border-border pb-6 space-y-2">
                  <div className="text-xs font-medium text-muted">
                    Institutional Wealth Charter • Private Mandate
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-ink">
                    Investment Policy Statement
                  </h1>
                  <p className="text-sm text-muted">
                    Fiduciary Objectives, Governance Corridors & Rebalancing Protocol for{' '}
                    <strong className="text-ink">{inputs.client.name || activeClient?.name}</strong>
                  </p>
                </div>

                {/* Section 1: Executive Profile */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">
                    01. Mandate & Household Demographics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-raised/50 text-xs">
                    <div>
                      <span className="text-muted block text-[11px]">Primary Client</span>
                      <strong className="text-ink font-semibold mt-0.5 block">
                        {inputs.client.name || activeClient?.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Current / Target Age</span>
                      <strong className="text-ink font-semibold mt-0.5 block">
                        {inputs.currentAge} / {inputs.retirementAge} yrs
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Recorded Net Worth</span>
                      <strong className="text-ink font-semibold mt-0.5 font-mono block">
                        {formatCurrency(wealthResult.netWorth)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Lead Adviser</span>
                      <strong className="text-ink font-semibold mt-0.5 block">
                        {inputs.client.advisor || 'SoundThesis Capital'}
                      </strong>
                    </div>
                  </div>
                </section>

                {/* Section 2: Strategic Asset Allocation Table */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">
                    02. Strategic Asset Allocation Corridors
                  </h3>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-sunken border-b border-border text-muted text-xs font-medium">
                          <th className="py-2.5 px-4">Asset Class</th>
                          <th className="py-2.5 px-4 text-right">Target Weight</th>
                          <th className="py-2.5 px-4 text-right">Current Position</th>
                          <th className="py-2.5 px-4 text-right">Permissible Corridor (±5%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {categories.map((cat) => {
                          const target = allocation[cat] || 0;
                          const currentVal = currentAllocation[cat] || 0;
                          return (
                            <tr key={cat} className="hover:bg-sunken/40">
                              <td className="py-2.5 px-4 font-medium text-ink capitalize">
                                {categoryLabels[cat]}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-ink">
                                {target}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-muted">
                                {currentVal.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-faint">
                                {Math.max(0, target - 5)}% – {Math.min(100, target + 5)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">03. Purpose, Objectives & Funding Priorities</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl border border-border bg-raised/50 p-4"><span className="text-[11px] text-muted block">Investment objective</span><p className="text-ink leading-relaxed mt-1">{manualAllocationPolicy?.objective || 'Fund the household’s priority goals while maintaining purchasing power and an appropriate liquidity reserve.'}</p></div>
                    <div className="rounded-xl border border-border bg-raised/50 p-4"><span className="text-[11px] text-muted block">Risk capacity & planning horizon</span><p className="text-ink leading-relaxed mt-1">{riskProfile.label} profile; {Math.max(0, inputs.retirementAge - inputs.currentAge)} years to retirement and {Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} years of projected distribution.</p></div>
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden"><div className="grid grid-cols-[1fr_90px_110px] gap-3 bg-sunken px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted"><span>Goal</span><span>Priority</span><span className="text-right">Horizon</span></div>{inputs.goals.length ? inputs.goals.map((goal) => <div key={goal.id} className="grid grid-cols-[1fr_90px_110px] gap-3 border-t border-border px-4 py-2.5 text-xs"><span className="font-medium text-ink truncate">{goal.name}</span><span className="capitalize text-muted">{goal.priority}</span><span className="font-mono text-right text-muted">{goal.yearsToGoal} yrs</span></div>) : <p className="px-4 py-3 text-xs text-muted">No specific goals have been recorded. Review before client signature.</p>}</div>
                </section>

                <section className="space-y-3 text-xs leading-relaxed text-muted">
                  <h3 className="text-sm font-semibold text-ink">04. Liquidity, Restrictions & Implementation</h3>
                  <div className="grid md:grid-cols-2 gap-4"><div className="rounded-xl border border-border bg-raised/50 p-4"><p>• <strong>Minimum liquid reserve:</strong> {formatCurrency((inputs.monthlyLivingExpenses || 0) * 12)} (12 months of recorded household expenditure).</p><p className="mt-2">• <strong>Review cadence:</strong> {manualAllocationPolicy?.reviewFrequency || 'quarterly'}; formal review at least annually and upon a material household event.</p></div><div className="rounded-xl border border-border bg-raised/50 p-4"><p>• <strong>Rebalance trigger:</strong> {manualAllocationPolicy?.rebalanceThreshold ?? 5}% absolute drift from target allocation.</p><p className="mt-2">• <strong>Client constraints:</strong> {manualAllocationPolicy?.constraints || policyNote || 'No client-specific exclusions recorded.'}</p></div></div>
                </section>

                {/* Section 3: Rebalancing Protocol */}
                <section className="space-y-3 text-xs leading-relaxed text-muted">
                  <h3 className="text-sm font-semibold text-ink">
                    05. Governance & Rebalancing Protocol
                  </h3>
                  <div className="p-4 rounded-xl border border-border bg-raised/50 space-y-2">
                    <p>
                      • <strong>Rebalance Drift Trigger:</strong> Portfolios will be rebalanced if any asset class drifts
                      by more than <strong>±5%</strong> from its strategic target corridor.
                    </p>
                    <p>
                      • <strong>Cashflow Allocation:</strong> Systematic inflows (SIPs, dividends, liquidity distributions)
                      shall prioritize underweighted asset classes before direct rebalancing sales.
                    </p>
                    <p>
                      • <strong>Liquid Reserve Directive:</strong> A dedicated emergency cushion of at least{' '}
                      <strong>{formatCurrency((inputs.monthlyLivingExpenses || 0) * 12)}</strong> (12 months living expenses)
                      must be maintained in high-quality sovereign debt / liquid instruments.
                    </p>
                    {policyNote && (
                      <p className="border-t border-border pt-2 mt-2">
                        • <strong>Custom Mandate Exclusions:</strong> {policyNote}
                      </p>
                    )}
                  </div>
                </section>

                {/* Sign-off & Ratification Block */}
                <section className="border-t-2 border-border pt-6 space-y-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted font-mono">
                    <span>Ratification & Signatures</span>
                    <span>Date: {activeClient?.ratifiedDate || activeClient?.reviewDate || 'Pending'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="border-t border-border pt-2 text-xs">
                      <strong className="block text-ink">{inputs.client.name || activeClient?.name}</strong>
                      <span className="text-muted text-[11px]">Client / Authorized Household Trustee</span>
                    </div>
                    <div className="border-t border-border pt-2 text-xs">
                      <strong className="block text-ink">{inputs.client.advisor || 'SoundThesis Capital'}</strong>
                      <span className="text-muted text-[11px]">Fiduciary Wealth Adviser</span>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <pre className="bg-sunken border border-border rounded-2xl p-6 text-ink font-mono text-xs leading-relaxed overflow-x-auto max-h-[600px]">
                {documentText}
              </pre>
            )}

            {/* Step Navigation Footer */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setStep('policy')}
                className="px-4 py-2 rounded-xl border border-border hover:bg-sunken text-xs font-medium text-ink transition-colors cursor-pointer"
              >
                Back to Policy Corridors
              </button>
              <div className="flex items-center gap-2">
                <Link
                  to="/ips/editor"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-sunken text-xs font-medium text-ink transition-colors"
                >
                  <PencilLine size={14} /> Full Clause Editor
                </Link>
                <Link
                  to="/master-plan"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Open Master Plan</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══ Add Relationship Modal ═══ */}
      {addClientOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface border border-border rounded-2xl shadow-popover max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-accent" />
                <h3 className="text-sm font-bold text-ink">New Client Relationship</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddClientOpen(false)}
                className="text-faint hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
              <label className="space-y-1 block">
                <span className="font-semibold text-ink-soft">Client or Household Name *</span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Priya & Rohan Kapoor"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm focus:border-accent focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Email Address</span>
                  <input
                    type="email"
                    placeholder="priya@kapoor.in"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Phone Number</span>
                  <input
                    type="tel"
                    placeholder="+91 98111 22334"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Client Tier</span>
                  <select
                    value={newClientForm.tier}
                    onChange={(e) => setNewClientForm({ ...newClientForm, tier: e.target.value as CRMTier })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {CRM_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Pipeline Stage</span>
                  <select
                    value={newClientForm.stage}
                    onChange={(e) => setNewClientForm({ ...newClientForm, stage: e.target.value as CRMStage })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Current Age</span>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={newClientForm.currentAge}
                    onChange={(e) => setNewClientForm({ ...newClientForm, currentAge: number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs font-mono focus:border-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Retirement Age</span>
                  <input
                    type="number"
                    min="30"
                    max="100"
                    value={newClientForm.retirementAge}
                    onChange={(e) => setNewClientForm({ ...newClientForm, retirementAge: number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs font-mono focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAddClientOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-ink hover:bg-sunken cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientForm.name.trim()}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Log Interaction Modal ═══ */}
      {interactionModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface border border-border rounded-2xl shadow-popover max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserRound size={17} className="text-positive" />
                <h3 className="text-sm font-bold text-ink">Log Advisory Consultation</h3>
              </div>
              <button
                type="button"
                onClick={() => setInteractionModalOpen(false)}
                className="text-faint hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddInteraction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Interaction Type</span>
                  <select
                    value={interactionForm.type}
                    onChange={(e) =>
                      setInteractionForm({ ...interactionForm, type: e.target.value as CRMInteraction['type'] })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none cursor-pointer"
                  >
                    <option value="meeting">Meeting (In-Person / Video)</option>
                    <option value="call">Phone Call</option>
                    <option value="email">Email</option>
                    <option value="review">Policy Review</option>
                    <option value="note">Internal Memo / Note</option>
                  </select>
                </label>

                <label className="space-y-1 block">
                  <span className="font-semibold text-ink-soft">Date</span>
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="font-semibold text-ink-soft">Subject / Consultation Title *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asset Allocation & Rebalancing Review"
                  value={interactionForm.title}
                  onChange={(e) => setInteractionForm({ ...interactionForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-sm focus:border-accent focus:outline-none"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-semibold text-ink-soft">Consultation Notes & Discussion Summary</span>
                <textarea
                  rows={3}
                  placeholder="Key topics discussed, client risk feedback, investment mandate updates..."
                  value={interactionForm.notes}
                  onChange={(e) => setInteractionForm({ ...interactionForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border bg-raised text-xs text-ink focus:border-accent focus:outline-none"
                />
              </label>

              <label className="space-y-1 block">
                <span className="font-semibold text-ink-soft">Action Item / Follow-up Task</span>
                <input
                  type="text"
                  placeholder="e.g. Draft IPS and email copy to accountant"
                  value={interactionForm.nextAction}
                  onChange={(e) => setInteractionForm({ ...interactionForm, nextAction: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-raised text-ink text-xs focus:border-accent focus:outline-none"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setInteractionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-ink hover:bg-sunken cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!interactionForm.title.trim()}
                  className="px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-strong text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Save to CRM Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
