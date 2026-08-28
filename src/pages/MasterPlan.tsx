import { Plus, Trash2, Activity, Building2, Landmark, PieChart, Wallet } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { Slider } from '../components/ui/Slider';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { AssetEvolutionChart } from '../components/charts/AssetEvolutionChart';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { DonutChart } from '../components/charts/DonutChart';
import { ASSET_COLORS } from '../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../lib/formatters';
import type { AssetCategory } from '../types';

const categoryOptions: { value: AssetCategory; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'gold', label: 'Gold' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'other', label: 'Other' },
];

const strategyOptions = [
  { value: 'true', label: 'Liquidate to SWP Corpus' },
  { value: 'false', label: 'Retain & Let Grow' },
];

export const MasterPlan = () => {
  const {
    inputs,
    updateInputs,
    updateAsset,
    addAsset,
    removeAsset,
    updateSIP,
    updateSTP,
    updateSWP,
    result,
  } = useCalculator();

  const accData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      nominal: s.nominal,
      real: s.real,
    }));

  const assetEvolutionData = result.snapshots
    .filter((s) => s.phase === 'accumulation')
    .map((s) => ({
      label: `Y${s.year}`,
      equity: s.equity,
      debt: s.debt,
      gold: s.gold,
      realestate: s.realEstate,
      liquid: s.liquid,
      other: s.other,
    }));

  const swpData = result.snapshots
    .filter((s) => s.phase === 'distribution')
    .map((s) => ({
      label: `Age ${s.age}`,
      corpus: s.corpusLeft || 0,
    }));

  const terminalAllocation = result.snapshots[result.snapshots.length - 1];
  const allocationData = [
    { name: 'Equity', value: terminalAllocation.equity, color: ASSET_COLORS.equity },
    { name: 'Debt', value: terminalAllocation.debt, color: ASSET_COLORS.debt },
    { name: 'Gold', value: terminalAllocation.gold, color: ASSET_COLORS.gold },
    { name: 'Real Estate', value: terminalAllocation.realEstate, color: ASSET_COLORS.realestate },
    { name: 'Liquid', value: terminalAllocation.liquid, color: ASSET_COLORS.liquid },
    { name: 'Other', value: terminalAllocation.other, color: ASSET_COLORS.other },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Master Plan"
        subtitle="A unified timeline that ties your existing assets, STP deployment, SIP accumulation, and inflation-indexed SWP into one model."
        badge="Core Engine"
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Inputs Sidebar */}
        <div className="xl:col-span-4 space-y-5">
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Activity size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">Structural Mechanics</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Current Age" value={inputs.currentAge} onChange={(v) => updateInputs({ currentAge: v })} />
              <NumberInput label="Retirement Age" value={inputs.retirementAge} onChange={(v) => updateInputs({ retirementAge: v })} />
              <NumberInput label="Life Expectancy" value={inputs.lifeExpectancy} onChange={(v) => updateInputs({ lifeExpectancy: v })} />
              <NumberInput label="Inflation" value={inputs.inflation} onChange={(v) => updateInputs({ inflation: v })} suffix="%" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Building2 size={18} className="text-gold" />
                <h3 className="text-lg font-serif text-navy">Existing Assets</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => addAsset()}>
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {inputs.assets.map((asset) => (
                <div key={asset.id} className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex justify-between items-start mb-2">
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, { name: e.currentTarget.value })}
                      className="bg-transparent text-sm font-semibold text-navy focus:outline-none w-2/3"
                    />
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput
                      label="Value"
                      value={asset.value}
                      onChange={(v) => updateAsset(asset.id, { value: v })}
                    />
                    <NumberInput
                      label="Return"
                      value={asset.returnRate}
                      onChange={(v) => updateAsset(asset.id, { returnRate: v })}
                      suffix="%"
                    />
                    <Select
                      label="Category"
                      value={asset.category}
                      onChange={(v) => updateAsset(asset.id, { category: v as AssetCategory })}
                      options={categoryOptions}
                    />
                    <Select
                      label="At Retirement"
                      value={asset.liquidateAtRetirement ? 'true' : 'false'}
                      onChange={(v) => updateAsset(asset.id, { liquidateAtRetirement: v === 'true' })}
                      options={strategyOptions}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <PieChart size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">SIP Injection</h3>
            </div>
            <div className="space-y-4">
              <NumberInput label="Monthly SIP" value={inputs.sip.amount} onChange={(v) => updateSIP({ amount: v })} />
              <Slider label="Equity Split" value={inputs.sip.equitySplit} onChange={(v) => updateSIP({ equitySplit: v, debtSplit: 100 - v })} />
              <Slider label="Debt Split" value={inputs.sip.debtSplit} onChange={(v) => updateSIP({ debtSplit: v, equitySplit: 100 - v })} />
              <NumberInput label="Annual Step-up" value={inputs.sip.stepUp} onChange={(v) => updateSIP({ stepUp: v })} suffix="%" />
              <div className="grid grid-cols-2 gap-3">
                <NumberInput label="Equity Return" value={inputs.sip.equityReturn} onChange={(v) => updateSIP({ equityReturn: v })} suffix="%" />
                <NumberInput label="Debt Return" value={inputs.sip.debtReturn} onChange={(v) => updateSIP({ debtReturn: v })} suffix="%" />
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-navy">
            <div className="flex items-center space-x-2 mb-4">
              <Landmark size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">STP Deployment</h3>
            </div>
            <label className="flex items-center space-x-2 text-sm text-navy mb-4">
              <input
                type="checkbox"
                checked={inputs.stp.active}
                onChange={(e) => updateSTP({ active: e.currentTarget.checked })}
                className="accent-navy w-4 h-4"
              />
              <span>Activate Systematic Transfer Plan</span>
            </label>
            {inputs.stp.active && (
              <div className="space-y-4">
                <NumberInput label="STP Lumpsum" value={inputs.stp.lumpsum} onChange={(v) => updateSTP({ lumpsum: v })} />
                <NumberInput label="Monthly Transfer" value={inputs.stp.monthlyTransfer} onChange={(v) => updateSTP({ monthlyTransfer: v })} />
                <NumberInput label="Liquid Return" value={inputs.stp.liquidReturn} onChange={(v) => updateSTP({ liquidReturn: v })} suffix="%" />
                <NumberInput label="Liquid Cap" value={inputs.stp.liquidCap} onChange={(v) => updateSTP({ liquidCap: v })} />
                <Slider label="Equity Split" value={inputs.stp.equitySplit} onChange={(v) => updateSTP({ equitySplit: v, debtSplit: 100 - v })} />
                <Slider label="Debt Split" value={inputs.stp.debtSplit} onChange={(v) => updateSTP({ debtSplit: v, equitySplit: 100 - v })} />
              </div>
            )}
          </Card>

          <Card className="border-l-4 border-l-gold">
            <div className="flex items-center space-x-2 mb-4">
              <Wallet size={18} className="text-gold" />
              <h3 className="text-lg font-serif text-navy">Distribution (SWP)</h3>
            </div>
            <div className="space-y-4">
              <NumberInput
                label="Target Monthly Income (Today's ₹)"
                value={inputs.swp.monthlyNeedToday}
                onChange={(v) => updateSWP({ monthlyNeedToday: v })}
              />
              <NumberInput label="Post-Retirement Return" value={inputs.swp.postRetirementReturn} onChange={(v) => updateSWP({ postRetirementReturn: v })} suffix="%" />
              <NumberInput label="SWP Tax Rate" value={inputs.swp.taxRate} onChange={(v) => updateSWP({ taxRate: v })} suffix="%" />
            </div>
          </Card>
        </div>

        {/* Outputs */}
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Liquid SWP Corpus (Nominal)"
              value={formatCurrency(result.terminalCorpusNominal)}
              subtext={`At Age ${inputs.retirementAge}`}
              variant="navy"
            />
            <MetricCard
              label="Liquid SWP Corpus (Real)"
              value={formatCurrency(result.terminalCorpusReal)}
              subtext="Inflation-adjusted"
              variant="gold"
            />
            <MetricCard
              label="Depletion Age"
              value={result.sustainable ? 'Sustainable' : `${result.depletionAge}`}
              subtext={result.sustainable ? 'Outlasts life expectancy' : 'Corpus runs out early'}
              variant={result.sustainable ? 'success' : 'danger'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="CAGR Nominal" value={formatPercent(result.cagrNominal)} subtext="Annual portfolio growth" />
            <MetricCard label="CAGR Real" value={formatPercent(result.cagrReal)} subtext="After inflation" />
            <MetricCard
              label="Monthly Need at Retirement"
              value={formatCurrency(result.monthlyNeedAtRetirement)}
              subtext={`Inflated from ${formatCurrency(inputs.swp.monthlyNeedToday)} today`}
            />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-6">Accumulation Trajectory (Nominal vs Real)</h3>
            <NominalRealChart data={accData} xKey="label" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-6">Asset Class Evolution</h3>
            <AssetEvolutionChart data={assetEvolutionData} xKey="label" />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">SWP Drawdown</h3>
              <SWPDrawdownChart data={swpData} xKey="label" />
            </Card>
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Terminal Allocation</h3>
              <DonutChart data={allocationData} />
            </Card>
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Year-by-Year Projection</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Age</th>
                    <th className="py-2 pr-4">Phase</th>
                    <th className="py-2 pr-4 text-right">Nominal</th>
                    <th className="py-2 pr-4 text-right">Real</th>
                    <th className="py-2 pr-4 text-right">Monthly Need</th>
                    <th className="py-2 pr-4 text-right">Corpus Left</th>
                  </tr>
                </thead>
                <tbody>
                  {result.snapshots.map((s) => (
                    <tr key={s.year} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-2 pr-4">Y{s.year}</td>
                      <td className="py-2 pr-4">{s.age}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={s.phase === 'accumulation' ? 'navy' : 'gold'}>
                          {s.phase === 'accumulation' ? 'Accumulation' : 'Distribution'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">{formatCurrencyCompact(s.nominal)}</td>
                      <td className="py-2 pr-4 text-right text-stone-500">{formatCurrencyCompact(s.real)}</td>
                      <td className="py-2 pr-4 text-right">{s.monthlyNeed ? formatCurrencyCompact(s.monthlyNeed) : '-'}</td>
                      <td className="py-2 pr-4 text-right">{s.corpusLeft !== undefined ? formatCurrencyCompact(s.corpusLeft) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
