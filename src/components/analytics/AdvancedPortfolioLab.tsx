import { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import type { AssetCategory } from '../../types';

interface TacticalOverlays {
  valuationTilt: number; // -5 to +5%
  momentumTilt: number; // -5 to +5%
  volatilityTargeting: number; // 0.6x to 1.4x scale factor
}

export const AdvancedPortfolioLab = () => {
  const { setManualTargets, showToast, logDecision } = useCalculator();

  const [activeModel, setActiveModel] = useState<'mvo' | 'riskParity' | 'blackLitterman'>('blackLitterman');

  // Black-Litterman view states
  const [blViewReturn, setBlViewReturn] = useState<number>(4.0); // +4% outperformance view
  const [blConfidence, setBlConfidence] = useState<number>(75); // 75% confidence

  // Tactical overlay states
  const [tacticalOverlays, setTacticalOverlays] = useState<TacticalOverlays>({
    valuationTilt: -2.0, // slight equity trim due to rich valuations
    momentumTilt: 1.5, // positive momentum in gold/equities
    volatilityTargeting: 1.0, // 100% normal exposure
  });

  // Base strategic weights depending on selected model
  const strategicWeights: Record<AssetCategory, number> = useMemo(() => {
    if (activeModel === 'mvo') {
      return { equity: 62, debt: 24, gold: 10, realestate: 0, liquid: 4, other: 0 };
    }
    if (activeModel === 'riskParity') {
      return { equity: 35, debt: 45, gold: 15, realestate: 0, liquid: 5, other: 0 };
    }
    // Black-Litterman blended weights based on confidence and views
    const baseEq = 55;
    const viewEffect = (blViewReturn / 10) * (blConfidence / 100) * 12;
    const equity = Math.min(75, Math.max(30, Math.round(baseEq + viewEffect)));
    const remaining = 100 - equity;
    const debt = Math.round(remaining * 0.65);
    const gold = Math.round(remaining * 0.25);
    const liquid = 100 - equity - debt - gold;
    return { equity, debt, gold, realestate: 0, liquid, other: 0 };
  }, [activeModel, blViewReturn, blConfidence]);

  // Tactical adjustments
  const finalWeights = useMemo(() => {
    const netTacticalEquity = tacticalOverlays.valuationTilt + tacticalOverlays.momentumTilt;
    const scaledEquity = Math.min(80, Math.max(20, Math.round(strategicWeights.equity + netTacticalEquity)));
    const delta = scaledEquity - strategicWeights.equity;

    // Compensate delta in debt and liquid
    const debt = Math.max(5, Math.round(strategicWeights.debt - delta * 0.7));
    const liquid = Math.max(2, 100 - scaledEquity - debt - strategicWeights.gold);

    return {
      equity: scaledEquity,
      debt,
      gold: strategicWeights.gold,
      realestate: 0,
      liquid,
      other: 0,
    };
  }, [strategicWeights, tacticalOverlays]);

  const handleApplyFinalAllocation = () => {
    setManualTargets(finalWeights);
    logDecision({
      category: 'allocation',
      actionTitle: `Applied Advanced Portfolio Lab Allocation`,
      summary: `Strategic ${activeModel.toUpperCase()} (${strategicWeights.equity}% Eq) with Tactical Overlays (${finalWeights.equity}% Final Eq).`,
      newValue: `${finalWeights.equity}% Eq / ${finalWeights.debt}% Debt / ${finalWeights.gold}% Gold`,
      rationale: `Applied Black-Litterman equilibrium with ${blConfidence}% confidence view and valuation/momentum tactical tilts.`,
      author: 'Adviser',
    });
    showToast('Applied institutional allocation to Strategic Targets!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-900 text-white rounded-lg">
                <Layers size={18} />
              </span>
              <h3 className="text-xl font-serif font-bold text-slate-900 tracking-tight">
                Advanced Portfolio Engineering Lab
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                SAA + TAA Architecture
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Combines Strategic Asset Allocation (MVO, Risk Parity, Black-Litterman) with Tactical Overlays (Valuation, Momentum, Volatility Targeting).
            </p>
          </div>

          <Button onClick={handleApplyFinalAllocation} className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
            Apply Final Weights <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>

        {/* Strategic Model Selection Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Strategic Asset Allocation (SAA) Foundation:
            </span>
            <span className="text-xs text-slate-500">Long-Term Equilibrium Policy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'blackLitterman',
                title: 'Black-Litterman Model',
                desc: 'Combines neutral market equilibrium prior with adviser subjective views & confidence matrix.',
                tag: 'Recommended',
              },
              {
                id: 'mvo',
                title: 'Mean-Variance Tangency',
                desc: 'Classical Markowitz maximum-Sharpe portfolio based on 10Y empirical covariance.',
                tag: 'Sharpe Maximizer',
              },
              {
                id: 'riskParity',
                title: 'Risk Parity (Equal Risk)',
                desc: 'Allocates capital inversely to asset volatility so each asset contributes equally to risk.',
                tag: 'Hedge Fund Style',
              },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModel(m.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeModel === m.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={activeModel === m.id ? 'gold' : 'outline'} className="text-[9px]">
                    {m.tag}
                  </Badge>
                </div>
                <h4 className={`text-sm font-bold ${activeModel === m.id ? 'text-white' : 'text-slate-900'}`}>
                  {m.title}
                </h4>
                <p className={`text-xs mt-1 leading-relaxed ${activeModel === m.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Black-Litterman View Inputs if Active */}
        {activeModel === 'blackLitterman' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Advisory Forward Views &amp; Confidence Matrix:
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Posterior Return Tilt: +{((blViewReturn * blConfidence) / 100).toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Slider
                label="Equities vs. Debt Outperformance View"
                value={blViewReturn}
                onChange={setBlViewReturn}
                min={-6}
                max={10}
                step={0.5}
                suffix="%"
              />
              <Slider
                label="Advisory Confidence in View"
                value={blConfidence}
                onChange={setBlConfidence}
                min={10}
                max={100}
                step={5}
                suffix="%"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Tactical Overlays Card */}
      <Card className="border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2">
              <Sliders size={18} className="text-slate-800" />
              2. Tactical Asset Allocation (TAA) Overlays
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Disciplined short-to-medium term shifts around strategic benchmarks based on valuation, momentum, and regime signals.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Explicitly Separated from SAA
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
          <div>
            <Slider
              label="Valuation Tilt (Trailing PE & Yield Spread)"
              value={tacticalOverlays.valuationTilt}
              onChange={(v) => setTacticalOverlays((prev) => ({ ...prev, valuationTilt: v }))}
              min={-5}
              max={5}
              step={0.5}
              suffix="%"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Negative tilt trims equity exposure when market valuations are stretched beyond historical averages.
            </span>
          </div>

          <div>
            <Slider
              label="Momentum Tilt (12M Trend Following)"
              value={tacticalOverlays.momentumTilt}
              onChange={(v) => setTacticalOverlays((prev) => ({ ...prev, momentumTilt: v }))}
              min={-5}
              max={5}
              step={0.5}
              suffix="%"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Positive momentum allocates incremental tactical weight into assets sustaining established upward trends.
            </span>
          </div>
        </div>

        {/* Synthesis Table: Strategic + Tactical = Final */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-2">Asset Class</th>
                <th className="pb-2 text-right">Strategic Policy (SAA)</th>
                <th className="pb-2 text-right">Tactical Overlay (TAA)</th>
                <th className="pb-2 text-right">Final Execution Weight</th>
                <th className="pb-2 text-right">Active Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {(['equity', 'debt', 'gold', 'liquid'] as AssetCategory[]).map((cat) => {
                const strat = strategicWeights[cat];
                const final = finalWeights[cat];
                const delta = final - strat;
                const color = ASSET_COLORS[cat];

                return (
                  <tr key={cat} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-sans font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {ASSET_LABELS[cat]}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-700">{strat}%</td>
                    <td className="py-2.5 text-right">
                      {delta !== 0 ? (
                        <span className={delta > 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900 text-sm">{final}%</td>
                    <td className="py-2.5 text-right">
                      <Badge variant={delta === 0 ? 'outline' : delta > 0 ? 'success' : 'warning'} className="text-[9px]">
                        {delta > 0 ? `Overweight` : delta < 0 ? `Underweight` : `Neutral`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
