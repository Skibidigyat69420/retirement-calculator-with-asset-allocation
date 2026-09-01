import { useState, useEffect } from 'react';
import { FileText, Download, Printer, CheckCircle, Save, FolderOpen, RefreshCw, AlertCircle } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

interface SavedIPS {
  name: string;
  updatedAt: string;
}

interface IPSForm {
  clientName: string;
  adviser: string;
  reviewDate: string;
  returnObjective: string;
  riskTolerance: 'low' | 'moderate' | 'high';
  maxDrawdown: number;
  equityTarget: number;
  debtTarget: number;
  goldTarget: number;
  realestateTarget: number;
  liquidTarget: number;
  otherTarget: number;
  foreignExposure: number;
  hedgePolicy: string;
  notes: string;
}

export const IPSTemplate = () => {
  const { inputs, riskProfile, manualTargets, updateClient, showToast } = useCalculator();
  const netWorth = inputs.assets.reduce((sum, a) => sum + a.value, 0);
  // Prefer manual allocation overrides (from the Allocation page) over the
  // risk-profile defaults so the IPS reflects the live target mix.
  const initialTargets = manualTargets || riskProfile.targets;

  const [form, setForm] = useState<IPSForm>(() => ({
    clientName: inputs.client?.name || '',
    adviser: inputs.client?.advisor || 'Sound Thesis Wealth Advisory',
    reviewDate: inputs.client?.reviewDate || new Date().toISOString().split('T')[0],
    returnObjective: 'Achieve long-term capital growth sufficient to fund retirement and essential goals while preserving purchasing power.',
    riskTolerance: riskProfile.label.toLowerCase().includes('conservative') ? 'low' : riskProfile.label.toLowerCase().includes('aggressive') ? 'high' : 'moderate',
    maxDrawdown: Math.abs(riskProfile.maxDrawdown),
    equityTarget: initialTargets.equity,
    debtTarget: initialTargets.debt,
    goldTarget: initialTargets.gold,
    realestateTarget: initialTargets.realestate,
    liquidTarget: initialTargets.liquid,
    otherTarget: initialTargets.other,
    foreignExposure: 0,
    hedgePolicy: 'Unhedged — foreign exposure, if any, will be reviewed quarterly.',
    notes: inputs.client?.notes || '',
  }));

  const totalAllocation = form.equityTarget + form.debtTarget + form.goldTarget + form.realestateTarget + form.liquidTarget + form.otherTarget;
  const allocationOk = Math.abs(totalAllocation - 100) < 0.1;

  const [savedFiles, setSavedFiles] = useState<SavedIPS[]>([]);
  const [saveApiAvailable, setSaveApiAvailable] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadSavedFiles = async () => {
    try {
      const res = await fetch('/api/list-ips');
      // Static hosting (no API) serves index.html for /api/* — detect that
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('IPS storage API unavailable');
      }
      const data = await res.json();
      setSavedFiles(data.files || []);
      setSaveApiAvailable(true);
    } catch (err) {
      setSaveApiAvailable(false);
      setSavedFiles([]);
      if (err instanceof Error && err.message !== 'IPS storage API unavailable') console.error(err);
    }
  };

  useEffect(() => {
    loadSavedFiles();
  }, []);

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaveStatus('saving');
    setStatusMessage(null);
    try {
      const content = generateIPSMarkdown(form, inputs, netWorth);
      const filename = `IPS-${form.clientName || 'client'}-${form.reviewDate}`;
      const res = await fetch('/api/save-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
      setSaveStatus('saved');
      setStatusMessage(`Saved to ips/${data.filename}`);
      await loadSavedFiles();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage(err?.message || 'Save failed');
    }
  };

  const handleLoad = async (filename: string) => {
    setLoadStatus('loading');
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/load-ips?filename=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (!res.ok || !data.content) throw new Error(data.error || 'Load failed');
      setForm((prev) => parseIPSMarkdown(data.content, prev));
      setLoadStatus('idle');
      setStatusMessage(`Loaded ${filename} into the form`);
    } catch (err: any) {
      setLoadStatus('error');
      setStatusMessage(err?.message || 'Load failed');
    }
  };

  const handleDownload = () => {
    const content = generateIPSMarkdown(form, inputs, netWorth);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPS-${form.clientName || 'client'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported IPS markdown document.', 'success');
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Investment Policy Statement"
        subtitle="Generate a CFA Institute-aligned IPS tailored to the current plan. Export as Markdown for professional documentation."
        badge="CFAI Framework"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-serif text-navy flex items-center gap-2"><FileText size={18} className="text-gold" /> IPS Inputs</h3>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Client Name</label>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({ ...prev, clientName: name }));
                updateClient({ name });
              }}
              placeholder="e.g. Vikram & Ananya Sharma"
              className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Adviser / Firm</label>
            <input
              type="text"
              value={form.adviser}
              onChange={(e) => {
                const advisor = e.target.value;
                setForm((prev) => ({ ...prev, adviser: advisor }));
                updateClient({ advisor });
              }}
              placeholder="e.g. Sound Thesis Wealth Advisory"
              className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Next Review Date</label>
            <input
              type="date"
              value={form.reviewDate}
              onChange={(e) => {
                const reviewDate = e.target.value;
                setForm((prev) => ({ ...prev, reviewDate }));
                updateClient({ reviewDate });
              }}
              className="w-full bg-transparent border-b border-stone-300 py-2 text-sm font-medium text-navy focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Return Objective</label>
            <textarea value={form.returnObjective} onChange={(e) => setForm({ ...form, returnObjective: e.target.value })} rows={3} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Risk Tolerance</label>
            <select value={form.riskTolerance} onChange={(e) => setForm({ ...form, riskTolerance: e.target.value as IPSForm['riskTolerance'] })} className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>

          <NumberInput label="Max Drawdown Tolerance" value={form.maxDrawdown} onChange={(v) => setForm({ ...form, maxDrawdown: v })} suffix="%" />

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Strategic Asset Allocation</div>
            <NumberInput label="Equity Target" value={form.equityTarget} onChange={(v) => setForm({ ...form, equityTarget: v })} suffix="%" />
            <NumberInput label="Debt Target" value={form.debtTarget} onChange={(v) => setForm({ ...form, debtTarget: v })} suffix="%" />
            <NumberInput label="Gold Target" value={form.goldTarget} onChange={(v) => setForm({ ...form, goldTarget: v })} suffix="%" />
            <NumberInput label="Real Estate Target" value={form.realestateTarget} onChange={(v) => setForm({ ...form, realestateTarget: v })} suffix="%" />
            <NumberInput label="Liquid Target" value={form.liquidTarget} onChange={(v) => setForm({ ...form, liquidTarget: v })} suffix="%" />
            <NumberInput label="Other Target" value={form.otherTarget} onChange={(v) => setForm({ ...form, otherTarget: v })} suffix="%" />
            <div className={`text-xs font-medium ${allocationOk ? 'text-green-600' : 'text-red-600'}`}>
              Total: {totalAllocation.toFixed(1)}% {allocationOk ? <CheckCircle size={12} className="inline ml-1" /> : '(must equal 100%)'}
            </div>
          </div>

          <NumberInput label="Foreign Exposure Limit" value={form.foreignExposure} onChange={(v) => setForm({ ...form, foreignExposure: v })} suffix="%" />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Hedging Policy</label>
            <textarea value={form.hedgePolicy} onChange={(e) => setForm({ ...form, hedgePolicy: e.target.value })} rows={2} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Special Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-navy focus:border-gold focus:outline-none" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handlePrint}><Printer size={16} className="mr-2" /> Print</Button>
              <Button className="flex-1" onClick={handleDownload}><Download size={16} className="mr-2" /> Export MD</Button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              Save to ips/ folder
            </Button>
            {statusMessage && (
              <div className={`flex items-center gap-2 text-xs ${saveStatus === 'error' || loadStatus === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {saveStatus === 'error' || loadStatus === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                {statusMessage}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-sm font-serif text-navy flex items-center gap-2 mb-3">
              <FolderOpen size={16} className="text-gold" /> Saved IPS Documents
            </h4>
            {savedFiles.length === 0 ? (
              <p className="text-xs text-stone-500">
                {saveApiAvailable
                  ? 'No saved IPS files yet.'
                  : 'Server-side save/load requires the API (available on the deployed app). Use Download instead.'}
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {savedFiles.map((file) => (
                  <li key={file.name} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[140px] text-navy" title={file.name}>{file.name}</span>
                    <Button variant="outline" size="sm" className="text-xs px-2 py-1" onClick={() => handleLoad(file.name)}>
                      Load
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2 bg-white print:shadow-none">
          <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-navy">
            <h1>Investment Policy Statement</h1>
            <p><em>CFA Institute Framework — Individual Investor</em></p>

            <h2>1. Client Identification</h2>
            <table>
              <tbody>
                <tr><td><strong>Client name(s)</strong></td><td>{form.clientName || '[To be completed]'}</td></tr>
                <tr><td><strong>Current age</strong></td><td>{inputs.currentAge}</td></tr>
                <tr><td><strong>Retirement age</strong></td><td>{inputs.retirementAge}</td></tr>
                <tr><td><strong>Adviser / firm</strong></td><td>{form.adviser}</td></tr>
                <tr><td><strong>Next review date</strong></td><td>{form.reviewDate}</td></tr>
              </tbody>
            </table>

            <h2>2. Investment Objectives</h2>
            <p><strong>Return objective:</strong> {form.returnObjective}</p>
            <p><strong>Risk tolerance:</strong> {form.riskTolerance.charAt(0).toUpperCase() + form.riskTolerance.slice(1)}</p>
            <p><strong>Maximum acceptable drawdown:</strong> {form.maxDrawdown}% over a 12-month period.</p>
            <p><strong>Inflation assumption:</strong> {inputs.inflation}%</p>

            <h2>3. Constraints</h2>
            <p><strong>Liquidity:</strong> Current net worth is {formatCurrency(netWorth)}. Liquid / emergency reserve should cover at least 6–12 months of expenses.</p>
            <p><strong>Time horizon:</strong> {Math.max(0, inputs.retirementAge - inputs.currentAge)} years to retirement; {Math.max(0, inputs.lifeExpectancy - inputs.retirementAge)} years distribution phase.</p>
            <p><strong>Tax considerations:</strong> Tax-efficient vehicles and harvesting should be reviewed annually.</p>

            <h2>4. Goals & Liabilities</h2>
            <table>
              <thead>
                <tr><th>Goal</th><th>Priority</th><th>Years</th><th>Target (Today)</th></tr>
              </thead>
              <tbody>
                {inputs.goals.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td>{g.priority}</td>
                    <td>{g.yearsToGoal}</td>
                    <td>{formatCurrency(g.targetAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2>5. Strategic Asset Allocation</h2>
            <table>
              <thead>
                <tr><th>Asset Class</th><th>Target</th><th>Current</th></tr>
              </thead>
              <tbody>
                <tr><td>Equity</td><td>{form.equityTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'equity').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
                <tr><td>Debt</td><td>{form.debtTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'debt').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
                <tr><td>Gold</td><td>{form.goldTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'gold').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
                <tr><td>Real Estate</td><td>{form.realestateTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'realestate').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
                <tr><td>Liquid</td><td>{form.liquidTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'liquid').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
                <tr><td>Other</td><td>{form.otherTarget}%</td><td>{((inputs.assets.filter((a) => a.category === 'other').reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1)}%</td></tr>
              </tbody>
            </table>

            <h2>6. Currency Policy</h2>
            <p><strong>Base currency:</strong> INR</p>
            <p><strong>Foreign exposure limit:</strong> {form.foreignExposure}%</p>
            <p><strong>Hedging policy:</strong> {form.hedgePolicy}</p>

            <h2>7. Implementation & Review</h2>
            <p>Rebalancing will be reviewed quarterly or when any asset class drifts more than 5% from target. Performance reports will be provided quarterly and the IPS will be reviewed annually or upon material change.</p>

            {form.notes && (
              <>
                <h2>8. Special Notes</h2>
                <p>{form.notes}</p>
              </>
            )}

            <h2>Signatures</h2>
            <table>
              <tbody>
                <tr><td><strong>Client</strong></td><td>____________________</td><td>________</td></tr>
                <tr><td><strong>Investment Adviser</strong></td><td>____________________</td><td>________</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="print:hidden">
        <WorkflowFooter
          prev={{ path: '/reports', label: 'Plan Reports' }}
          next={{ path: '/calculators', label: 'Financial Calculators' }}
          flowHint="A formal Investment Policy Statement institutionalizes your strategic asset allocation and rebalancing rules."
        />
      </div>
    </div>
  );
};

function generateIPSMarkdown(form: IPSForm, inputs: ReturnType<typeof useCalculator>['inputs'], netWorth: number): string {
  const currentPct = (cat: string) => ((inputs.assets.filter((a) => a.category === cat).reduce((s, a) => s + a.value, 0) / Math.max(netWorth, 1)) * 100).toFixed(1);
  return `# Investment Policy Statement

## Client Identification

- **Client name(s):** ${form.clientName || '[To be completed]'}
- **Current age:** ${inputs.currentAge}
- **Retirement age:** ${inputs.retirementAge}
- **Adviser / firm:** ${form.adviser}
- **Next review date:** ${form.reviewDate}

## Investment Objectives

- **Return objective:** ${form.returnObjective}
- **Risk tolerance:** ${form.riskTolerance}
- **Maximum acceptable drawdown:** ${form.maxDrawdown}%
- **Inflation assumption:** ${inputs.inflation}%

## Constraints

- **Liquidity:** Current net worth is ₹${netWorth.toLocaleString('en-IN')}.
- **Time horizon:** ${Math.max(0, inputs.retirementAge - inputs.currentAge)} years to retirement.
- **Tax considerations:** Tax-efficient vehicles and loss harvesting reviewed annually.

## Goals

${inputs.goals.map((g) => `- ${g.name} (${g.priority}): ${g.yearsToGoal} years, ₹${g.targetAmount.toLocaleString('en-IN')}`).join('\n')}

## Strategic Asset Allocation

| Asset Class | Target | Current |
|-------------|--------|---------|
| Equity | ${form.equityTarget}% | ${currentPct('equity')}% |
| Debt | ${form.debtTarget}% | ${currentPct('debt')}% |
| Gold | ${form.goldTarget}% | ${currentPct('gold')}% |
| Real Estate | ${form.realestateTarget}% | ${currentPct('realestate')}% |
| Liquid | ${form.liquidTarget}% | ${currentPct('liquid')}% |
| Other | ${form.otherTarget}% | ${currentPct('other')}% |

## Currency Policy

- **Base currency:** INR
- **Foreign exposure limit:** ${form.foreignExposure}%
- **Hedging policy:** ${form.hedgePolicy}

## Special Notes

${form.notes || 'None.'}

## Signatures

- **Client:** ____________________ Date: ________
- **Investment Adviser:** ____________________ Date: ________
`;
}

/** Parse a saved IPS markdown document back into the form state. Fields that
 *  cannot be found in the document keep their current values. */
function parseIPSMarkdown(md: string, current: IPSForm): IPSForm {
  const next = { ...current };
  const field = (label: string) => {
    const m = md.match(new RegExp(`^-\\s*\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const num = (raw: string | null) => {
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  };

  const clientName = field('Client name\\(s\\)');
  if (clientName && clientName !== '[To be completed]') next.clientName = clientName;
  const adviser = field('Adviser / firm');
  if (adviser) next.adviser = adviser;
  const reviewDate = field('Next review date');
  if (reviewDate && /^\d{4}-\d{2}-\d{2}/.test(reviewDate)) next.reviewDate = reviewDate.slice(0, 10);
  const returnObjective = field('Return objective');
  if (returnObjective) next.returnObjective = returnObjective;
  const riskTolerance = field('Risk tolerance')?.toLowerCase();
  if (riskTolerance === 'low' || riskTolerance === 'moderate' || riskTolerance === 'high') next.riskTolerance = riskTolerance;
  const maxDrawdown = num(field('Maximum acceptable drawdown'));
  if (maxDrawdown !== null) next.maxDrawdown = maxDrawdown;
  const foreignExposure = num(field('Foreign exposure limit'));
  if (foreignExposure !== null) next.foreignExposure = foreignExposure;
  const hedgePolicy = field('Hedging policy');
  if (hedgePolicy) next.hedgePolicy = hedgePolicy;

  const row = (label: string) => {
    const m = md.match(new RegExp(`^\\|\\s*${label}\\s*\\|\\s*([\\d.]+)%`, 'm'));
    return m ? parseFloat(m[1]) : null;
  };
  const equity = row('Equity');
  if (equity !== null) next.equityTarget = equity;
  const debt = row('Debt');
  if (debt !== null) next.debtTarget = debt;
  const gold = row('Gold');
  if (gold !== null) next.goldTarget = gold;
  const realestate = row('Real Estate');
  if (realestate !== null) next.realestateTarget = realestate;
  const liquid = row('Liquid');
  if (liquid !== null) next.liquidTarget = liquid;
  const other = row('Other');
  if (other !== null) next.otherTarget = other;

  const notesMatch = md.match(/##\s*Special Notes\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (notesMatch) {
    const notes = notesMatch[1].trim();
    next.notes = notes === 'None.' ? '' : notes;
  }

  return next;
}
