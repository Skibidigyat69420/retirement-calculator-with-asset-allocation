import { useState, useMemo } from 'react';
import { Layers, BrainCircuit, TrendingUp, Activity } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Slider } from '../components/ui/Slider';
import {
  blackLitterman,
  riskParityAllocation,
  glidePathAllocation,
  tacticalAllocation,
} from '../lib/allocationModels';
import { ASSET_COLORS, ASSET_LABELS, GLIDE_PATH_PRESETS } from '../lib/constants';
import { formatPercent } from '../lib/formatters';
import { useCalculator } from '../context/CalculatorContext';
import type { AssetCategory, AllocationModelResult, BlackLittermanView } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

type ModelType = 'black-litterman' | 'risk-parity' | 'glide-path' | 'tactical';

export const AdvancedAllocation = () => {
  const { inputs, addAsset } = useCalculator();
  const [model, setModel] = useState<ModelType>('black-litterman');
  const [currentAge, setCurrentAge] = useState(inputs.currentAge);
  const [glidePreset, setGlidePreset] = useState<keyof typeof GLIDE_PATH_PRESETS>('moderate');
  const [views, setViews] = useState<BlackLittermanView[]>([
    { asset: 'equity', return: 0.14, confidence: 70 },
    { asset: 'debt', return: 0.07, confidence: 60 },
  ]);
  const [applied, setApplied] = useState(false);

  const marketWeights = useMemo(() => {
    const total = inputs.assets.reduce((sum, a) => sum + a.value, 0);
    if (total === 0) {
      return { equity: 0.5, debt: 0.3, gold: 0.1, realestate: 0.05, liquid: 0.05, other: 0 };
    }
    const weights: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    inputs.assets.forEach((a) => {
      weights[a.category] += a.value / total;
    });
    return weights;
  }, [inputs.assets]);

  const result: AllocationModelResult | null = useMemo(() => {
    try {
      switch (model) {
        case 'black-litterman':
          return blackLitterman(marketWeights, views);
        case 'risk-parity':
          return riskParityAllocation();
        case 'glide-path':
          return glidePathAllocation(currentAge, glidePreset);
        case 'tactical':
          return tacticalAllocation(marketWeights);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [model, marketWeights, views, currentAge, glidePreset]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return CATEGORIES.map((c) => ({
      category: ASSET_LABELS[c],
      weight: result.weights[c] * 100,
      color: ASSET_COLORS[c],
    }));
  }, [result]);

  const applyToPlan = () => {
    if (!result) return;
    CATEGORIES.forEach((c) => {
      const weight = result.weights[c];
      if (weight > 0.01) {
        addAsset({
          name: `${ASSET_LABELS[c]} (${model})`,
          value: Math.round(weight * 10000000),
          returnRate: Math.round(8 + Math.random() * 4),
          category: c,
        });
      }
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const updateView = (idx: number, patch: Partial<BlackLittermanView>) => {
    setViews((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Advanced Allocation Models"
        subtitle="Black-Litterman, risk parity, glide path, and tactical momentum overlays for institutional strategic allocation."
        badge="Quant Lab"
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'black-litterman', label: 'Black-Litterman', icon: BrainCircuit },
          { key: 'risk-parity', label: 'Risk Parity', icon: Layers },
          { key: 'glide-path', label: 'Glide Path', icon: TrendingUp },
          { key: 'tactical', label: 'Tactical', icon: Activity },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setModel(m.key as ModelType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                model === m.key
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-navy'
              }`}
            >
              <Icon size={16} /> {m.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 space-y-5">
          <h3 className="text-lg font-serif text-navy">Model Inputs</h3>

          {model === 'black-litterman' && (
            <div className="space-y-4">
              {views.map((view, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">View {idx + 1}</div>
                  <select
                    value={view.asset}
                    onChange={(e) => updateView(idx, { asset: e.target.value as AssetCategory })}
                    className="w-full px-2.5 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {ASSET_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <Slider
                    label="Expected Return"
                    value={view.return * 100}
                    onChange={(v) => updateView(idx, { return: v / 100 })}
                    suffix="%"
                  />
                  <Slider
                    label="Confidence"
                    value={view.confidence}
                    onChange={(v) => updateView(idx, { confidence: v })}
                    suffix="%"
                  />
                </div>
              ))}
            </div>
          )}

          {model === 'glide-path' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Current Age</label>
                <input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Preset</label>
                <select
                  value={glidePreset}
                  onChange={(e) => setGlidePreset(e.target.value as keyof typeof GLIDE_PATH_PRESETS)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm"
                >
                  <option value="aggressive">Aggressive</option>
                  <option value="moderate">Moderate</option>
                  <option value="conservative">Conservative</option>
                </select>
              </div>
            </div>
          )}

          {model === 'risk-parity' && (
            <p className="text-sm text-stone-500">
              Equalizes risk contribution across asset classes. No additional inputs required.
            </p>
          )}

          {model === 'tactical' && (
            <p className="text-sm text-stone-500">
              Tilts allocation based on recent momentum signals derived from your current weights.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          {result ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Expected Return</div>
                  <div className="text-lg font-serif font-bold text-navy">{formatPercent(result.expectedReturn * 100)}</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Volatility</div>
                  <div className="text-lg font-serif font-bold text-navy">{formatPercent(result.volatility * 100)}</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Sharpe</div>
                  <div className="text-lg font-serif font-bold text-navy">{result.sharpe.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Model</div>
                  <div className="text-lg font-serif font-bold text-navy capitalize">{model.replace('-', ' ')}</div>
                </div>
              </div>

              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={((value: number) => `${value.toFixed(1)}%`) as any} />
                    <Bar dataKey="weight" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {result.riskContributions && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {CATEGORIES.map((c) => (
                    <div key={c} className="flex justify-between text-sm p-2 bg-stone-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[c] }} />
                        {ASSET_LABELS[c]}
                      </span>
                      <span className="font-mono">{(result.riskContributions![c] * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={applyToPlan} className="w-full">
                {applied ? 'Applied to Master Plan' : 'Apply Weights to Master Plan'}
              </Button>
            </>
          ) : (
            <div className="text-center py-20 text-stone-400">Select a model to compute allocation.</div>
          )}
        </Card>
      </div>
    </div>
  );
};
