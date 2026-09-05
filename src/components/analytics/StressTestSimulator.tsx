import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Award,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useCalculator } from '../../context/CalculatorContext';
import {
  CRISIS_PRESETS,
  runStressTest,
  type CrisisScenario,
  type StressTestImpact,
} from '../../lib/stressTest';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';

export const StressTestSimulator = () => {
  const { inputs } = useCalculator();

  const [selectedPresetId, setSelectedPresetId] = useState<string>('gfc-2008');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Custom scenario sliders
  const [customEquity, setCustomEquity] = useState<number>(-40);
  const [customDebt, setCustomDebt] = useState<number>(5);
  const [customGold, setCustomGold] = useState<number>(20);
  const [customRealEstate, setCustomRealEstate] = useState<number>(-15);
  const [customLiquid, setCustomLiquid] = useState<number>(0);
  const [customInflation, setCustomInflation] = useState<number>(2);

  const activeScenario: CrisisScenario = useMemo(() => {
    if (isCustom) {
      return {
        id: 'custom',
        name: 'Custom Macroeconomic Stress',
        shortDescription: 'Bespoke simulated multi-asset shock with user-defined variables.',
        historicalPeriod: 'Hypothetical Forward Shock',
        equityShock: customEquity / 100,
        debtShock: customDebt / 100,
        goldShock: customGold / 100,
        realEstateShock: customRealEstate / 100,
        liquidShock: customLiquid / 100,
        otherShock: -0.2,
        inflationDelta: customInflation,
        narrative: 'Custom stress shock parameters evaluated against portfolio asset structure.',
      };
    }
    return CRISIS_PRESETS.find((p) => p.id === selectedPresetId) || CRISIS_PRESETS[0];
  }, [
    isCustom,
    selectedPresetId,
    customEquity,
    customDebt,
    customGold,
    customRealEstate,
    customLiquid,
    customInflation,
  ]);

  const result: StressTestImpact = useMemo(() => {
    return runStressTest(inputs, activeScenario);
  }, [inputs, activeScenario]);

  const handleSelectPreset = (presetId: string) => {
    setIsCustom(false);
    setSelectedPresetId(presetId);
  };

  const handleResetCustom = () => {
    setCustomEquity(-40);
    setCustomDebt(5);
    setCustomGold(20);
    setCustomRealEstate(-15);
    setCustomLiquid(0);
    setCustomInflation(2);
  };

  return (
    <Card className="p-6 border border-zinc-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-zinc-600" />
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
              Crisis & Macro Stress Testing Simulator
            </h3>
            <Badge variant="gold" className="text-[10px] tracking-wider uppercase font-semibold">
              Live Shock Engine
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Simulate historical tail-risk panics or custom stagflation shocks against your actual portfolio.
          </p>
        </div>

        {/* Preset switcher pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100/90 rounded-xl">
          {CRISIS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isCustom && selectedPresetId === preset.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              }`}
            >
              {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isCustom
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
          >
            <Sliders size={13} />
            Custom
          </button>
        </div>
      </div>

      {/* Scenario Meta Summary */}
      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-zinc-900">{activeScenario.name}</span>
            <span className="text-xs text-zinc-500 font-mono bg-white px-2 py-0.5 rounded border border-zinc-200">
              {activeScenario.historicalPeriod}
            </span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl">
            {activeScenario.shortDescription} {activeScenario.narrative}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 block">
              Resilience Score
            </span>
            <span
              className={`text-2xl font-bold font-mono ${
                result.resilienceScore >= 75
                  ? 'text-emerald-700'
                  : result.resilienceScore >= 50
                    ? 'text-zinc-700'
                    : 'text-rose-700'
              }`}
            >
              {result.resilienceScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Custom Controls (only when Custom mode active) */}
      {isCustom && (
        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Sliders size={14} className="text-indigo-600" />
              Adjust Shock Magnitude & Inflation Delta
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCustom}
              className="text-[11px] h-7 px-2.5 gap-1 text-zinc-600"
            >
              <RotateCcw size={12} />
              Reset Sliders
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Slider label="Equity Shock" min={-70} max={40} step={5} value={customEquity} onChange={setCustomEquity} />
            <Slider label="Debt / Bond Shock" min={-30} max={30} step={2} value={customDebt} onChange={setCustomDebt} />
            <Slider label="Gold / Commodity Shock" min={-30} max={60} step={5} value={customGold} onChange={setCustomGold} />
            <Slider label="Real Estate Shock" min={-40} max={30} step={5} value={customRealEstate} onChange={setCustomRealEstate} />
            <Slider label="Liquid / Cash Shock" min={-10} max={10} step={1} value={customLiquid} onChange={setCustomLiquid} />
            <Slider label="Inflation Delta" min={-2} max={6} step={0.5} value={customInflation} onChange={setCustomInflation} />
          </div>
        </div>
      )}

      {/* Topline Stress KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Shocked Portfolio Value
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900">
              {formatCurrencyCompact(result.shockedNetWorth)}
            </span>
            <span className="text-xs text-zinc-500 line-through">
              {formatCurrencyCompact(result.baselineNetWorth)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Immediate portfolio liquidation value</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Crisis Drawdown
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-bold font-mono flex items-center gap-0.5 ${
                result.drawdownPercent < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {result.drawdownPercent < 0 ? <TrendingDown size={18} /> : <ArrowUpRight size={18} />}
              {formatPercent(result.drawdownPercent)}
            </span>
            <span className="text-xs text-zinc-600 font-mono">
              ({formatCurrencyCompact(result.drawdownAmount)})
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">Peak-to-trough net worth contraction</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Retirement Corpus at Age {inputs.retirementAge}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-900">
              {formatCurrencyCompact(result.shockedCorpusAtRetirement)}
            </span>
            <span className="text-xs text-zinc-500 line-through">
              {formatCurrencyCompact(result.baselineCorpusAtRetirement)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Impact: {result.corpusDelta < 0 ? '-' : '+'}
            {formatCurrencyCompact(Math.abs(result.corpusDelta))}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Longevity Verdict
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {result.shockedSustainable ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Survives to Age {inputs.lifeExpectancy}</span>
              </>
            ) : (
              <>
                <AlertTriangle size={18} className="text-rose-600" />
                <span className="text-sm font-bold text-rose-800">
                  Depletes at Age {result.shockedDepletionAge || 'Earlier'}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            {result.shockedSustainable
              ? 'Multi-asset buffer insulates distributions'
              : 'Withdrawals need active defensive adjustments'}
          </p>
        </div>
      </div>

      {/* Asset Class Shock Breakdown Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Asset Class Drawdown & Buffer Contribution
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-zinc-200 rounded-lg overflow-hidden">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider">
              <tr>
                <th className="p-3">Asset Category</th>
                <th className="p-3 text-right">Pre-Shock Value</th>
                <th className="p-3 text-right">Shock Rate</th>
                <th className="p-3 text-right">Post-Shock Value</th>
                <th className="p-3 text-right">Net Dollar Impact</th>
                <th className="p-3 text-center">Portfolio Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.categoryImpacts.map((cat) => {
                if (cat.initialValue <= 0) return null;
                const isPositive = cat.delta > 0;
                const isNeutral = cat.delta === 0;

                return (
                  <tr key={cat.category} className="hover:bg-zinc-50/60">
                    <td className="p-3 font-semibold text-zinc-800 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: ASSET_COLORS[cat.category] }}
                      />
                      {ASSET_LABELS[cat.category]}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-600">
                      {formatCurrency(cat.initialValue)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        isPositive
                          ? 'text-emerald-600'
                          : isNeutral
                            ? 'text-zinc-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {cat.shockPercent > 0 ? `+${cat.shockPercent.toFixed(1)}` : cat.shockPercent.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-zinc-900">
                      {formatCurrency(cat.shockedValue)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-semibold ${
                        isPositive
                          ? 'text-emerald-600'
                          : isNeutral
                            ? 'text-zinc-500'
                            : 'text-rose-600'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(cat.delta)}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          isPositive ? 'success' : isNeutral ? 'default' : 'danger'
                        }
                        className="text-[10px]"
                      >
                        {isPositive
                          ? 'Shock Absorber'
                          : isNeutral
                            ? 'Neutral Cash'
                            : 'Drawdown Driver'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Action Plan */}
      <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
          <Award size={14} className="text-zinc-600" />
          Institutional Crisis Mitigation Playbook
        </h4>
        <ul className="space-y-1.5">
          {result.mitigationActions.map((action, idx) => (
            <li key={idx} className="text-xs text-zinc-700 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
