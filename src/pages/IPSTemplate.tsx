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
  Info,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { formatCurrency } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { AssetCategory } from '../types';

const STORAGE_KEY = 'soundthesis_ips_state_v1';

interface IPSGoal {
  id: string;
  name: string;
  priority: 'essential' | 'important' | 'aspirational';
  yearsToGoal: number;
  targetAmount: number;
}

interface IPSAsset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
}

interface IPSState {
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
    inflation: 5,
  },
  returnObjective:
    'Achieve long-term capital growth sufficient to fund retirement and essential goals while preserving purchasing power.',
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
  baseCurrency: 'INR',
  foreignExposure: 0,
  hedgePolicy: 'Unhedged — foreign exposure, if any, will be reviewed quarterly.',
  implementationReview:
    'Rebalancing will be reviewed quarterly or when any asset class drifts more than 5% from target. Performance reports will be provided quarterly and the IPS will be reviewed annually or upon material change.',
  goals: [
    { id: 'g1', name: 'Retirement corpus', priority: 'essential', yearsToGoal: 22, targetAmount: 10_000_000 },
    { id: 'g2', name: "Children's education", priority: 'important', yearsToGoal: 12, targetAmount: 3_000_000 },
  ],
  assets: [
    { id: 'a1', name: 'Nifty 50 Index Fund', category: 'equity', value: 2_500_000 },
    { id: 'a2', name: 'Gilt Fund', category: 'debt', value: 1_500_000 },
    { id: 'a3', name: 'Sovereign Gold Bonds', category: 'gold', value: 500_000 },
    { id: 'a4', name: 'Liquid ETF / Cash', category: 'liquid', value: 250_000 },
  ],
  notes: '',
});

type IPSAction =
  | { type: 'reset'; payload?: IPSState }
  | { type: 'updateClient'; payload: Partial<IPSState['client']> }
  | { type: 'updateField'; payload: Partial<Omit<IPSState, 'client' | 'allocation' | 'goals' | 'assets'>> }
  | { type: 'updateAllocation'; category: AssetCategory; value: number }
  | { type: 'addGoal' }
  | { type: 'updateGoal'; id: string; payload: Partial<IPSGoal> }
  | { type: 'removeGoal'; id: string }
  | { type: 'addAsset' }
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
    case 'addGoal': {
      const nextId = `g${Date.now()}`;
      return {
        ...state,
        goals: [
          ...state.goals,
          { id: nextId, name: '', priority: 'important', yearsToGoal: 10, targetAmount: 0 },
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
        assets: [...state.assets, { id: nextId, name: '', category: 'equity', value: 0 }],
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
}

interface FilesState {
  savedFiles: SavedIPS[];
  saveApiAvailable: boolean;
}

type FilesAction =
  | { type: 'set'; files: SavedIPS[] }
  | { type: 'unavailable' };

function filesReducer(state: FilesState, action: FilesAction): FilesState {
  switch (action.type) {
    case 'set':
      return { savedFiles: action.files, saveApiAvailable: true };
    case 'unavailable':
      return { savedFiles: [], saveApiAvailable: false };
    default:
      return state;
  }
}

function loadPersistedState(): IPSState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Basic shape guard.
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

  const totalAllocation = useMemo(
    () => Object.values(state.allocation).reduce((a, b) => a + b, 0),
    [state.allocation],
  );
  const allocationOk = Math.abs(totalAllocation - 100) < 0.1;

  const netWorth = useMemo(
    () => state.assets.reduce((sum, a) => sum + a.value, 0),
    [state.assets],
  );

  const [filesState, dispatchFiles] = useReducer(filesReducer, { savedFiles: [], saveApiAvailable: true });
  const { savedFiles, saveApiAvailable } = filesState;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(null), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  const loadSavedFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/list-ips');
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('IPS storage API unavailable');
      }
      const data = await res.json();
      dispatchFiles({ type: 'set', files: data.files || [] });
    } catch (err) {
      dispatchFiles({ type: 'unavailable' });
      if (err instanceof Error && err.message !== 'IPS storage API unavailable') console.error(err);
    }
  }, [dispatchFiles]);

  useEffect(() => {
    loadSavedFiles();
  }, [loadSavedFiles]);

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaveStatus('saving');
    setStatusMessage(null);
    try {
      const content = generateIPSMarkdown(state, netWorth);
      const filename = `IPS-${state.client.name || 'client'}-${state.client.reviewDate}`;
      const res = await fetch('/api/save-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
      setSaveStatus('saved');
      setStatusMessage(`Saved to ips/${data.filename}`);
      setShowToast({ message: 'IPS saved successfully.', type: 'success' });
      await loadSavedFiles();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage(err?.message || 'Save failed');
      setShowToast({ message: err?.message || 'Save failed', type: 'error' });
    }
  };

  const handleLoad = async (filename: string) => {
    setLoadStatus('loading');
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/load-ips?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (!res.ok || !data.content) throw new Error(data.error || 'Load failed');
      const parsed = parseIPSMarkdown(data.content);
      dispatch({ type: 'reset', payload: parsed });
      setLoadStatus('idle');
      setStatusMessage(`Loaded ${filename} into the form`);
      setShowToast({ message: `Loaded ${filename}`, type: 'success' });
    } catch (err: any) {
      setLoadStatus('error');
      setStatusMessage(err?.message || 'Load failed');
      setShowToast({ message: err?.message || 'Load failed', type: 'error' });
    }
  };

  const handleDownload = () => {
    const content = generateIPSMarkdown(state, netWorth);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPS-${state.client.name || 'client'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowToast({ message: 'Exported IPS markdown document.', type: 'success' });
  };

  const currentAllocationPct = (category: AssetCategory) => {
    if (netWorth <= 0) return 0;
    const sum = state.assets.filter((a) => a.category === category).reduce((s, a) => s + a.value, 0);
    return (sum / netWorth) * 100;
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Investment Policy Statement"
        subtitle="A fully standalone IPS generator. Enter client details, goals, assets, and allocation targets directly here — no dependency on the rest of the plan."
        badge="CFAI Framework"
      />

      <Card className="bg-amber-50/60 border-amber-100 print:hidden">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            This page is intentionally independent. Anything you type here is saved locally and used only
            to generate the IPS document below. It will not affect Dashboard, Master Plan, or Reports.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 space-y-5">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2">
            <FileText size={18} className="text-gold" /> IPS Inputs
          </h3>

          {/* Client profile */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-700">Client Profile</div>
            <LabelledInput
              id={fieldId('clientName')}
              label="Client Name"
              value={state.client.name}
              onChange={(v) => dispatch({ type: 'updateClient', payload: { name: v } })}
              placeholder="e.g. Vikram & Ananya Sharma"
            />
            <LabelledInput
              id={fieldId('adviser')}
              label="Adviser / Firm"
              value={state.client.advisor}
              onChange={(v) => dispatch({ type: 'updateClient', payload: { advisor: v } })}
              placeholder="e.g. Sound Thesis Wealth Advisory"
            />
            <LabelledDate
              id={fieldId('reviewDate')}
              label="Next Review Date"
              value={state.client.reviewDate}
              onChange={(v) => dispatch({ type: 'updateClient', payload: { reviewDate: v } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Current Age" value={state.client.currentAge} onChange={(v) => dispatch({ type: 'updateClient', payload: { currentAge: v } })} min={18} max={100} />
              <NumberInput label="Retirement Age" value={state.client.retirementAge} onChange={(v) => dispatch({ type: 'updateClient', payload: { retirementAge: v } })} min={30} max={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Life Expectancy" value={state.client.lifeExpectancy} onChange={(v) => dispatch({ type: 'updateClient', payload: { lifeExpectancy: v } })} min={30} max={120} />
              <NumberInput label="Inflation Assumption" value={state.client.inflation} onChange={(v) => dispatch({ type: 'updateClient', payload: { inflation: v } })} suffix="%" min={0} max={20} />
            </div>
          </div>

          {/* Objectives */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-700">Objectives</div>
            <div>
              <label htmlFor={fieldId('returnObjective')} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Return Objective
              </label>
              <textarea
                id={fieldId('returnObjective')}
                value={state.returnObjective}
                onChange={(e) => dispatch({ type: 'updateField', payload: { returnObjective: e.target.value } })}
                rows={3}
                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor={fieldId('riskTolerance')} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Risk Tolerance
              </label>
              <select
                id={fieldId('riskTolerance')}
                value={state.riskTolerance}
                onChange={(e) => dispatch({ type: 'updateField', payload: { riskTolerance: e.target.value as IPSState['riskTolerance'] } })}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <NumberInput label="Max Drawdown Tolerance" value={state.maxDrawdown} onChange={(v) => dispatch({ type: 'updateField', payload: { maxDrawdown: v } })} suffix="%" min={0} max={100} />
          </div>

          {/* Allocation */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-700">Strategic Asset Allocation</div>
            {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
              <NumberInput
                key={cat}
                label={categoryLabels[cat]}
                value={state.allocation[cat]}
                onChange={(v) => dispatch({ type: 'updateAllocation', category: cat, value: v })}
                suffix="%"
                min={0}
                max={100}
              />
            ))}
            <div className={`text-xs font-medium ${allocationOk ? 'text-green-700' : 'text-red-600'}`}>
              Total: {totalAllocation.toFixed(1)}%{' '}
              {allocationOk ? <CheckCircle size={12} className="inline ml-1" /> : '(must equal 100%)'}
            </div>
          </div>

          {/* Currency */}
          <LabelledInput
            id={fieldId('baseCurrency')}
            label="Base Currency"
            value={state.baseCurrency}
            onChange={(v) => dispatch({ type: 'updateField', payload: { baseCurrency: v } })}
            placeholder="e.g. INR"
          />
          <NumberInput label="Foreign Exposure Limit" value={state.foreignExposure} onChange={(v) => dispatch({ type: 'updateField', payload: { foreignExposure: v } })} suffix="%" min={0} max={100} />
          <div>
            <label htmlFor={fieldId('hedgePolicy')} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Hedging Policy
            </label>
            <textarea
              id={fieldId('hedgePolicy')}
              value={state.hedgePolicy}
              onChange={(e) => dispatch({ type: 'updateField', payload: { hedgePolicy: e.target.value } })}
              rows={2}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none"
            />
          </div>

          {/* Implementation & Review */}
          <div>
            <label htmlFor={fieldId('implementationReview')} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Implementation & Review Policy
            </label>
            <textarea
              id={fieldId('implementationReview')}
              value={state.implementationReview}
              onChange={(e) => dispatch({ type: 'updateField', payload: { implementationReview: e.target.value } })}
              rows={3}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={fieldId('notes')} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Special Notes
            </label>
            <textarea
              id={fieldId('notes')}
              value={state.notes}
              onChange={(e) => dispatch({ type: 'updateField', payload: { notes: e.target.value } })}
              rows={2}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer size={16} className="mr-2" /> Print
              </Button>
              <Button className="flex-1" onClick={handleDownload}>
                <Download size={16} className="mr-2" /> Export MD
              </Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={handleSave} disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              Save to ips/ folder
            </Button>
            {(statusMessage || showToast) && (
              <div
                className={`flex items-center gap-2 text-xs ${
                  saveStatus === 'error' || loadStatus === 'error' || showToast?.type === 'error' ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {saveStatus === 'error' || loadStatus === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                {statusMessage || showToast?.message}
              </div>
            )}
          </div>

          {/* Saved files */}
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-sm font-serif text-navy flex items-center gap-2 mb-3">
              <FolderOpen size={16} className="text-gold" /> Saved IPS Documents
            </h4>
            {savedFiles.length === 0 ? (
              <p className="text-xs text-stone-700">
                {saveApiAvailable
                  ? 'No saved IPS files yet.'
                  : 'Server-side save/load requires the API (available on the deployed app). Use Download instead.'}
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {savedFiles.map((file) => (
                  <li key={file.name} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[140px] text-navy" title={file.name}>
                      {file.name}
                    </span>
                    <Button variant="outline" size="sm" className="text-xs px-2 py-1" onClick={() => handleLoad(file.name)}>
                      Load
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Helpers */}
          <div className="pt-4 border-t border-stone-200 flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => dispatch({ type: 'reset', payload: defaultState() })}>
              <RotateCcw size={14} className="mr-1" /> Reset Sample
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => dispatch({ type: 'reset' })}>
              <Eraser size={14} className="mr-1" /> Clear All
            </Button>
          </div>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2 bg-white print:shadow-none">
          <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-navy">
            <h1>Investment Policy Statement</h1>
            <p>
              <em>CFA Institute Framework — Individual Investor</em>
            </p>

            <h2>1. Client Identification</h2>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="min-w-[320px]">
                <tbody>
                  <tr>
                    <td>
                      <strong>Client name(s)</strong>
                    </td>
                    <td>{state.client.name || '[To be completed]'}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Current age</strong>
                    </td>
                    <td>{state.client.currentAge}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Retirement age</strong>
                    </td>
                    <td>{state.client.retirementAge}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Life expectancy</strong>
                    </td>
                    <td>{state.client.lifeExpectancy}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Adviser / firm</strong>
                    </td>
                    <td>{state.client.advisor}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Next review date</strong>
                    </td>
                    <td>{state.client.reviewDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>2. Investment Objectives</h2>
            <p>
              <strong>Return objective:</strong> {state.returnObjective}
            </p>
            <p>
              <strong>Risk tolerance:</strong>{' '}
              {state.riskTolerance.charAt(0).toUpperCase() + state.riskTolerance.slice(1)}
            </p>
            <p>
              <strong>Maximum acceptable drawdown:</strong> {state.maxDrawdown}% over a 12-month period.
            </p>
            <p>
              <strong>Inflation assumption:</strong> {state.client.inflation}%
            </p>

            <h2>3. Constraints</h2>
            <p>
              <strong>Liquidity:</strong> Current net worth is {formatCurrency(netWorth)}. Liquid / emergency reserve
              should cover at least 6–12 months of expenses.
            </p>
            <p>
              <strong>Time horizon:</strong>{' '}
              {Math.max(0, state.client.retirementAge - state.client.currentAge)} years to retirement;{' '}
              {Math.max(0, state.client.lifeExpectancy - state.client.retirementAge)} years distribution phase.
            </p>
            <p>
              <strong>Tax considerations:</strong> Tax-efficient vehicles and harvesting should be reviewed annually.
            </p>

            <h2>4. Goals & Liabilities</h2>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="min-w-[360px]">
                <thead>
                  <tr>
                    <th>Goal</th>
                    <th>Priority</th>
                    <th>Years</th>
                    <th>Target (Today)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.goals.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-stone-500 italic">
                        No goals entered.
                      </td>
                    </tr>
                  )}
                  {state.goals.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name || '[Unnamed]'}</td>
                      <td>{g.priority}</td>
                      <td>{g.yearsToGoal}</td>
                      <td>{formatCurrency(g.targetAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>5. Strategic Asset Allocation</h2>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="min-w-[360px]">
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th>Target</th>
                    <th>Current</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(categoryLabels) as AssetCategory[]).map((cat) => (
                    <tr key={cat}>
                      <td>{categoryLabels[cat]}</td>
                      <td>{state.allocation[cat]}%</td>
                      <td>{currentAllocationPct(cat).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>6. Current Holdings</h2>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="min-w-[360px]">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Category</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {state.assets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-stone-500 italic">
                        No assets entered.
                      </td>
                    </tr>
                  )}
                  {state.assets.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name || '[Unnamed]'}</td>
                      <td>{categoryLabels[a.category]}</td>
                      <td className="text-right">{formatCurrency(a.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>7. Currency Policy</h2>
            <p>
              <strong>Base currency:</strong> {state.baseCurrency || 'INR'}
            </p>
            <p>
              <strong>Foreign exposure limit:</strong> {state.foreignExposure}%
            </p>
            <p>
              <strong>Hedging policy:</strong> {state.hedgePolicy}
            </p>

            <h2>8. Implementation & Review</h2>
            <p>{state.implementationReview}</p>

            {state.notes && (
              <>
                <h2>9. Special Notes</h2>
                <p>{state.notes}</p>
              </>
            )}

            <h2>Signatures</h2>
            <table>
              <tbody>
                <tr>
                  <td>
                    <strong>Client</strong>
                  </td>
                  <td>____________________</td>
                  <td>________</td>
                </tr>
                <tr>
                  <td>
                    <strong>Investment Adviser</strong>
                  </td>
                  <td>____________________</td>
                  <td>________</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Inline editors for goals and assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Goals & Liabilities</h3>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'addGoal' })}>
              <Plus size={14} className="mr-1" /> Add Goal
            </Button>
          </div>
          <div className="space-y-3">
            {state.goals.map((g) => (
              <div key={g.id} className="grid grid-cols-12 gap-2 items-end bg-stone-50 rounded-xl p-3">
                <div className="col-span-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`goal-name-${g.id}`}>Name</label>
                  <input
                    id={`goal-name-${g.id}`}
                    type="text"
                    value={g.name}
                    onChange={(e) => dispatch({ type: 'updateGoal', id: g.id, payload: { name: e.target.value } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Goal name"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`goal-priority-${g.id}`}>Priority</label>
                  <select
                    id={`goal-priority-${g.id}`}
                    value={g.priority}
                    onChange={(e) => dispatch({ type: 'updateGoal', id: g.id, payload: { priority: e.target.value as IPSGoal['priority'] } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Goal priority"
                  >
                    <option value="essential">Essential</option>
                    <option value="important">Important</option>
                    <option value="aspirational">Aspirational</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`goal-years-${g.id}`}>Years</label>
                  <input
                    id={`goal-years-${g.id}`}
                    type="number"
                    min={0}
                    value={g.yearsToGoal}
                    onChange={(e) => dispatch({ type: 'updateGoal', id: g.id, payload: { yearsToGoal: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Years to goal"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`goal-target-${g.id}`}>Target</label>
                  <input
                    id={`goal-target-${g.id}`}
                    type="number"
                    min={0}
                    value={g.targetAmount}
                    onChange={(e) => dispatch({ type: 'updateGoal', id: g.id, payload: { targetAmount: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Goal target amount"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'removeGoal', id: g.id })}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Remove goal"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {state.goals.length === 0 && <p className="text-sm text-stone-500 italic">No goals added yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif text-navy">Current Holdings</h3>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'addAsset' })}>
              <Plus size={14} className="mr-1" /> Add Asset
            </Button>
          </div>
          <div className="space-y-3">
            {state.assets.map((a) => (
              <div key={a.id} className="grid grid-cols-12 gap-2 items-end bg-stone-50 rounded-xl p-3">
                <div className="col-span-5">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`asset-name-${a.id}`}>Name</label>
                  <input
                    id={`asset-name-${a.id}`}
                    type="text"
                    value={a.name}
                    onChange={(e) => dispatch({ type: 'updateAsset', id: a.id, payload: { name: e.target.value } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Asset name"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`asset-category-${a.id}`}>Category</label>
                  <select
                    id={`asset-category-${a.id}`}
                    value={a.category}
                    onChange={(e) => dispatch({ type: 'updateAsset', id: a.id, payload: { category: e.target.value as AssetCategory } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
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
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-700 mb-1" htmlFor={`asset-value-${a.id}`}>Value</label>
                  <input
                    id={`asset-value-${a.id}`}
                    type="number"
                    min={0}
                    value={a.value}
                    onChange={(e) => dispatch({ type: 'updateAsset', id: a.id, payload: { value: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                    aria-label="Asset value"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'removeAsset', id: a.id })}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Remove asset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {state.assets.length === 0 && <p className="text-sm text-stone-500 italic">No assets added yet.</p>}
          </div>
        </Card>
      </div>

      <div className="print:hidden">
        <WorkflowFooter
          prev={{ path: '/reports', label: 'Reports' }}
          next={{ path: '/calculators', label: 'Calculators' }}
          flowHint="A formal Investment Policy Statement institutionalizes your strategic asset allocation and rebalancing rules."
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
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
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
      <label htmlFor={id} className="block text-[11px] font-semibold uppercase tracking-wider text-stone-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
      />
    </div>
  );
}

function generateIPSMarkdown(state: IPSState, netWorth: number): string {
  const currentPct = (cat: AssetCategory) => {
    if (netWorth <= 0) return '0.0';
    const sum = state.assets.filter((a) => a.category === cat).reduce((s, a) => s + a.value, 0);
    return ((sum / netWorth) * 100).toFixed(1);
  };

  const goalsMd =
    state.goals.length === 0
      ? '_No goals entered._'
      : state.goals
          .map(
            (g) =>
              `- ${g.name || '[Unnamed]'} (${g.priority}): ${g.yearsToGoal} years, ₹${g.targetAmount.toLocaleString('en-IN')}`,
          )
          .join('\n');

  const assetsMd =
    state.assets.length === 0
      ? '_No assets entered._'
      : state.assets
          .map((a) => `- ${a.name || '[Unnamed]'} (${categoryLabels[a.category]}): ₹${a.value.toLocaleString('en-IN')}`)
          .join('\n');

  return `# Investment Policy Statement

## Client Identification

- **Client name(s):** ${state.client.name || '[To be completed]'}
- **Current age:** ${state.client.currentAge}
- **Retirement age:** ${state.client.retirementAge}
- **Life expectancy:** ${state.client.lifeExpectancy}
- **Adviser / firm:** ${state.client.advisor}
- **Next review date:** ${state.client.reviewDate}

## Investment Objectives

- **Return objective:** ${state.returnObjective}
- **Risk tolerance:** ${state.riskTolerance}
- **Maximum acceptable drawdown:** ${state.maxDrawdown}%
- **Inflation assumption:** ${state.client.inflation}%

## Constraints

- **Liquidity:** Current net worth is ₹${netWorth.toLocaleString('en-IN')}.
- **Time horizon:** ${Math.max(0, state.client.retirementAge - state.client.currentAge)} years to retirement; ${Math.max(0, state.client.lifeExpectancy - state.client.retirementAge)} years distribution phase.
- **Tax considerations:** Tax-efficient vehicles and loss harvesting reviewed annually.

## Goals

${goalsMd}

## Strategic Asset Allocation

| Asset Class | Target | Current |
|-------------|--------|---------|
| Equity | ${state.allocation.equity}% | ${currentPct('equity')}% |
| Debt | ${state.allocation.debt}% | ${currentPct('debt')}% |
| Gold | ${state.allocation.gold}% | ${currentPct('gold')}% |
| Real Estate | ${state.allocation.realestate}% | ${currentPct('realestate')}% |
| Liquid | ${state.allocation.liquid}% | ${currentPct('liquid')}% |
| Other | ${state.allocation.other}% | ${currentPct('other')}% |

## Current Holdings

${assetsMd}

## Currency Policy

- **Base currency:** ${state.baseCurrency || 'INR'}
- **Foreign exposure limit:** ${state.foreignExposure}%
- **Hedging policy:** ${state.hedgePolicy}

## Implementation & Review

${state.implementationReview}

## Special Notes

${state.notes || 'None.'}

## Signatures

- **Client:** ____________________ Date: ________
- **Investment Adviser:** ____________________ Date: ________
`;
}

function parseIPSMarkdown(md: string): IPSState {
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

  const clientName = field('Client name\\(s\\)');
  if (clientName && clientName !== '[To be completed]') next.client.name = clientName;
  const adviser = field('Adviser / firm');
  if (adviser) next.client.advisor = adviser;
  const reviewDate = field('Next review date');
  if (reviewDate && /^\d{4}-\d{2}-\d{2}/.test(reviewDate)) next.client.reviewDate = reviewDate.slice(0, 10);

  const currentAge = num(field('Current age'));
  if (currentAge !== null) next.client.currentAge = Math.round(currentAge);
  const retirementAge = num(field('Retirement age'));
  if (retirementAge !== null) next.client.retirementAge = Math.round(retirementAge);
  const lifeExpectancy = num(field('Life expectancy'));
  if (lifeExpectancy !== null) next.client.lifeExpectancy = Math.round(lifeExpectancy);

  const returnObjective = field('Return objective');
  if (returnObjective) next.returnObjective = returnObjective;
  const riskTolerance = field('Risk tolerance')?.toLowerCase();
  if (riskTolerance === 'low' || riskTolerance === 'moderate' || riskTolerance === 'high')
    next.riskTolerance = riskTolerance;
  const maxDrawdown = num(field('Maximum acceptable drawdown'));
  if (maxDrawdown !== null) next.maxDrawdown = maxDrawdown;

  const inflation = num(field('Inflation assumption'));
  if (inflation !== null) next.client.inflation = inflation;

  const row = (label: string) => {
    const m = md.match(new RegExp(`^\\s*\\|\\s*${label}\\s*\\|\\s*([\\d.]+)%`, 'm'));
    return m ? parseFloat(m[1]) : null;
  };
  const equity = row('Equity');
  if (equity !== null) next.allocation.equity = equity;
  const debt = row('Debt');
  if (debt !== null) next.allocation.debt = debt;
  const gold = row('Gold');
  if (gold !== null) next.allocation.gold = gold;
  const realestate = row('Real Estate');
  if (realestate !== null) next.allocation.realestate = realestate;
  const liquid = row('Liquid');
  if (liquid !== null) next.allocation.liquid = liquid;
  const other = row('Other');
  if (other !== null) next.allocation.other = other;

  const foreignExposure = num(field('Foreign exposure limit'));
  if (foreignExposure !== null) next.foreignExposure = foreignExposure;
  const hedgePolicy = field('Hedging policy');
  if (hedgePolicy) next.hedgePolicy = hedgePolicy;

  const baseCurrency = field('Base currency');
  if (baseCurrency) next.baseCurrency = baseCurrency;

  const implementationMatch = md.match(/##\s*Implementation & Review\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (implementationMatch) {
    next.implementationReview = implementationMatch[1].trim();
  }

  const notesMatch = md.match(/##\s*Special Notes\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (notesMatch) {
    const notes = notesMatch[1].trim();
    next.notes = notes === 'None.' ? '' : notes;
  }

  // Parse goals from markdown list lines under ## Goals
  const goalsMatch = md.match(/##\s*Goals\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (goalsMatch) {
    const parsedGoals: IPSGoal[] = [];
    const lines = goalsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(.+?)\s+\((essential|important|aspirational)\):\s+(\d+)\s+years?,\s*₹?([\d,]+)/i);
      if (m) {
        parsedGoals.push({
          id: `g${idx++}`,
          name: m[1].trim(),
          priority: m[2] as IPSGoal['priority'],
          yearsToGoal: parseInt(m[3], 10),
          targetAmount: parseInt(m[4].replace(/,/g, ''), 10),
        });
      }
    }
    if (parsedGoals.length > 0) next.goals = parsedGoals;
  }

  // Parse assets from markdown list lines under ## Current Holdings
  const assetsMatch = md.match(/##\s*Current Holdings\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (assetsMatch) {
    const parsedAssets: IPSAsset[] = [];
    const lines = assetsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(.+?)\s+\((Equity|Debt|Gold|Real Estate|Liquid|Other)\):\s*₹?([\d,]+)/i);
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
