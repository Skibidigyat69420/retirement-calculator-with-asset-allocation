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
    <Card className="p-6 border border-border/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-ink-soft" />
            <h3 className="text-xl font-bold text-ink tracking-tight">
              Crisis & Macro Stress Testing Simulator
            </h3>
            <Badge variant="gold" className="text-[10px] tracking-wider uppercase font-semibold">
              Live Shock Engine
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Simulate historical tail-risk panics or custom stagflation shocks against your actual portfolio.
          </p>
        </div>

        {/* Preset switcher pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-sunken/90 rounded-xl">
          {CRISIS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isCustom && selectedPresetId === preset.id
                  ? 'bg-deep text-deep shadow-xs'
                  : 'text-ink-soft hover:text-ink hover:bg-sunken/60'
              }`}
            >
              {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              isCustom
                ? 'bg-info text-deep shadow-xs'
                : 'text-ink-soft hover:text-ink hover:bg-sunken/60'
            }`}
          >
            <Sliders size={13} />
            Custom
          </button>
        </div>
      </div>

      {/* Scenario Meta Summary */}
      <div className="p-4 rounded-xl bg-surface border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-ink">{activeScenario.name}</span>
            <span className="text-xs text-muted font-mono bg-raised px-2 py-0.5 rounded border border-border">
              {activeScenario.historicalPeriod}
            </span>
          </div>
          <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">
            {activeScenario.shortDescription} {activeScenario.narrative}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted block">
              Resilience Score
            </span>
            <span
              className={`text-2xl font-bold font-mono ${
                result.resilienceScore >= 75
                  ? 'text-accent-strong'
                  : result.resilienceScore >= 50
                    ? 'text-ink-soft'
                    : 'text-negative'
              }`}
            >
              {result.resilienceScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Custom Controls (only when Custom mode active) */}
      {isCustom && (
        <div className="p-4 rounded-xl border border-info-soft bg-info-soft/40 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Sliders size={14} className="text-info" />
              Adjust Shock Magnitude & Inflation Delta
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCustom}
              className="text-[11px] h-7 px-2.5 gap-1 text-ink-soft"
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
        <div className="p-4 rounded-xl border border-border bg-raised space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Shocked Portfolio Value
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-ink">
              {formatCurrencyCompact(result.shockedNetWorth)}
            </span>
            <span className="text-xs text-muted line-through">
              {formatCurrencyCompact(result.baselineNetWorth)}
            </span>
          </div>
          <p className="text-[11px] text-muted">Immediate portfolio liquidation value</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-raised space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Crisis Drawdown
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-bold font-mono flex items-center gap-0.5 ${
                result.drawdownPercent < 0 ? 'text-negative' : 'text-accent-strong'
              }`}
            >
              {result.drawdownPercent < 0 ? <TrendingDown size={18} /> : <ArrowUpRight size={18} />}
              {formatPercent(result.drawdownPercent)}
            </span>
            <span className="text-xs text-ink-soft font-mono">
              ({formatCurrencyCompact(result.drawdownAmount)})
            </span>
          </div>
          <p className="text-[11px] text-muted">Peak-to-trough net worth contraction</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-raised space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Retirement Corpus at Age {inputs.retirementAge}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-ink">
              {formatCurrencyCompact(result.shockedCorpusAtRetirement)}
            </span>
            <span className="text-xs text-muted line-through">
              {formatCurrencyCompact(result.baselineCorpusAtRetirement)}
            </span>
          </div>
          <p className="text-[11px] text-muted">
            Impact: {result.corpusDelta < 0 ? '-' : '+'}
            {formatCurrencyCompact(Math.abs(result.corpusDelta))}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-raised space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Longevity Verdict
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {result.shockedSustainable ? (
              <>
                <CheckCircle2 size={18} className="text-accent-strong" />
                <span className="text-sm font-bold text-accent-strong">Survives to Age {inputs.lifeExpectancy}</span>
              </>
            ) : (
              <>
                <AlertTriangle size={18} className="text-negative" />
                <span className="text-sm font-bold text-negative">
                  Depletes at Age {result.shockedDepletionAge || 'Earlier'}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted">
            {result.shockedSustainable
              ? 'Multi-asset buffer insulates distributions'
              : 'Withdrawals need active defensive adjustments'}
          </p>
        </div>
      </div>

      {/* Asset Class Shock Breakdown Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Asset Class Drawdown & Buffer Contribution
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-border rounded-lg overflow-hidden">
            <thead className="bg-surface text-ink-soft font-semibold border-b border-border uppercase tracking-wider">
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
                  <tr key={cat.category} className="hover:bg-surface/60">
                    <td className="p-3 font-semibold text-ink flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: ASSET_COLORS[cat.category] }}
                      />
                      {ASSET_LABELS[cat.category]}
                    </td>
                    <td className="p-3 text-right font-mono text-ink-soft">
                      {formatCurrency(cat.initialValue)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        isPositive
                          ? 'text-accent-strong'
                          : isNeutral
                            ? 'text-ink-soft'
                            : 'text-negative'
                      }`}
                    >
                      {cat.shockPercent > 0 ? `+${cat.shockPercent.toFixed(1)}` : cat.shockPercent.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-ink">
                      {formatCurrency(cat.shockedValue)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-semibold ${
                        isPositive
                          ? 'text-accent-strong'
                          : isNeutral
                            ? 'text-muted'
                            : 'text-negative'
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
      <div className="p-4 rounded-xl border border-border bg-surface/70 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
          <Award size={14} className="text-ink-soft" />
          Institutional Crisis Mitigation Playbook
        </h4>
        <ul className="space-y-1.5">
          {result.mitigationActions.map((action, idx) => (
            <li key={idx} className="text-xs text-ink-soft flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted mt-1.5 shrink-0" />
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
};
